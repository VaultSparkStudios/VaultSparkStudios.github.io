#!/usr/bin/env node
// check-mobile-contracts.mjs — structural gate for mobile regression-prone surfaces.
//
// Drift classes this gate catches (all surfaced by S130 founder report):
//   1. `body { overflow-x: hidden }` on body/html — silently breaks iOS Safari sticky-header.
//   2. Text inputs without 16px font-size at <=768px — triggers iOS Safari focus-zoom.
//   3. Brand wordmark markup without `.brand-suffix` span — re-introduces the "k" cutoff
//      on iPhone widths because the suffix can no longer be hidden via CSS.
//   4. Mobile open-state nav color/background overrides that lose to theme selectors.
//   5. Fixed mobile drawer trapped inside sticky header while body-level backdrop swallows taps.
//   6. Theme + state selector specificity layering on ANY element (not just nav) — the
//      S132 root cause class generalized: `body.<theme> .X` (0,2,2) beats `.X.<state>`
//      (0,2,1) wherever both exist, so state overrides need `body`/`:where()` guards.
//   7. Fixed elements pinned to viewport top/bottom edges without `env(safe-area-inset-*)`
//      padding — iPhone notch + home-indicator silently overlap content (S156 audit #18).
//      Any `position: fixed` rule with `top: 0` / `bottom: 0` / `inset-block-*: 0` must
//      either pad with `env(safe-area-inset-*)` or be allowlisted with `/* allow: <reason> */`.
//
// Usage:
//   node scripts/check-mobile-contracts.mjs           # exit 1 on drift
//   node scripts/check-mobile-contracts.mjs --report  # always exit 0, print summary
//
// Pairs with: scripts/check-render-contracts.mjs (S129 · same architectural pattern).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPORT = process.argv.includes('--report');
const SELF_TEST = process.argv.includes('--self-test');

