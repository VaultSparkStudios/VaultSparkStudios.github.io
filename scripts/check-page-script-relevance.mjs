#!/usr/bin/env node
/**
 * check-page-script-relevance.mjs — fail CI if a page loads a script outside its declared scope.
 *
 * Structural gate (S148) for audit item #8 (per-page-script-pruning). The S147
 * consolidation purge removed the leaderboard sub-shells that loaded
 * redirect-page.js on non-redirect pages; this gate keeps the surface clean
 * so a future page can't reintroduce the smell.
 *
 * Rules are a small, declarative table. Each rule names a script and the
 * predicate that says where it's allowed to load. Adding a rule is one line.
 *
 * Usage:
 *   node scripts/check-page-script-relevance.mjs           # check, fail on miss
 *   node scripts/check-page-script-relevance.mjs --report  # list every match
 *   node scripts/check-page-script-relevance.mjs --self-test
 *
 * Exits 0 clean, 1 on any violation.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = process.argv.includes('--report');
const SELF_TEST = process.argv.includes('--self-test');

const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  '.git', '.github', 'audits', 'docs', 'handoffs',
  'context', 'logs', 'data', '.cache', '.ops-cache',
  '.wrangler', '.well-known', 'cloudflare', 'config',
  'scripts', 'supabase', 'tests', 'ignis', 'api',
]);

// Each rule: { script: basename, allow: (relPath, html) => boolean, reason }
// `script` matches by filename (basename of <script src>) so cache-busted
// variants like `theme-toggle.shell-abcd.js` also match if we ever scope them.
const RULES = [
  {
    script: 'redirect-page.js',
    allow: (_rel, html) => /<meta\s+http-equiv=["']?refresh["']?/i.test(html),
    reason: 'redirect-page.js requires a <meta http-equiv="refresh"> on the same page',
  },
  {
    script: 'home-dynamic-hero.js',
    allow: (rel) => rel === 'index.html',
    reason: 'home-dynamic-hero.js is home-only (root index.html)',
  },
  {
    script: 'hero-ticker.js',
    allow: (rel) => rel === 'index.html',
    reason: 'hero-ticker.js is home-only (root index.html)',
  },
  {
    script: 'contact-page.js',
    allow: (rel) => rel === 'contact/index.html',
    reason: 'contact-page.js is scoped to /contact/',
  },
];

const RULE_BY_SCRIPT = new Map(RULES.map((r) => [r.script, r]));
const REQUIRED = [
  {
    script: 'membership-value-calculator.js',
    when: (_rel, html) => /\bdata-membership-value-calculator\b/.test(html),
    reason: 'data-membership-value-calculator requires membership-value-calculator.js on the same page',
  },
];
const SCRIPT_RE = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function walk(dir, rel = '') {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const childRel = rel ? `${rel}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full, childRel));
    } else if (st.isFile() && name.endsWith('.html')) {
      out.push({ full, rel: childRel.replace(/\\/g, '/') });
    }
  }
  return out;
}

function scriptsIn(html) {
  const srcs = [];
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(html)) !== null) {
    const src = m[1];
    const base = src.split('/').pop().split('?')[0];
    srcs.push({ src, base });
  }
  return srcs;
}

function check() {
  const pages = walk(ROOT);
  const violations = [];
  let matches = 0;

  for (const { full, rel } of pages) {
    const html = readFileSync(full, 'utf8');
    const srcs = scriptsIn(html);
    for (const { src, base } of srcs) {
      const rule = RULE_BY_SCRIPT.get(base);
      if (!rule) continue;
      matches++;
      if (REPORT) {
        console.log(`  ${rel}  ←  ${src}`);
      }
      if (!rule.allow(rel, html)) {
        violations.push({ rel, src, reason: rule.reason });
      }
    }
    for (const rule of REQUIRED) {
      if (!rule.when(rel, html)) continue;
      matches++;
      if (!srcs.some(({ base }) => base === rule.script)) {
        violations.push({ rel, src: `(missing) ${rule.script}`, reason: rule.reason });
      }
    }
  }

  if (REPORT) {
    console.log(`\n  ${pages.length} pages · ${matches} rule-script loads · ${violations.length} violation(s)`);
  }

  if (violations.length === 0) {
    if (!REPORT) console.log(`✓ check-page-script-relevance: ${pages.length} pages clean (${matches} scope-rule load(s))`);
    return 0;
  }

  console.error(`\n✘ check-page-script-relevance: ${violations.length} violation(s)\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}`);
    console.error(`    loads: ${v.src}`);
    console.error(`    reason: ${v.reason}\n`);
  }
  console.error(`Either remove the <script> tag, fix the page so it satisfies the rule,`);
  console.error(`or edit scripts/check-page-script-relevance.mjs to widen scope.`);
  return 1;
}

function selfTest() {
  const cases = [
    {
      name: 'redirect-page.js with meta-refresh → allowed',
      rel: 'old-thing/index.html',
      html: '<meta http-equiv="refresh" content="0;url=/new"><script src="/assets/redirect-page.js"></script>',
      expect: 0,
    },
    {
      name: 'redirect-page.js without meta-refresh → violation',
      rel: 'leaderboard-sub/index.html',
      html: '<html><body><script src="/assets/redirect-page.js"></script></body></html>',
      expect: 1,
    },
    {
      name: 'home-dynamic-hero.js on /index.html → allowed',
      rel: 'index.html',
      html: '<script src="/assets/home-dynamic-hero.js"></script>',
      expect: 0,
    },
    {
      name: 'home-dynamic-hero.js on /about/ → violation',
      rel: 'about/index.html',
      html: '<script src="/assets/home-dynamic-hero.js"></script>',
      expect: 1,
    },
    {
      name: 'contact-page.js on /contact/ → allowed',
      rel: 'contact/index.html',
      html: '<script src="/assets/contact-page.js"></script>',
      expect: 0,
    },
    {
      name: 'contact-page.js on home → violation',
      rel: 'index.html',
      html: '<script src="/assets/contact-page.js"></script>',
      expect: 1,
    },
    {
      name: 'unrelated script → ignored',
      rel: 'about/index.html',
      html: '<script src="/assets/analytics.js"></script>',
      expect: 0,
    },
    {
      name: 'membership value mount with calculator script → allowed',
      rel: 'membership-value/index.html',
      html: '<div data-membership-value-calculator></div><script src="/assets/membership-value-calculator.js"></script>',
      expect: 0,
    },
    {
      name: 'membership value mount without calculator script → violation',
      rel: 'membership-value/index.html',
      html: '<div data-membership-value-calculator></div>',
      expect: 1,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const srcs = scriptsIn(c.html);
    let bad = 0;
    for (const { base } of srcs) {
      const rule = RULE_BY_SCRIPT.get(base);
      if (!rule) continue;
      if (!rule.allow(c.rel, c.html)) bad++;
    }
    for (const rule of REQUIRED) {
      if (rule.when(c.rel, c.html) && !srcs.some(({ base }) => base === rule.script)) bad++;
    }
    const got = bad === 0 ? 0 : 1;
    if (got !== c.expect) {
      console.error(`  ✘ ${c.name}  (expected ${c.expect}, got ${got})`);
      failed++;
    } else {
      console.log(`  ✓ ${c.name}`);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed}/${cases.length} self-test cases failed`);
    process.exit(1);
  }
  console.log(`\n✓ ${cases.length}/${cases.length} self-test cases passed`);
}

if (SELF_TEST) {
  selfTest();
} else {
  process.exit(check());
}
