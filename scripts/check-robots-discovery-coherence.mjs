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

import { readFileSync } from 'node:fs';
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
  const classes = [
    { agent: 'GPTBot', purpose: 'training', allowPublic: false },
    { agent: 'OAI-SearchBot', purpose: 'search', allowPublic: true },
    { agent: 'ChatGPT-User', purpose: 'userRequestedRetrieval', allowPublic: true },
  ];
  const publicPaths = ['/', '/agents.json', '/.well-known/llms.txt', '/api/news-desk-claims.ndjson'];
  const privatePaths = ['/vault-member/', '/investor/', '/studio-hub/', '/ignis-health/', '/.claude/'];
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
    const manifestPolicy = agentsManifest?.policies?.agentAccess?.[cls.purpose];
    if (!manifestPolicy || manifestPolicy.agent !== cls.agent || manifestPolicy.allowed !== cls.allowPublic) {
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

function selfTest() {
  const base = {
    robotsTxt: [
      'User-agent: GPTBot', 'Disallow: /',
      'User-agent: OAI-SearchBot', 'Allow: /', 'Disallow: /vault-member/', 'Disallow: /investor/', 'Disallow: /studio-hub/', 'Disallow: /ignis-health/', 'Disallow: /.claude/', 'Allow: /.well-known/llms.txt', 'Disallow: /.well-known/',
      'User-agent: ChatGPT-User', 'Allow: /', 'Disallow: /vault-member/', 'Disallow: /investor/', 'Disallow: /studio-hub/', 'Disallow: /ignis-health/', 'Disallow: /.claude/', 'Allow: /.well-known/llms.txt', 'Disallow: /.well-known/',
      'User-agent: Googlebot', 'Allow: /',
      'User-agent: *', 'Allow: /',
      'Allow: /.well-known/llms.txt',
      'Disallow: /.well-known/',
      'Disallow: /studio-hub/',
    ].join('\n'),
    agentsManifest: {
      discovery: { llmsTxt: `${SITE}/.well-known/llms.txt` },
      policies: { agentAccess: {
        training: { agent: 'GPTBot', allowed: false },
        search: { agent: 'OAI-SearchBot', allowed: true },
        userRequestedRetrieval: { agent: 'ChatGPT-User', allowed: true },
      } },
    },
    llmsTxt: 'index only, no refs',
    sitemapXml: `<urlset><url><loc>${SITE}/games/</loc></url></urlset>`,
  };
  const cases = [
    ['clean config passes', base, 0],
    ['blocked discovery URL flips red', {
      ...base,
      agentsManifest: { discovery: { entityGraph: `${SITE}/.well-known/entity-graph.json` } },
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
    ['manifest purpose policy must match robots', {
      ...base,
      agentsManifest: { ...base.agentsManifest, policies: { agentAccess: { ...base.agentsManifest.policies.agentAccess, training: { agent: 'GPTBot', allowed: true } } } },
    }, 1],
  ];
  let failed = 0;
  for (const [name, input, expectErrors] of cases) {
    const errs = validateCoherence(input);
    const ok = expectErrors === 0 ? errs.length === 0 : errs.length > 0;
    console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(errs)}`}`);
    if (!ok) failed++;
  }
  if (failed) { console.error(`⛔ self-test: ${failed} case(s) failed`); process.exit(1); }
  console.log(`✓ self-test: ${cases.length}/${cases.length}`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const errors = validateCoherence({
    robotsTxt: readFileSync(resolve(ROOT, 'robots.txt'), 'utf8'),
    agentsManifest: JSON.parse(readFileSync(resolve(ROOT, 'agents.json'), 'utf8')),
    llmsTxt: readFileSync(resolve(ROOT, '.well-known', 'llms.txt'), 'utf8'),
    sitemapXml: readFileSync(resolve(ROOT, 'sitemap.xml'), 'utf8'),
  });
  if (errors.length) {
    for (const e of errors) console.error(`⛔ ${e}`);
    process.exit(1);
  }
  console.log('✓ robots ↔ discovery/sitemap coherent (star-group REP longest-match)');
}

main();