// Contract 6 module-level constants (declared early to dodge TDZ in --self-test path).
const C6_STATE_TOKENS_DECL = ['.open', '.active', '.visible', '[aria-expanded="true"]', '[aria-expanded=true]'];
const C6_COLOR_BG_RE_DECL = /(^|[;\s{])(?:color|background(?:-color)?)\s*:/i;
const C6_THEME_PREFIX_RE_DECL = /^body\.([\w-]+)\s+(.+)$/;

// Contract 7 module-level constants (S156 — same TDZ avoidance pattern).
const C7_EDGE_PIN_RE = /(?:^|[;\s{])(?:top|bottom|inset-block-start|inset-block-end|inset)\s*:\s*0(?:px|rem|em|vh|%)?(?:\s|;|$)/i;
const C7_SAFE_AREA_RE = /env\s*\(\s*safe-area-inset-/i;

// ── Self-test: inject + detect each violation class in-memory, then verify the
//   detector flags it. Proves the gate catches what it claims to catch.
//   Per [[feedback_structural_gate_pattern]] — gates without self-tests rot. ──
if (SELF_TEST) {
  const cases = [
    {
      name: 'overflow-x: hidden on body',
      sample: 'html, body { overflow-x: hidden; }',
      pattern: /(?:^|[,\s{}])\s*(?:html|body|html\s*,\s*body|body\s*,\s*html)\s*\{[^}]*overflow-x\s*:\s*hidden/im,
      expect: true,
    },
    {
      name: 'overflow-x: clip on body (safe)',
      sample: 'html, body { overflow-x: clip; }',
      pattern: /(?:^|[,\s{}])\s*(?:html|body|html\s*,\s*body|body\s*,\s*html)\s*\{[^}]*overflow-x\s*:\s*hidden/im,
      expect: false,
    },
    {
      name: 'overflow-x: hidden on .container (allowed)',
      sample: '.container { overflow-x: hidden; }',
      pattern: /(?:^|[,\s{}])\s*(?:html|body|html\s*,\s*body|body\s*,\s*html)\s*\{[^}]*overflow-x\s*:\s*hidden/im,
      expect: false,
    },
    {
      name: '16px input floor at <=768px (present)',
      sample: '@media (max-width: 768px) { input { font-size: 16px; } }',
      pattern: /@media[^{]*max-width:\s*768px[^{]*\{[\s\S]*?input[^{]*\{[\s\S]*?font-size\s*:\s*16px/i,
      expect: true,
    },
    {
      name: 'brand-wordmark without brand-suffix (violation)',
      sample: '<span class="brand-wordmark">VaultSpark</span>',
      patternHas: /class\s*=\s*["'][^"']*\bbrand-wordmark\b[^"']*["']/i,
      patternMissing: /class\s*=\s*["'][^"']*\bbrand-suffix\b[^"']*["']/i,
      expect: true,
    },
    {
      name: 'brand-wordmark WITH brand-suffix (safe)',
      sample: '<span class="brand-wordmark">VaultSpark<span class="brand-suffix"> Studios</span></span>',
      patternHas: /class\s*=\s*["'][^"']*\bbrand-wordmark\b[^"']*["']/i,
      patternMissing: /class\s*=\s*["'][^"']*\bbrand-suffix\b[^"']*["']/i,
      expect: false,
    },
    {
      name: 'nav open-state color override without body prefix (violation)',
      sample: '.nav-center.open a { color: var(--text); }',
      custom: sample => findNavStateSpecificityViolations(sample).length > 0,
      expect: true,
    },
    {
      name: 'nav open-state color override with body prefix (safe)',
      sample: 'body .nav-center.open a { color: var(--text); }',
      custom: sample => findNavStateSpecificityViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'nav drawer portal contract present (safe)',
      sample: 'function openMenu(){ if (navMenu.parentNode !== document.body) document.body.appendChild(navMenu); } function closeMenu(){ navHome.insertBefore(navMenu, navHomeNext); }',
      custom: sample => hasNavDrawerPortalContract(sample),
      expect: true,
    },
    {
      name: 'theme + state specificity trap on .panel (violation)',
      sample: 'body.dark-mode .panel { color: #ccc; } .panel.open { color: #fff; }',
      custom: sample => findThemeStateSpecificityViolations(sample).length > 0,
      expect: true,
    },
    {
      name: 'theme + state specificity trap with body-prefixed state (safe)',
      sample: 'body.dark-mode .panel { color: #ccc; } body .panel.open { color: #fff; }',
      custom: sample => findThemeStateSpecificityViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'theme + state on different elements (safe — not the same .X)',
      sample: 'body.dark-mode .panel { color: #ccc; } .drawer.open { color: #fff; }',
      custom: sample => findThemeStateSpecificityViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'state selector with no theme rule (safe — no specificity conflict)',
      sample: '.modal.visible { color: #fff; }',
      custom: sample => findThemeStateSpecificityViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'fixed top:0 without safe-area-inset (violation)',
      sample: '.top-bar { position: fixed; top: 0; left: 0; right: 0; padding: 12px; }',
      custom: sample => findSafeAreaViolations(sample).length > 0,
      expect: true,
    },
    {
      name: 'fixed bottom:0 WITH safe-area-inset (safe)',
      sample: '.bottom-bar { position: fixed; bottom: 0; left: 0; padding-bottom: env(safe-area-inset-bottom, 0); }',
      custom: sample => findSafeAreaViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'fixed top:0 allowlisted (safe)',
      sample: '/* allow: cosmetic overlay below status bar — S156 */\n.veil { position: fixed; top: 0; left: 0; right: 0; }',
      custom: sample => findSafeAreaViolations(sample).length > 0,
      expect: false,
    },
    {
      name: 'fixed center-positioned modal (safe — not pinned to edge)',
      sample: '.modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); }',
      custom: sample => findSafeAreaViolations(sample).length > 0,
      expect: false,
    },
  ];
  let passed = 0, failed = 0;
  for (const c of cases) {
    let got;
    if (c.custom) {
      got = c.custom(c.sample);
    } else if (c.patternHas) {
      // Violation only when "has" matches AND "missing" does not match.
      got = c.patternHas.test(c.sample) && !c.patternMissing.test(c.sample);
    } else {
      got = c.pattern.test(c.sample);
    }
    const ok = got === c.expect;
    console.log(`  ${ok ? '✓' : '✗'} ${c.name} (expect detect=${c.expect}, got=${got})`);
    if (ok) passed += 1; else failed += 1;
  }
  console.log(`\nself-test: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.cache', '.wrangler', 'dist', 'build',
  'coverage', 'test-results', 'playwright-report',
]);

function* walk(dir, exts) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) yield* walk(full, exts);
    else if (exts.some(e => name.endsWith(e))) yield full;
  }
}

const violations = [];
let inputFloorChecked = false;
let brandSpanChecked = 0;
let navStateChecked = 0;
let navPortalChecked = false;

function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseCssBlocks(text) {
  const cleaned = stripCssComments(text);
  const blocks = [];
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockRe.exec(cleaned)) !== null) {
    blocks.push({
      selector: match[1].trim().replace(/\s+/g, ' '),
      body: match[2],
    });
  }
  return blocks;
}

function findNavStateSpecificityViolations(cssText) {
  return parseCssBlocks(cssText).filter(block => {
    const selector = block.selector;
    if (!selector.includes('.nav-center.open')) return false;
    if (!/(^|[;\s])(?:color|background(?:-color)?)\s*:/i.test(block.body)) return false;

    const selectors = selector.split(',').map(part => part.trim()).filter(Boolean);
    return selectors.some(part => {
      if (!part.includes('.nav-center.open')) return false;
      return !/^body(?:\s|\.|:where\()/.test(part) && !part.includes(':where(');
    });
  });
}

// Contract 6: generalize Contract 4 beyond `.nav-center.open`. For every block
// of the form `body.<theme> .X { … color/background … }` we check that any
// matching `.X.<state>` block (state ∈ open|active|visible|aria-expanded=true)
// that also sets color/background is either (a) prefixed with `body`, or
// (b) wrapped in `:where()` to drop its specificity. Otherwise the theme rule
// silently overrides the state rule in that theme.
//
// We deliberately constrain to color/background because those are the
// properties where the theme/state collision produces a visible bug (the
// S132 "dim drawer" symptom). Layout properties (padding/transform) layer
// safely in either order.
function selectorTargetsState(selector, baseClass) {
  return C6_STATE_TOKENS_DECL.some(token => {
    const needle = `${baseClass}${token}`;
    if (!selector.includes(needle)) return false;
    return selector.split(',').some(part => part.trim().includes(needle));
  });
}

function findThemeStateSpecificityViolations(cssText) {
  const blocks = parseCssBlocks(cssText);
  // Build set of base-classes that appear in `body.<theme> .X` blocks with color/bg.
  const themedBaseClasses = new Set();
  for (const { selector, body } of blocks) {
    if (!C6_COLOR_BG_RE_DECL.test(body)) continue;
    for (const part of selector.split(',')) {
      const trimmed = part.trim();
      const m = trimmed.match(C6_THEME_PREFIX_RE_DECL);
      if (!m) continue;
      const tail = m[2];
      // Extract first base class (e.g. ".panel" from ".panel a span").
      const classMatch = tail.match(/\.([\w-]+)/);
      if (classMatch) themedBaseClasses.add('.' + classMatch[1]);
    }
  }
  if (!themedBaseClasses.size) return [];

  const violations = [];
  for (const block of blocks) {
    if (!C6_COLOR_BG_RE_DECL.test(block.body)) continue;
    for (const baseClass of themedBaseClasses) {
      if (!selectorTargetsState(block.selector, baseClass)) continue;
      // Skip the nav-center.open block — Contract 4 already covers it explicitly.
      if (baseClass === '.nav-center') continue;
      const selectors = block.selector.split(',').map(s => s.trim()).filter(Boolean);
      const offending = selectors.find(sel => {
        if (!C6_STATE_TOKENS_DECL.some(tok => sel.includes(`${baseClass}${tok}`))) return false;
        return !/^body(?:\s|\.|:where\()/.test(sel) && !sel.includes(':where(');
      });
      if (offending) {
        violations.push({ selector: block.selector, baseClass, offending });
        break;
      }
    }
  }
  return violations;
}

// Contract 7: any `position: fixed` block pinned to top/bottom viewport edge must
// pad with env(safe-area-inset-*) or be allowlisted with a `/* allow: <reason> */`
// comment immediately before the block. iPhone notch + home-indicator silently
// overlap content otherwise.
function findSafeAreaViolations(cssText) {
  // Replace allow-comments with a sentinel token that survives stripCssComments,
  // then strip remaining comments, then parse blocks.
  const sentinelized = cssText.replace(/\/\*\s*allow\s*:[^*]*\*\//gi, '__C7_ALLOW_OK__');
  const cleaned = stripCssComments(sentinelized);
  const blocks = [];
  const blockRe = /(__C7_ALLOW_OK__\s*)?([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockRe.exec(cleaned)) !== null) {
    blocks.push({
      allowed: Boolean(match[1]),
      selector: match[2].trim().replace(/\s+/g, ' '),
      body: match[3],
    });
  }
  const violations = [];
  for (const { allowed, selector, body } of blocks) {
    if (allowed) continue;
    if (!/position\s*:\s*fixed/i.test(body)) continue;
    if (!C7_EDGE_PIN_RE.test(body)) continue;
    if (C7_SAFE_AREA_RE.test(body)) continue;
    // Skip pseudo-elements — decorative, no interactive content.
    if (/::?(?:before|after)/i.test(selector)) continue;
    // Skip full-viewport overlays (top AND bottom both 0, or `inset:0`) — content is
    // centered inside, so notch/home-indicator overlap is cosmetic on the backdrop,
    // not on interactive content.
    const hasTop0 = /(?:^|[;\s{])top\s*:\s*0/i.test(body);
    const hasBottom0 = /(?:^|[;\s{])bottom\s*:\s*0/i.test(body);
    const hasInset0 = /(?:^|[;\s{])inset\s*:\s*0/i.test(body);
    if (hasInset0 || (hasTop0 && hasBottom0)) continue;
    violations.push({ selector, detail: 'pinned to viewport edge without env(safe-area-inset-*)' });
  }
  return violations;
}

function hasNavDrawerPortalContract(jsText) {
  return /document\.body\.appendChild\(\s*navMenu\s*\)/.test(jsText)
    && /navHome\.insertBefore\(\s*navMenu\s*,\s*navHomeNext\s*\)/.test(jsText);
}

// ── Contract 1: overflow-x:hidden on body/html ────────────────────────────────

// Contract 8: the sheet is an alternate mobile navigation surface, not a
// reduced map. It must mirror the drawer's Vault-access footer and the shared
// theme API; runtime behavior is covered by tests/mobile-nav-parity.spec.js.
function hasNavSheetParityContract(jsText) {
  const accessCalls = jsText.match(/buildAccessRow\(body\)/g) || [];
  return accessCalls.length >= 2
    && /mobile-nav-footer/.test(jsText)
    && /vs-nav-sheet-action/.test(jsText)
    && /window\.VSTheme/.test(jsText)
// Match `body` / `html` / `html, body` selectors followed by a block containing
    && /vs-nav-sheet-theme-pill/.test(jsText);
}
// `overflow-x: hidden` (no `clip`). Anything in node_modules / 3rd-party is skipped
// by walk().
const OVERFLOW_HIDDEN_BODY = /(?:^|[,\s{}])\s*(?:html|body|html\s*,\s*body|body\s*,\s*html)\s*\{[^}]*overflow-x\s*:\s*hidden/im;

for (const file of walk(ROOT, ['.css'])) {
  // Skip generated shell asset bundles — they're rebuilt from style.css; checking
  // them in addition would double-report. style.shell-*.css picked up by .css ext —
  // we keep them as a defense check but report under the source path.
  const text = readFileSync(file, 'utf8');
  if (OVERFLOW_HIDDEN_BODY.test(text)) {
    violations.push({
      contract: 'overflow-x-clip-on-body',
      file: relative(ROOT, file),
      detail: '`overflow-x: hidden` on body/html breaks iOS sticky-header (use `clip`)',
    });
  }
}

for (const file of walk(ROOT, ['.html'])) {
  const text = readFileSync(file, 'utf8');
  // Only scan inline <style> blocks
  const styleBlocks = text.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) || [];
  for (const block of styleBlocks) {
    if (OVERFLOW_HIDDEN_BODY.test(block)) {
      violations.push({
        contract: 'overflow-x-clip-on-body',
        file: relative(ROOT, file),
        detail: 'inline <style> sets `overflow-x: hidden` on body/html',
      });
      break;
    }
  }
}

// ── Contract 2: 16px text-input floor at <=768px ──────────────────────────────
// Look for a media query containing input/textarea/select font-size: 16px.
const styleCss = readFileSync(resolve(ROOT, 'assets/style.css'), 'utf8');
const MOBILE_INPUT_FLOOR = /@media[^{]*max-width:\s*768px[^{]*\{[\s\S]*?input[^{]*\{[\s\S]*?font-size\s*:\s*16px/i;
if (MOBILE_INPUT_FLOOR.test(styleCss)) {
  inputFloorChecked = true;
} else {
  violations.push({
    contract: 'ios-input-zoom-prevention',
    file: 'assets/style.css',
    detail: 'no `font-size:16px` floor for input/textarea/select inside `@media (max-width:768px)` — iOS Safari will zoom on focus',
  });
}

// ── Contract 4: theme-safe mobile nav state overrides ───────────────────────
// S132 root cause: theme rules like `body.light-mode .nav-center a` had
// specificity (0,2,2), while `.nav-center.open a` had (0,2,1). Source order was
// not enough; state overrides that set color/background on `.nav-center.open`
// must be prefixed with `body` (or use :where) so mobile drawer links stay
// legible in every theme.
const navSpecificityViolations = findNavStateSpecificityViolations(styleCss);
navStateChecked = parseCssBlocks(styleCss).filter(block => block.selector.includes('.nav-center.open')).length;
for (const block of navSpecificityViolations) {
  violations.push({
    contract: 'theme-safe-nav-state-overrides',
    file: 'assets/style.css',
    detail: `selector \`${block.selector}\` sets color/background without a body/:where specificity guard`,
  });
}

// ── Contract 5: mobile drawer escapes sticky-header stacking context ─────────
// S132 root cause: `.site-header { position: sticky; z-index:100 }` trapped the
// fixed drawer below the body-level z:199 backdrop, making the drawer untappable.
// The drawer may remain CSS-positioned as fixed, but nav-toggle.js must portal it
// to <body> on open and restore it on close.
const navToggleJs = readFileSync(resolve(ROOT, 'assets/nav-toggle.js'), 'utf8');
const hasStickyHeaderContext = /\.site-header\s*\{[\s\S]*?position\s*:\s*sticky[\s\S]*?z-index\s*:\s*\d+/i.test(styleCss);
const hasFixedDrawer = /\.nav-center\.open\s*\{[\s\S]*?position\s*:\s*fixed[\s\S]*?z-index\s*:\s*\d+/i.test(styleCss);
const hasBodyBackdrop = /#nav-backdrop\s*\{[\s\S]*?position\s*:\s*fixed[\s\S]*?z-index\s*:\s*\d+/i.test(styleCss);
navPortalChecked = hasStickyHeaderContext && hasFixedDrawer && hasBodyBackdrop && hasNavDrawerPortalContract(navToggleJs);
if (hasStickyHeaderContext && hasFixedDrawer && hasBodyBackdrop && !hasNavDrawerPortalContract(navToggleJs)) {
  violations.push({
    contract: 'mobile-drawer-root-stacking-context',
    file: 'assets/nav-toggle.js',
    detail: 'fixed `.nav-center.open` must be portaled to `document.body` on open and restored on close so `#nav-backdrop` cannot swallow taps',
  });
}
// Contract 9: the portaled drawer (200), backdrop (199), and header close
// control must form an explicit root stack. A visually present X below the
// backdrop is not reachable and is a CANON-041 release failure.
const openHeaderZ = Number(styleCss.match(/body:has\(\.nav-center\.open\)\s+\.site-header\s*\{[\s\S]*?z-index\s*:\s*(\d+)/i)?.[1]);
const drawerZ = Number(styleCss.match(/\.nav-center\.open\s*\{[\s\S]*?z-index\s*:\s*(\d+)/i)?.[1]);
const backdropZ = Number(styleCss.match(/#nav-backdrop\s*\{[\s\S]*?z-index\s*:\s*(\d+)/i)?.[1]);
const navCloseStackChecked = openHeaderZ > drawerZ && drawerZ > backdropZ;
if (!navCloseStackChecked) {
  violations.push({
    contract: 'mobile-close-control-root-stack',
    file: 'assets/style.css',
    detail: `open header (${openHeaderZ || 'missing'}) must be above drawer (${drawerZ || 'missing'}) and backdrop (${backdropZ || 'missing'})`,
  });
}
// ── Contract 6: theme/state specificity (generalized beyond nav) ─────────────

// ── Contract 8: drawer/sheet control parity ─────────────────────────────────
const navSheetJs = readFileSync(resolve(ROOT, 'assets/nav-sheet.js'), 'utf8');
const navSheetParityChecked = hasNavSheetParityContract(navSheetJs);
if (!navSheetParityChecked) {
  violations.push({
    contract: 'mobile-drawer-sheet-control-parity',
    file: 'assets/nav-sheet.js',
    detail: 'sheet must mirror drawer Vault-access controls and the shared VSTheme API; keep runtime parity coverage in tests/mobile-nav-parity.spec.js',
  });
}
let themeStateChecked = 0;
let themeStateViolationCount = 0;
for (const file of walk(ROOT, ['.css'])) {
  // Skip generated shell bundles — they mirror style.css; reporting both would dupe.
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (/style\.shell-[a-f0-9]+\.css$/.test(rel)) continue;
  const text = readFileSync(file, 'utf8');
  const themeStateViolations = findThemeStateSpecificityViolations(text);
  themeStateChecked += 1;
  for (const v of themeStateViolations) {
    themeStateViolationCount += 1;
    violations.push({
      contract: 'theme-state-specificity-budget',
      file: rel,
      detail: `state selector \`${v.offending}\` for base \`${v.baseClass}\` lacks body/:where guard while a theme rule targets the same base — theme will outrank state`,
    });
  }
}

// ── Contract 7: safe-area-inset on viewport-edge fixed elements ──────────────
let safeAreaChecked = 0;
let safeAreaViolationCount = 0;
for (const file of walk(ROOT, ['.css'])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (/style\.shell-[a-f0-9]+\.css$/.test(rel)) continue;
  const text = readFileSync(file, 'utf8');
  const v = findSafeAreaViolations(text);
  safeAreaChecked += 1;
  for (const item of v) {
    safeAreaViolationCount += 1;
    violations.push({
      contract: 'safe-area-inset-edge-pin',
      file: rel,
      detail: `\`${item.selector}\` is pinned to viewport edge without env(safe-area-inset-*) padding — iPhone notch/home-indicator will overlap`,
    });
  }
}

// ── Contract 3: brand wordmark structural split ───────────────────────────────
// Every public HTML page with a `.brand-wordmark` element must contain a
// `.brand-suffix` span (S130 decision — split lets mobile hide just the suffix).
const WORDMARK_RE = /class\s*=\s*["'][^"']*\bbrand-wordmark\b[^"']*["']/i;
const SUFFIX_RE = /class\s*=\s*["'][^"']*\bbrand-suffix\b[^"']*["']/i;

for (const file of walk(ROOT, ['.html'])) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  // Skip vendored/test/admin html surfaces
  if (rel.startsWith('test-results/') || rel.includes('/__snapshots__/')) continue;
  const text = readFileSync(file, 'utf8');
  if (!WORDMARK_RE.test(text)) continue;
  brandSpanChecked++;
  if (!SUFFIX_RE.test(text)) {
    violations.push({
      contract: 'brand-wordmark-split',
      file: rel,
      detail: '`.brand-wordmark` present but `.brand-suffix` span missing — mobile wordmark will cut off (S130)',
    });
  }
}

// ── Output ────────────────────────────────────────────────────────────────────
const ok = violations.length === 0;

if (REPORT || ok) {
  console.log('check-mobile-contracts');
  console.log('──────────────────────────────────────────────');
  console.log(`  Contract 1 — overflow-x: clip on body/html  : ${violations.some(v => v.contract === 'overflow-x-clip-on-body') ? '✗' : '✓'}`);
  console.log(`  Contract 2 — 16px input floor @<=768px      : ${inputFloorChecked ? '✓' : '✗'}`);
  console.log(`  Contract 3 — .brand-wordmark/.brand-suffix  : ${violations.some(v => v.contract === 'brand-wordmark-split') ? '✗' : `✓  (${brandSpanChecked} pages scanned)`}`);
  console.log(`  Contract 4 — theme-safe nav open overrides  : ${navSpecificityViolations.length ? '✗' : `✓  (${navStateChecked} nav-state blocks scanned)`}`);
  console.log(`  Contract 5 — drawer escapes sticky context  : ${navPortalChecked ? '✓' : '✗'}`);
  console.log(`  Contract 6 — theme/state specificity budget : ${themeStateViolationCount ? '✗' : `✓  (${themeStateChecked} css files scanned)`}`);
  console.log(`  Contract 7 — safe-area-inset edge-pin gate  : ${safeAreaViolationCount ? '✗' : `✓  (${safeAreaChecked} css files scanned)`}`);
}
  console.log(`  Contract 8 — drawer/sheet control parity   : ${navSheetParityChecked ? '✓' : '✗'}`);
  console.log(`  Contract 9 — reachable close root stack    : ${navCloseStackChecked ? '✓' : '✗'}`);

if (!ok) {
  console.error('');
  console.error(`✗ ${violations.length} mobile-contract violation${violations.length === 1 ? '' : 's'}:`);
  for (const v of violations) {
    console.error(`    [${v.contract}] ${v.file}`);
    console.error(`        ${v.detail}`);
  }
  if (!REPORT) process.exit(1);
} else {
  console.log('\n✓ all mobile contracts satisfied');
}
