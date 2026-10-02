#!/usr/bin/env node
// check-robots-discovery-coherence.mjs — robots.txt ↔ discovery-surface coherence gate (S275).
//
// Two invariants, both directions of the same truth:
//   1. Every on-site URL the AI-discovery surfaces advertise (agents.json
//      discovery block + /.well-known/ references inside llms.txt) must be
//      crawlable by the `User-agent: *` group in robots.txt. S275 root bug:
//      a blanket `Disallow: /.well-known/` silently blocked the exact corpus
//      agents.json points compliant crawlers at.
//   2. No <loc> in sitemap.xml may match a `User-agent: *` Disallow rule —
//      a sitemap that advertises robots-blocked URLs is a Search Console
//      "Submitted URL blocked by robots.txt" contradiction (S275: /studio-hub/,
//      /ignis-health/).
//
// Rule evaluation uses longest-match-wins (Google REP semantics); Allow wins
// ties. Pure core + --self-test that proves the gate flips BOTH ways.
//
// Usage:
//   node scripts/check-robots-discovery-coherence.mjs
//   node scripts/check-robots-discovery-coherence.mjs --self-test

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE = 'https://vaultsparkstudios.com';

// Parse every robots group. A group may name multiple user agents before its
// first rule; named agents do not inherit `*`, so policy checks must inspect
// their effective group rather than assuming the star group protects them.
export function parseRobotsGroups(robotsTxt) {
  const groups = new Map();
  let agents = [];
  let rules = [];
  const flush = () => {
    if (!agents.length) return;
    for (const agent of agents) groups.set(agent.toLowerCase(), [...rules]);
    agents = [];
    rules = [];
  };
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const ua = line.match(/^User-agent:\s*(.+)$/i);
    if (ua) {
      if (rules.length) flush();
      agents.push(ua[1].trim());
      continue;
    }
    const m = line.match(/^(Allow|Disallow):\s*(\S*)$/i);
    if (m && m[2] && agents.length) rules.push({ type: m[1].toLowerCase(), path: m[2] });
  }
  flush();
  return groups;
}

export function rulesForAgent(groups, agent) {
  return groups.get(String(agent).toLowerCase()) || groups.get('*') || [];
}

export function parseStarGroup(robotsTxt) {
  return rulesForAgent(parseRobotsGroups(robotsTxt), '*');
}

// Longest-match-wins; Allow wins ties. Empty rule set ⇒ allowed.
export function isAllowed(rules, path) {
  let best = null;
  for (const r of rules) {
    if (!path.startsWith(r.path)) continue;
    if (!best || r.path.length > best.path.length ||
        (r.path.length === best.path.length && r.type === 'allow')) {
      best = r;
    }
  }
  return !best || best.type === 'allow';
}

export function siteUrlToRobotsPath(url) {
  if (!url || !url.startsWith(SITE)) return null; // external — out of scope
  return url.slice(SITE.length) || '/';
}

// Core validation — pure, injectable for --self-test.
export function validateCoherence({ robotsTxt, agentsManifest, llmsTxt, sitemapXml }) {
  const errors = [];
  const groups = parseRobotsGroups(robotsTxt);
  const rules = rulesForAgent(groups, '*');

  // 1. Discovery URLs must be crawlable.
  const discoveryUrls = new Set();
  for (const v of Object.values(agentsManifest.discovery || {})) {
    if (typeof v === 'string') discoveryUrls.add(v);
  }
  // llms.txt self-references into /.well-known/ (entity graph, full corpus).
  for (const m of llmsTxt.matchAll(/https?:\/\/[^\s)]+\/\.well-known\/[^\s)]+/g)) {
    discoveryUrls.add(m[0].replace(/[.,;]$/, ''));
  }
  for (const url of discoveryUrls) {
    const path = siteUrlToRobotsPath(url);
    if (path === null) continue;
    if (!isAllowed(rules, path)) {
      errors.push(`discovery URL robots-blocked for User-agent:*  → ${path} (advertised by agents.json/llms.txt)`);
    }
  }

  // Purpose-specific AI crawler policy. Search and explicit user retrieval may
  // reach the public corpus; training remains opted out. Named groups must also
  // preserve the private-route boundary because they do not inherit `*`.
  //
  // D-S368.4: Claude and Perplexity retrieval agents join the OpenAI ones. The
  // floor below is the minimum every config must name; any extra agent the
  // manifest lists under a purpose is held to the same robots contract.
  const REQUIRED = {
    training: { allowPublic: false, agents: ['GPTBot', 'ClaudeBot'] },
    search: { allowPublic: true, agents: ['OAI-SearchBot', 'Claude-SearchBot'] },
    userRequestedRetrieval: { allowPublic: true, agents: ['ChatGPT-User', 'Claude-User', 'Perplexity-User'] },
  };
  const access = agentsManifest?.policies?.agentAccess || {};
  const manifestAgents = (purpose) => {
    const p = access[purpose];
    if (!p) return [];
    return Array.isArray(p.agents) ? p.agents : (p.agent ? [p.agent] : []);
  };
  const classes = [];
  for (const [purpose, req] of Object.entries(REQUIRED)) {
    const listed = manifestAgents(purpose);
    for (const agent of new Set([...req.agents, ...listed])) classes.push({ agent, purpose, allowPublic: req.allowPublic, listed: listed.includes(agent) });
  }
  const publicPaths = ['/', '/agents.json', '/.well-known/llms.txt', '/api/news-desk-claims.ndjson'];
  // /ignis-health/ left this list in S368: it is an internal page that is no
  // longer in the served surface at all (config/served-surface.json) and
  // carries its own noindex, so a robots rule would only advertise it.
  // checkUnservedInternal() below holds that posture instead.
  const privatePaths = ['/vault-member/', '/investor/', '/studio-hub/', '/.claude/'];
  for (const cls of classes) {
    if (!groups.has(cls.agent.toLowerCase())) {
      errors.push(`${cls.agent}: named robots group missing`);
      continue;
    }
    const agentRules = rulesForAgent(groups, cls.agent);
    for (const path of publicPaths) {
      if (isAllowed(agentRules, path) !== cls.allowPublic) {
        errors.push(`${cls.agent}: ${cls.purpose} policy must ${cls.allowPublic ? 'allow' : 'disallow'} public path ${path}`);
      }
    }
    if (cls.allowPublic) {
      for (const path of privatePaths) {
        if (isAllowed(agentRules, path)) errors.push(`${cls.agent}: private path ${path} is not blocked in its named group`);
      }
    }
    const manifestPolicy = access[cls.purpose];
    if (!manifestPolicy || !cls.listed || manifestPolicy.allowed !== cls.allowPublic) {
      errors.push(`${cls.agent}: agents.json policies.agentAccess.${cls.purpose} contradicts robots.txt`);
    }
  }

  // 2. Sitemap must not advertise robots-blocked URLs.
  for (const m of sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const path = siteUrlToRobotsPath(m[1].trim());
    if (path === null) continue;
    if (!isAllowed(rules, path)) {
      errors.push(`sitemap advertises robots-blocked URL → ${path}`);
    }
  }

  return errors;
}

