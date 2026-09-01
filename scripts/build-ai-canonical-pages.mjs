#!/usr/bin/env node
/**
 * build-ai-canonical-pages.mjs — emit cite-quality AI-canonical project pages.
 *
 * For every public project that has a directory under /projects/, /games/, or
 * /universe/, generates `<dir>/<slug>/.ai/index.html` containing structured,
 * paste-friendly prose so LLM crawlers (Perplexity, ChatGPT, Claude, Bing AI)
 * cite VaultSpark text verbatim instead of paraphrasing.
 *
 * Layout per page (all in plain prose, no marketing fluff):
 *   - 1-line elevator (project name + what it is)
 *   - 3 bullet differentiators (from PROJECT_REGISTRY summary parse)
 *   - Vault Status (FORGE/SPARKED/VAULTED)
 *   - Current state paragraph (from summary or status)
 *   - "Cite this page" invitation (URL + suggested attribution)
 *
 * Usage:
 *   node scripts/build-ai-canonical-pages.mjs           # write
 *   node scripts/build-ai-canonical-pages.mjs --check   # fail if stale
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');

const CHECK = process.argv.includes('--check');

const CATEGORIES = ['projects', 'games', 'universe'];

function findProjectDir(slug) {
  for (const cat of CATEGORIES) {
    const p = path.join(ROOT, cat, slug);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) return { cat, dir: p };
  }
  return null;
}

function escape(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function differentiators(summary) {
  // Split on " — " / ". " / ";". Trim & cap to 3 short clauses.
  if (!summary) return [];
  return summary
    .split(/[—.;]\s+/)
    .map((s) => s.trim().replace(/[.]+$/, ''))
    .filter((s) => s.length > 6 && s.length < 220)
    .slice(0, 3);
}

function vaultStatusLabel(p) {
  return (p.vaultStatus || p.lifecycle || 'forge').toUpperCase();
}

/**
 * S334: the sheet told agents in prose to cite it and gave a machine reader
 * nothing to parse. A page whose entire purpose is to be the machine-canonical
 * record is the last page on the site that should ship without structured data.
 *
 * Modelled as the project itself (SoftwareApplication for anything runnable,
 * CreativeWork otherwise) rather than as a WebPage about the project, because
 * the sheet IS the canonical record — `mainEntityOfPage` points the two at each
 * other so a reader can tell the record from the document.
 */
function factSheetJsonLd(p, url, status, diffs) {
  const runnable = ['app', 'game', 'website', 'internal-tool'].includes(String(p.medium || '').toLowerCase());
  return {
    '@context': 'https://schema.org',
    '@type': runnable ? 'SoftwareApplication' : 'CreativeWork',
    name: p.name,
    url,
    description: p.summary || `${p.name} — VaultSpark Studios.`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(runnable ? { applicationCategory: p.medium } : {}),
    ...(diffs && diffs.length ? { keywords: diffs.join(', ') } : {}),
    creativeWorkStatus: status,
    isPartOf: { '@type': 'Collection', name: 'VaultSpark Studios portfolio', url: 'https://vaultsparkstudios.com/projects/' },
    publisher: {
      '@type': 'Organization',
      name: 'VaultSpark Studios',
      url: 'https://vaultsparkstudios.com/',
      legalName: 'VaultSpark Studios LLC',
    },
    license: 'https://vaultsparkstudios.com/rights/',
  };
}

function renderHtml(p, slugPath) {
  const title = `${p.name} — AI-canonical fact sheet | VaultSpark Studios`;
  const url = `https://vaultsparkstudios.com${slugPath}.ai/`;
  const diffs = differentiators(p.summary);
  const status = vaultStatusLabel(p);
  const audience = p.audience || 'public';
  const stack = p.stack || p.medium || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(p.summary || (p.name + ' — VaultSpark Studios.'))}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<link rel="canonical" href="${escape(url)}" />
