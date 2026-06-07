#!/usr/bin/env node
/**
 * scripts/check-placeholder-orphans.mjs
 *
 * Structural gate (S176): fail loudly when any public-facing HTML page ships
 * a literal loading-placeholder text node ("Loading…", "Loading...") inside an
 * element whose id (or first class) is referenced by NO shipped JavaScript.
 *
 * Root cause this guards against: a widget's renderer gets deleted (refactor,
 * bundle split, history sanitization) while its HTML skeleton stays behind —
 * the placeholder then renders forever. The homepage #nowPlayingBar shipped
 * "Loading…" to every visitor for 170+ sessions before S176 because nothing
 * watched for placeholder-forever states.
 *
 * Detection: an element is a live placeholder host only if some .js file
 * (assets/ + page-local) references its id or one of its classes. Shell
 * bundles are generated FROM assets/*.js sources, so scanning assets/ +
 * per-page .js covers everything that ships.
 *
 * Exit codes: 0 = clean, 1 = orphaned placeholder(s) detected
 * Flags: --self-test (fixture suite) · --list (show all placeholder hosts)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results', '.git', '.cache',
  '.ops-cache', '.github', 'docs', 'context', 'logs', 'supabase', 'config',
  'tests', 'workers', 'cloudflare', '_og', 'data', 'coverage', 'scripts',
]);

const PLACEHOLDER_RE = /Loading(?:…|\.\.\.|&hellip;|&#8230;)/;

function walk(dir, ext, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(abs, ext, out);
    } else if (entry.name.endsWith(ext)) {
      out.push(abs);
    }
  }
  return out;
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'source', 'track', 'wbr']);

function parseAttrs(attrs) {
  const id = (attrs.match(/\bid\s*=\s*["']([^"']+)["']/) || [])[1] || null;
  const classes = ((attrs.match(/\bclass\s*=\s*["']([^"']+)["']/) || [])[1] || '')
    .split(/\s+/).filter(Boolean);
  return { id, classes };
}

// Stack-based scan: track open elements so a placeholder text node can be
// attributed to its FULL ancestor chain — JS renderers typically replace a
// parent container's innerHTML, so the loading child itself is anonymous.
function findPlaceholderHosts(html) {
  const hosts = [];
  const stack = [];
  const re = /<\/?([a-zA-Z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)\/?>|Loading(?:…|\.\.\.|&hellip;|&#8230;)/g;
  for (const m of html.matchAll(re)) {
    if (m[0].startsWith('</')) {
      const tag = m[1].toLowerCase();
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
    } else if (m[0].startsWith('<')) {
      const tag = m[1].toLowerCase();
      if (tag === 'script' || tag === 'style') continue; // text inside handled separately
      if (VOID_TAGS.has(tag) || m[0].endsWith('/>')) continue;
      stack.push({ tag, ...parseAttrs(m[2] || '') });
    } else {
      // Placeholder text node — capture ancestor chain (nearest-first).
      const chain = stack.slice(-6).reverse()
        .map(({ id, classes }) => ({ id, classes }))
        .filter((a) => a.id || a.classes.length);
      hosts.push({ chain, snippet: m[0].slice(0, 80) });
    }
  }
  return hosts;
}

function buildJsCorpus() {
  const files = walk(ROOT, '.js');
  let corpus = '';
  for (const f of files) {
    try { corpus += readFileSync(f, 'utf8') + '\n'; } catch { /* unreadable */ }
  }
  return corpus;
}

function isReferenced(host, jsCorpus, html) {
  // Referenced if any JS names an id or class anywhere in the ancestor chain
  // (renderers replace a parent container's innerHTML), including the page's
  // own inline <script> blocks (page-local renderers).
  const needles = [];
  for (const a of host.chain) {
    if (a.id) needles.push(a.id);
    needles.push(...a.classes.filter((c) => !c.startsWith('vsx-')));
  }
  if (!needles.length) return false; // fully anonymous chain = unreachable
  const inlineScripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).join('\n');
  return needles.some((n) => jsCorpus.includes(n) || inlineScripts.includes(n));
}

function hostLabel(host) {
  const a = host.chain[0];
  if (!a) return '(anonymous)';
  return a.id ? `#${a.id}` : a.classes.map((c) => `.${c}`).join('') || '(anonymous)';
}

function run() {
  const jsCorpus = buildJsCorpus();
  const htmlFiles = walk(ROOT, '.html');
  const orphans = [];
  const all = [];
  for (const f of htmlFiles) {
    const html = readFileSync(f, 'utf8');
    if (!PLACEHOLDER_RE.test(html)) continue;
    for (const host of findPlaceholderHosts(html)) {
      const rel = relative(ROOT, f).replace(/\\/g, '/');
      all.push({ file: rel, host });
      if (!isReferenced(host, jsCorpus, html)) orphans.push({ file: rel, host });
    }
  }
  return { orphans, all };
}

function selfTest() {
  const cases = [
    {
      name: 'orphan: id never referenced',
      html: '<div id="deadWidget"><span id="deadText">Loading…</span></div>',
      js: 'console.log("nothing")',
      expectOrphan: true,
    },
    {
      name: 'live: id referenced in js corpus',
      html: '<div id="liveWidget">Loading…</div>',
      js: 'document.getElementById("liveWidget").textContent = "ok"',
      expectOrphan: false,
    },
    {
      name: 'live: class referenced',
      html: '<div class="pulse-feed">Loading...</div>',
      js: 'document.querySelector(".pulse-feed")',
      expectOrphan: false,
    },
    {
      name: 'orphan: only vsx utility class',
      html: '<div class="vsx-0123456789ab">Loading…</div>',
      js: '',
      expectOrphan: true,
    },
    {
      name: 'live: inline script renderer',
      html: '<div id="inlineHost">Loading…</div><script>render("inlineHost")</script>',
      js: '',
      expectOrphan: false,
    },
    {
      name: 'clean: no placeholder at all',
      html: '<div id="x">Ready</div>',
      js: '',
      expectOrphan: false,
    },
  ];
  let pass = 0;
  for (const c of cases) {
    const hosts = findPlaceholderHosts(c.html);
    const orphaned = hosts.some((h) => !isReferenced(h, c.js, c.html));
    const got = hosts.length === 0 ? false : orphaned;
    if (got === c.expectOrphan) { pass += 1; }
    else console.error(`  ✗ ${c.name} — expected orphan=${c.expectOrphan}, got ${got}`);
  }
  console.log(`check-placeholder-orphans self-test: ${pass}/${cases.length} passing`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (process.argv.includes('--self-test')) selfTest();

const { orphans, all } = run();
if (process.argv.includes('--list')) {
  for (const { file, host } of all) {
    console.log(`${file} → ${hostLabel(host)}`);
  }
}
if (orphans.length) {
  console.error(`✗ ${orphans.length} orphaned loading placeholder(s) — HTML ships "Loading…" with no JS renderer:`);
  for (const { file, host } of orphans) {
    console.error(`  ${file} → ${hostLabel(host)} · "${host.snippet}"`);
  }
  console.error('  Fix: delete the dead widget or ship its renderer. (S176 gate — see docs/AUDIT_2026-06-07.md)');
  process.exit(1);
}
console.log(`✓ no orphaned placeholders (${all.length} live placeholder host(s) verified)`);