// Internal pages that left the served surface on purpose (never deployed) must
// stay out of every public listing and carry their own noindex — no robots rule
// is needed (one would only advertise the path). Pure: inputs are injected.
export const UNSERVED_INTERNAL = ['/ignis-health/'];
export function checkUnservedInternal({ servedSurface, pageHtml, sitemapXml, robotsTxt }) {
  const errors = [];
  for (const route of UNSERVED_INTERNAL) {
    const prefix = route.replace(/^\//, '');
    if ((servedSurface.prefixes || []).includes(prefix) || (servedSurface.exact || []).some((f) => f.startsWith(prefix))) {
      errors.push(`${route}: internal page is in config/served-surface.json — it must stay unserved`);
    }
    const html = pageHtml(route);
    if (html !== null && !/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html)) {
      errors.push(`${route}: internal page lacks a noindex robots meta`);
    }
    if (sitemapXml.includes(`${SITE}${route}`)) errors.push(`${route}: internal page is advertised in sitemap.xml`);
    const named = robotsTxt.split(/\r?\n/).some((line) => /^(?:Allow|Disallow):/i.test(line.trim()) && line.split(':').slice(1).join(':').trim() === route);
    if (named) errors.push(`${route}: robots.txt names an unserved internal path (advertises it)`);
  }
  return errors;
}