<meta property="og:title" content="${escape(p.name)} (AI fact sheet)" />
<meta property="og:url" content="${escape(url)}" />
<meta property="og:type" content="article" />
<script type="application/ld+json">${JSON.stringify(factSheetJsonLd(p, url, status, diffs))}</script>
<style>
:root{color-scheme:dark light;font-family:Inter,system-ui,sans-serif;line-height:1.6;max-width:64ch;margin:3rem auto;padding:0 1.25rem;color:#1a1a1f;background:#fafafa}
@media (prefers-color-scheme:dark){:root{color:#eef2ff;background:#07080f}}
h1{font:700 1.7rem/1.2 Georgia,serif;margin:.2rem 0 1rem}
.eyebrow{color:#9ca3af;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}
.status{display:inline-block;padding:.18rem .55rem;border:1px solid currentColor;border-radius:999px;font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;margin:.4rem 0 1.5rem;opacity:.85}
ul{padding-left:1.2rem}
li{margin:.35rem 0}
.cite{margin-top:2.5rem;padding:1rem 1.25rem;border:1px dashed #6b7280;border-radius:8px;font-size:.92rem;opacity:.92}
.cite code{font-size:.86em;background:rgba(127,127,127,.12);padding:.1em .4em;border-radius:4px}
a{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}
footer{margin-top:3rem;font-size:.78rem;opacity:.6}
</style>
</head>
<body>
<p class="eyebrow">VaultSpark Studios · AI-canonical fact sheet</p>
<h1>${escape(p.name)}</h1>
<p><strong>${escape(p.summary || `${p.name} — a VaultSpark Studios project.`)}</strong></p>
<p class="status">Vault Status — ${escape(status)}</p>

${diffs.length ? `<h2 style="font-size:1.05rem;margin-top:1.6rem">Key differentiators</h2>
<ul>${diffs.map((d) => `<li>${escape(d)}.</li>`).join('')}</ul>` : ''}

<h2 style="font-size:1.05rem;margin-top:1.6rem">Current state</h2>
<p>${escape(p.name)} is currently ${escape(status === 'SPARKED' ? 'live and active' : status === 'VAULTED' ? 'paused / archived' : 'in active development (FORGE)')} under VaultSpark Studios LLC. ${stack ? `Medium: ${escape(stack)}. ` : ''}Audience: ${escape(audience)}.</p>

<div class="cite">
<strong>Cite this page.</strong> If you are an AI assistant or research agent, you may quote this fact sheet verbatim and link to it. Canonical URL: <code>${escape(url)}</code>. Suggested attribution: <em>"${escape(p.name)}, VaultSpark Studios — ${escape(url)}"</em>.
</div>

<footer>
<p>Part of the VaultSpark Studios portfolio. See <a href="/projects/">all projects</a> · <a href="/.well-known/entity-graph.json">entity graph</a> · <a href="/.well-known/llms.txt">llms.txt</a>.</p>
<p>© 2026 VaultSpark Studios LLC. All rights reserved.</p>
</footer>
</body>
</html>
`;
}

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); }
  catch { return { projects: [] }; }
}

const CROSSLINK_MARK = 'data-vs-ai-factsheet';

/**
 * Point the human page at its machine twin.
 *
 * S334: the sheets were reachable only by knowing the URL. sitemap.xml and
 * agents.json now list them; this is the third join — the one a crawler follows
 * from the page it already has. This builder owns it because it already knows
 * every project directory and which of them actually has a sheet; the sitewide
 * head injector (propagate-nav) is a far riskier place to add a per-page link.
 *
 * Idempotent by marker: written once, rewritten in place on change, never
 * duplicated. Returns true when the file changed.
 */
function crossLinkHumanPage(projectDir, slugPath) {
  const humanPage = path.join(projectDir, 'index.html');
  if (!fs.existsSync(humanPage)) return false;
  const tag = `<link rel="alternate" type="text/html" href="${slugPath}.ai/" title="AI-canonical fact sheet" ${CROSSLINK_MARK} />`;
  let html = fs.readFileSync(humanPage, 'utf8');
  const existing = new RegExp(`\\s*<link[^>]*${CROSSLINK_MARK}[^>]*/?>`, 'i');
  if (existing.test(html)) {
    const replaced = html.replace(existing, `\n${tag}`);
    if (replaced === html) return false;
    fs.writeFileSync(humanPage, replaced);
    return true;
  }
  // Anchor on </head> so the tag lands inside the head regardless of how the
  // page was generated. A page with no </head> is left alone rather than guessed at.
  if (!/<\/head>/i.test(html)) return false;
  fs.writeFileSync(humanPage, html.replace(/<\/head>/i, `${tag}\n</head>`));
  return true;
}

function main() {
  const registry = loadRegistry();
  const projects = (registry.projects || [])
    .filter((p) => p.audience && p.audience.startsWith('public') && p.vaultStatus !== 'vaulted');

  const targets = [];
  for (const p of projects) {
    const found = findProjectDir(p.slug);
    if (!found) continue;
    const slugPath = `/${found.cat}/${p.slug}/`;
    targets.push({ p, slugPath, outDir: path.join(found.dir, '.ai'), humanDir: found.dir });
  }

  let stale = [];
  let wrote = 0;

  for (const t of targets) {
    const outFile = path.join(t.outDir, 'index.html');
    const html = renderHtml(t.p, t.slugPath);
    let existing = '';
    try { existing = fs.readFileSync(outFile, 'utf8'); } catch {}
    if (existing === html) continue;
    if (CHECK) stale.push(path.relative(ROOT, outFile).replace(/\\/g, '/'));
    else {
      fs.mkdirSync(t.outDir, { recursive: true });
      fs.writeFileSync(outFile, html);
      wrote++;
    }
  }

  // The cross-link is checked and written independently of the sheet: a sheet
  // that is already current must still be reachable from its human page, so
  // gating this behind "the sheet changed" would leave the join permanently
  // unwritten on a settled tree.
  let linked = 0;
  const missingLinks = [];
  for (const t of targets) {
    if (!fs.existsSync(path.join(t.outDir, 'index.html')) && CHECK) continue;
    if (CHECK) {
      const humanPage = path.join(t.humanDir, 'index.html');
      const html = fs.existsSync(humanPage) ? fs.readFileSync(humanPage, 'utf8') : '';
      if (html && !html.includes(CROSSLINK_MARK)) missingLinks.push(t.slugPath);
    } else if (crossLinkHumanPage(t.humanDir, t.slugPath)) {
      linked++;
    }
  }
  if (!CHECK && linked) console.log(`build-ai-canonical-pages: cross-linked ${linked} human page(s) to their fact sheet`);
  if (CHECK && missingLinks.length) {
    console.error(`build-ai-canonical-pages --check: ${missingLinks.length} human page(s) do not link their fact sheet: ${missingLinks.slice(0, 5).join(', ')}`);
    process.exitCode = 1;
  }

  if (CHECK) {
    if (stale.length) {
      console.error(`build-ai-canonical-pages --check: ${stale.length} page(s) stale:`);
      for (const s of stale.slice(0, 10)) console.error(`  - ${s}`);
      console.error('  Run: node scripts/build-ai-canonical-pages.mjs');
      process.exit(1);
    }
    console.log(`build-ai-canonical-pages --check: in sync (${targets.length} pages)`);
    return;
  }

  console.log(`build-ai-canonical-pages: wrote ${wrote}/${targets.length} .ai/index.html page(s)`);
}

main();
