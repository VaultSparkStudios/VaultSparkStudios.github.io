#!/usr/bin/env node
/**
 * scripts/check-nav-orphans.mjs
 *
 * Structural gate (S135): fail loudly when any public-facing HTML page
 * lacks the <header class="site-header"> or <footer class="site-footer">
 * markers that propagate-nav.mjs requires to inject sitewide nav/footer.
 *
 * Root cause this guards against: propagate-nav.mjs only REPLACES existing
 * markers via regex — it never INJECTS into pages missing them. So a page
 * authored without markers silently misses sitewide nav forever. Tombstones,
 * signal-log, and notebook all shipped orphaned this way before S135.
 *
 * Exempt list is sourced from propagate-nav.mjs (SKIP_DIRS + SKIP_FILES) so
 * a single source of truth governs both injection and validation.
 *
 * Exit codes: 0 = clean, 1 = orphans detected
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Mirror propagate-nav.mjs skip lists.
const SKIP_DIRS = new Set([
  'node_modules', 'playwright-report', 'test-results',
  'investor', 'investor-portal', 'studio-hub', 'vaultsparked',
  '.ai', '.git', '.well-known', 'scripts',
  'products', 'ignis-health', 'vault-treasury',
  // dirs that are not part of the public site shell:
  'docs', 'context', 'logs', 'supabase', 'config', 'public', 'tests',
  'workers', 'cloudflare', '_og', 'data', 'site', 'build', 'dist',
  '.github', '.cache', 'coverage',
  // S193: untracked Obelisk-passport WIP (login/callback) — not in git HEAD, not
  // part of the public shell yet. Exempt until it's finished + committed; whoever
  // ships it should remove this skip so nav-orphan guards it. (Mirrors propagate-nav.)
  'obelisk-passport',
  // S193: solara is a standalone Vite game app (its own dark UI, no VaultSpark
  // shell nav by design) — same class as the exempted franchise-architect
  // game runtime. (Mirrors propagate-nav.)
  'solara',
  // S225: Lighthouse CI HTML report artifacts — these are rendered Lighthouse
  // audit pages, not part of the public site shell. (Mirrors propagate-nav.)
  'lighthouse-results'
]);

const SKIP_FILES = new Set([
  'franchise-architect/game.html',
  'franchise-architect/index.html',
  'franchise-architect/404.html',
  '404.html', 'offline.html',
  'share/index.html',
  'vault-member/admin/ignis-spend/index.html',
  'vault-member/passport/index.html',
  // S207: Obelisk Passport login + OAuth callback — auth utility pages, own minimal layout.
  'login.html',
  'auth/callback.html'
]);

function findHtml(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const rel = relative(base, full).replace(/\\/g, '/');
    if (statSync(full).isDirectory()) {
      findHtml(full, base, out);
    } else if (entry.endsWith('.html')) {
      if (SKIP_FILES.has(rel)) continue;
      out.push({ full, rel });
    }
  }
  return out;
}

const orphans = [];
for (const { full, rel } of findHtml(ROOT)) {
  const html = readFileSync(full, 'utf-8');
  // Redirect pages legitimately have no nav.
  if (/<meta\s+http-equiv=["']refresh["']/i.test(html)) continue;
  const noHeader = !/<header\s+class=["']site-header["']/i.test(html);
  const noFooter = !/<footer\s+class=["']site-footer["']/i.test(html);
  if (noHeader || noFooter) {
    orphans.push({ rel, noHeader, noFooter });
  }
}

if (orphans.length === 0) {
  console.log('✓ Nav-orphan check: all public HTML pages have site-header + site-footer markers');
  process.exit(0);
}

console.error(`✘ Nav-orphan check FAILED — ${orphans.length} page(s) missing sitewide nav markers:\n`);
for (const o of orphans) {
  const tags = [o.noHeader && 'header', o.noFooter && 'footer'].filter(Boolean).join(' + ');
  console.error(`  ${o.rel}  (missing: ${tags})`);
}
console.error(`\nFix options:`);
console.error(`  • Add empty <header class="site-header"></header> + <footer class="site-footer"></footer>`);
console.error(`    placeholders to the page so propagate-nav.mjs can fill them, OR`);
console.error(`  • Add the file/dir to SKIP_FILES/SKIP_DIRS in scripts/propagate-nav.mjs`);
console.error(`    AND mirror the exemption in scripts/check-nav-orphans.mjs.`);
process.exit(1);