function selfTest() {
  const privateRules = ['Allow: /', 'Disallow: /vault-member/', 'Disallow: /investor/', 'Disallow: /studio-hub/', 'Disallow: /.claude/', 'Allow: /.well-known/llms.txt', 'Disallow: /.well-known/'];
  const base = {
    robotsTxt: [
      'User-agent: GPTBot', 'Disallow: /',
      'User-agent: ClaudeBot', 'Disallow: /',
      'User-agent: OAI-SearchBot', ...privateRules,
      'User-agent: ChatGPT-User', ...privateRules,
      'User-agent: Claude-SearchBot', 'User-agent: Claude-User', 'User-agent: Perplexity-User', ...privateRules,
      'User-agent: Googlebot', 'Allow: /',
      'User-agent: *', 'Allow: /',
      'Allow: /.well-known/llms.txt',
      'Disallow: /.well-known/',
      'Disallow: /studio-hub/',
    ].join('\n'),
    agentsManifest: {
      discovery: { llmsTxt: `${SITE}/.well-known/llms.txt` },
      policies: { agentAccess: {
        training: { agents: ['GPTBot', 'ClaudeBot'], allowed: false },
        search: { agents: ['OAI-SearchBot', 'Claude-SearchBot'], allowed: true },
        userRequestedRetrieval: { agents: ['ChatGPT-User', 'Claude-User', 'Perplexity-User'], allowed: true },
      } },
    },
    llmsTxt: 'index only, no refs',
    sitemapXml: `<urlset><url><loc>${SITE}/games/</loc></url></urlset>`,
  };
  const access = base.agentsManifest.policies.agentAccess;
  const withAccess = (patch) => ({ ...base, agentsManifest: { ...base.agentsManifest, policies: { agentAccess: { ...access, ...patch } } } });
  const cases = [
    ['clean config passes', base, 0],
    ['blocked discovery URL flips red', {
      ...base,
      agentsManifest: { ...base.agentsManifest, discovery: { entityGraph: `${SITE}/.well-known/entity-graph.json` } },
    }, 1],
    ['llms.txt well-known ref blocked flips red', {
      ...base,
      llmsTxt: `see ${SITE}/.well-known/llms-full.txt`,
    }, 1],
    ['sitemap advertising a Disallowed URL flips red', {
      ...base,
      sitemapXml: `<urlset><url><loc>${SITE}/studio-hub/</loc></url></urlset>`,
    }, 1],
    ['longest-match Allow beats directory Disallow', {
      ...base,
      sitemapXml: `<urlset><url><loc>${SITE}/.well-known/llms.txt</loc></url></urlset>`,
    }, 0],
    ['training/search contradiction flips red', {
      ...base,
      robotsTxt: base.robotsTxt.replace('User-agent: GPTBot\nDisallow: /', 'User-agent: GPTBot\nAllow: /'),
    }, 1],
    ['named search group must retain private boundaries', {
      ...base,
      robotsTxt: base.robotsTxt.replace('User-agent: OAI-SearchBot\nAllow: /\nDisallow: /vault-member/', 'User-agent: OAI-SearchBot\nAllow: /'),
    }, 1],
    ['manifest purpose policy must match robots', withAccess({ training: { agents: ['GPTBot', 'ClaudeBot'], allowed: true } }), 1],
    ['manifest omitting a required retrieval agent flips red', withAccess({ userRequestedRetrieval: { agents: ['ChatGPT-User'], allowed: true } }), 1],
    ['missing Claude-SearchBot robots group flips red', {
      ...base,
      robotsTxt: base.robotsTxt.replace('User-agent: Claude-SearchBot\n', ''),
    }, 1],
    ['legacy single-agent manifest shape is still read', withAccess({ training: { agent: 'GPTBot', agents: ['GPTBot', 'ClaudeBot'], allowed: false } }), 0],
  ];
  let failed = 0;
  for (const [name, input, expectErrors] of cases) {
    const errs = validateCoherence(input);
    const ok = expectErrors === 0 ? errs.length === 0 : errs.length > 0;
    console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(errs)}`}`);
    if (!ok) failed++;
  }
  const internalBase = {
    servedSurface: { exact: ['index.html'], prefixes: ['games/'] },
    pageHtml: () => '<meta name="robots" content="noindex, nofollow" />',
    sitemapXml: `<urlset><url><loc>${SITE}/games/</loc></url></urlset>`,
    robotsTxt: 'User-agent: *\nAllow: /',
  };
  const internalCases = [
    ['unserved internal page with noindex passes', internalBase, 0],
    ['internal page back in served surface flips red', { ...internalBase, servedSurface: { exact: [], prefixes: ['ignis-health/'] } }, 1],
    ['internal page without noindex flips red', { ...internalBase, pageHtml: () => '<title>x</title>' }, 1],
    ['internal page in sitemap flips red', { ...internalBase, sitemapXml: `<loc>${SITE}/ignis-health/</loc>` }, 1],
    ['robots naming the internal path flips red', { ...internalBase, robotsTxt: 'User-agent: *\nDisallow: /ignis-health/' }, 1],
  ];
  for (const [name, input, expectErrors] of internalCases) {
    const errs = checkUnservedInternal(input);
    const ok = expectErrors === 0 ? errs.length === 0 : errs.length > 0;
    console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(errs)}`}`);
    if (!ok) failed++;
  }
  const total = cases.length + internalCases.length;
  if (failed) { console.error(`⛔ self-test: ${failed} case(s) failed`); process.exit(1); }
  console.log(`✓ self-test: ${total}/${total}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const robotsTxt = readFileSync(resolve(ROOT, 'robots.txt'), 'utf8');
  const sitemapXml = readFileSync(resolve(ROOT, 'sitemap.xml'), 'utf8');
  const errors = validateCoherence({
    robotsTxt,
    agentsManifest: JSON.parse(readFileSync(resolve(ROOT, 'agents.json'), 'utf8')),
    llmsTxt: readFileSync(resolve(ROOT, '.well-known', 'llms.txt'), 'utf8'),
    sitemapXml,
  });
  errors.push(...checkUnservedInternal({
    servedSurface: JSON.parse(readFileSync(resolve(ROOT, 'config', 'served-surface.json'), 'utf8')),
    pageHtml: (route) => {
      const file = resolve(ROOT, route.replace(/^\//, ''), 'index.html');
      return existsSync(file) ? readFileSync(file, 'utf8') : null;
    },
    sitemapXml,
    robotsTxt,
  }));
  if (errors.length) {
    for (const e of errors) console.error(`⛔ ${e}`);
    process.exit(1);
  }
  console.log('✓ robots ↔ discovery/sitemap coherent (star-group REP longest-match; AI agent purposes; unserved internal pages noindexed)');
}

main();

