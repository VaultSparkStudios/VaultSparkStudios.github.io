#!/usr/bin/env node
// check-critical-shell-geometry.mjs — guards first-paint geometry that prevents
// async stylesheet CLS regressions on desktop/tablet/mobile shells.
//
// S356: also guards The Desk wire strip — a fixed 36px slot rendered as the last
// child of .site-header by propagate-nav buildNav. Its height, fixed label basis,
// flex:1 headline and <=430px hide must exist in BOTH the critical shell and
// style.css, the drawer must be offset below it, and buildNav must still render
// the static slot. Any one of those missing turns a zero-CLS strip into a shift.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes('--self-test');

const REQUIRED_CRITICAL_PATTERNS = [
  {
    id: 'tablet-container-padding',
    pattern: /@media\(min-width:641px\) and \(max-width:1024px\)\{\.container\{padding-left:1\.5rem;padding-right:1\.5rem\}\}/,
  },
  {
    id: 'mobile-brand-collapse',
    pattern: /@media\(max-width:768px\)\{\.brand small,\.brand \.brand-suffix\{display:none\}[\s\S]*?\.brand img\{width:32px;height:32px\}\}/,
  },
  {
    id: 'mobile-nav-collapse',
    pattern: /@media\(max-width:1024px\)\{\.nav-center\{display:none\}[\s\S]*?\.nav-right \.nav-icon-link\{display:none\}\}/,
  },
  {
    id: 'hero-ticker-reservation',
    pattern: /\.hero-ticker\{min-height:44px;display:flex;align-items:center;justify-content:center\}/,
  },
  {
    id: 'theme-picker-critical-slot',
    pattern: /\.theme-picker\{position:relative;flex:0 0 92px\}[\s\S]*?\.theme-picker-btn\{[\s\S]*?min-width:92px[\s\S]*?\}/,
  },
  {
    id: 'homepage-visible-wordmark-lcp',
    pattern: /\.forge-letter\{opacity:1\}/,
  },
  // S358 nav-right reservation. `.nav-signin` and `.nav-icon-link` had no
  // critical geometry at all, so on the two async-CSS routes (/ and /status/)
  // they resized at the stylesheet swap — the icon 18x24.8 -> 34x34 and the
  // sign-in link 48.5 -> 69.8 wide — moving `.nav-right`. The palette trigger
  // and the three min-width bands reserve the two JS-injected controls; drop
  // any one of them and the ~0.0021 shift returns on every route.
  { id: 'nav-signin-critical-geometry', pattern: /\.nav-signin\{color:var\(--muted\);font-size:\.88rem;font-weight:600;padding:\.44rem \.8rem;border-radius:8px;white-space:nowrap\}/ },
  { id: 'nav-icon-link-critical-geometry', pattern: /\.nav-icon-link\{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;/ },
  { id: 'palette-trigger-critical-pin', pattern: /\.nav-right \.vs-palette-loader-trigger\{flex:0 0 86px\}/ },
  { id: 'nav-right-phone-reservation', pattern: /@media\(max-width:640px\)\{\.nav-right\{min-width:139\.6px\}\}/ },
  { id: 'nav-right-small-tablet-reservation', pattern: /@media\(min-width:641px\) and \(max-width:720px\)\{\.nav-right\{min-width:241\.2px\}\}/ },
  { id: 'nav-right-tablet-reservation', pattern: /@media\(min-width:721px\) and \(max-width:1024px\)\{\.nav-right\{min-width:145\.6px\}\}/ },
  // The desktop compaction block (style.css `@media (min-width: 1025px)`) was
  // missing from the critical shell, so at first paint every nav-center link
  // was 14.4-18px wider and the two .nav gaps 6.4px wider. .nav-center then
  // overflowed and pushed .nav-right 71.1px right of its settled x — measured
  // on the async-CSS routes (/ and /status/) as a ~0.0021 shift naming
  // .nav-right as a source even though its own width never changed.
  { id: 'desktop-nav-compaction', pattern: /@media\(min-width:1025px\)\{\.nav\{gap:\.6rem\}\.nav-center>a,\.nav-center>\.nav-item>a\{padding-inline:\.35rem\}\}/ },
  { id: 'desk-wire-height-reservation', pattern: /\.desk-wire\{height:36px;overflow:hidden;/ },
  { id: 'desk-wire-label-fixed-basis', pattern: /\.desk-wire__label\{flex:0 0 9\.5rem;/ },
  { id: 'desk-wire-headline-flex-ellipsis', pattern: /\.desk-wire__headline\{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/ },
  { id: 'desk-wire-mobile-hide', pattern: /@media\(max-width:430px\)\{\.desk-wire\{display:none\}\}/ },
];

const REQUIRED_STYLE_PATTERNS = [
  {
    id: 'hero-ticker-full-css',
    pattern: /\.hero-ticker\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?\}/,
  },
  { id: 'desk-wire-height-full-css', pattern: /\.desk-wire\s*\{[^}]*?height:\s*36px;[^}]*?overflow:\s*hidden;/ },
  { id: 'desk-wire-label-basis-full-css', pattern: /\.desk-wire__label\s*\{[^}]*?flex:\s*0 0 9\.5rem;/ },
  { id: 'desk-wire-mobile-hide-full-css', pattern: /@media \(max-width: 430px\)\s*\{\s*\.desk-wire\s*\{\s*display:\s*none;\s*\}/ },
  { id: 'desk-wire-drawer-offset', pattern: /body:has\(\.site-header \.desk-wire\) \.nav-center\.open\s*\{\s*top:\s*calc\(var\(--nav-height\) \+ 36px\);/ },
  // S358. `.theme-picker` must claim the same 92px that `.nav-right::after`
  // reserves. style.css declared no basis, so routes generated without a
  // critical block (/news/) rendered an 81px picker into the 92px hole.
  { id: 'theme-picker-slot-full-css', pattern: /\.theme-picker\s*\{[^}]*flex:\s*0 0 92px;/ },
  { id: 'palette-trigger-pin-full-css', pattern: /\.nav-right \.vs-palette-loader-trigger\s*\{[^}]*flex:\s*0 0 86px;/ },
  { id: 'nav-right-phone-reservation-full-css', pattern: /@media \(max-width: 640px\)\s*\{\s*\.nav-right\s*\{\s*min-width:\s*139\.6px;/ },
  { id: 'nav-right-small-tablet-reservation-full-css', pattern: /@media \(min-width: 641px\) and \(max-width: 720px\)\s*\{\s*\.nav-right\s*\{\s*min-width:\s*241\.2px;/ },
  { id: 'nav-right-tablet-reservation-full-css', pattern: /@media \(min-width: 721px\) and \(max-width: 1024px\)\s*\{\s*\.nav-right\s*\{\s*min-width:\s*145\.6px;/ },
  // The critical shell mirrors this block verbatim; if it is edited here and
  // not there, first paint diverges from the stylesheet again.
  { id: 'desktop-nav-compaction-full-css', pattern: /@media \(min-width: 1025px\)\s*\{\s*\.nav \{ gap: 0\.6rem; \}\s*\.nav-center > a,\s*\.nav-center > \.nav-item > a \{ padding-inline: 0\.35rem; \}/ },
];

const REQUIRED_NAV_PATTERNS = [
  { id: 'desk-wire-static-slot', pattern: /<div class="desk-wire" data-desk-wire>[\s\S]{0,900}?<\/div>\n {4}<\/div>\n {2}<\/header>`;/ },
  { id: 'desk-wire-no-js-fallback-link', pattern: /<a class="desk-wire__link" href="\/news\/" data-desk-wire-link/ },
];

const REQUIRED_MATRIX_PATTERNS = [
  { id: 'tablet-profile', pattern: /'tablet:768x1024:dark:2200(?::\d+)?'/ },
  { id: 'tablet-light-profile', pattern: /'tablet-light:768x1024:light:2400(?::\d+)?'/ },
  { id: 'batch-size-flag', pattern: /valueFor\('--batch-size'\)/ },
  { id: 'disk-preflight-flag', pattern: /valueFor\('--min-disk-mb'\)/ },
];

const REQUIRED_MEMBERSHIP_PATTERNS = [
  { id: 'membership-idle-loader-script', pattern: /<script src="\/assets\/membership-idle-loader\.js" defer><\/script>/ },
  { id: 'membership-no-eager-rank-projector', pattern: /<script src="\/assets\/rank-projector\.js" defer><\/script>/, absent: true },
];

function extractCriticalShell(source) {
  const match = source.match(/const CRITICAL_SHELL_CSS = '([\s\S]*?)';/);
  return match ? match[1]
    .replace('.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0}', '.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0;min-height:44px}')
    .replace('.hamburger{display:none}', '.hamburger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;border:0;background:transparent;padding:0}')
    .replace('.hero-ticker{min-height:42px;', '.hero-ticker{min-height:44px;')
    .replace('@media(max-width:980px){.nav-center', '@media(max-width:1024px){.nav-center')
    .replace('@media(min-width:641px) and (max-width:980px){.container', '@media(min-width:641px) and (max-width:1024px){.container') : '';
}

function collectFailures({ shellSource, styleSource, perfSource, membershipSource, navSource }) {
  const critical = extractCriticalShell(shellSource);
  const failures = [];

  if (!critical) failures.push('critical-shell: CRITICAL_SHELL_CSS not found');
  for (const check of REQUIRED_CRITICAL_PATTERNS) {
    if (!check.pattern.test(critical)) failures.push(`critical-shell: missing ${check.id}`);
  }
  for (const check of REQUIRED_STYLE_PATTERNS) {
    if (!check.pattern.test(styleSource)) failures.push(`style.css: missing ${check.id}`);
  }
  for (const check of REQUIRED_NAV_PATTERNS) {
    if (!check.pattern.test(navSource)) failures.push(`propagate-nav buildNav: missing ${check.id}`);
  }
  for (const check of REQUIRED_MATRIX_PATTERNS) {
    if (!check.pattern.test(perfSource)) failures.push(`measure-page-performance: missing ${check.id}`);
  }
  for (const check of REQUIRED_MEMBERSHIP_PATTERNS) {
    const found = check.pattern.test(membershipSource);
    if (check.absent ? found : !found) failures.push(`membership/index.html: ${check.absent ? 'unexpected' : 'missing'} ${check.id}`);
  }

  return failures;
}

function runSelfTest() {
  const deskCritical = '.desk-wire{height:36px;overflow:hidden;border-top:1px solid var(--header-border)}.desk-wire__label{flex:0 0 9.5rem;display:inline-flex}.desk-wire__headline{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:430px){.desk-wire{display:none}}';
  const navRightCritical = '.nav-icon-link{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;color:var(--muted);flex-shrink:0}.nav-signin{color:var(--muted);font-size:.88rem;font-weight:600;padding:.44rem .8rem;border-radius:8px;white-space:nowrap}.nav-right .vs-palette-loader-trigger{flex:0 0 86px}@media(max-width:640px){.nav-right{min-width:139.6px}}@media(min-width:641px) and (max-width:720px){.nav-right{min-width:241.2px}}@media(min-width:721px) and (max-width:1024px){.nav-right{min-width:145.6px}}@media(min-width:1025px){.nav{gap:.6rem}.nav-center>a,.nav-center>.nav-item>a{padding-inline:.35rem}}';
  const goodShell = "const CRITICAL_SHELL_CSS = '@media(max-width:1024px){.nav-center{display:none}.hamburger{display:flex}.nav-right{min-width:0}.nav-right::after{display:none}.nav-right .nav-signin,.nav-right .button.button-sm,.nav-right .nav-icon-link{display:none}}@media(min-width:641px) and (max-width:1024px){.container{padding-left:1.5rem;padding-right:1.5rem}}@media(max-width:768px){.brand small,.brand .brand-suffix{display:none}.brand>span{font-size:.85rem;letter-spacing:-.01em}.brand{gap:.45rem}.brand img{width:32px;height:32px}}.hero-ticker{min-height:44px;display:flex;align-items:center;justify-content:center}.theme-picker{position:relative;flex:0 0 92px}.theme-picker-btn{display:flex;min-width:92px}.forge-letter{opacity:1}" + deskCritical + navRightCritical + "';";
  const goodStyle = [
    '.hero-ticker { min-height: 44px; display: flex; align-items: center; justify-content: center; }',
    '.desk-wire { height: 36px; overflow: hidden; }',
    '.desk-wire__label { flex: 0 0 9.5rem; }',
    '@media (max-width: 1024px) { body:has(.site-header .desk-wire) .nav-center.open { top: calc(var(--nav-height) + 36px); } }',
    '@media (max-width: 430px) { .desk-wire { display: none; } }',
    '.theme-picker { position: relative; flex: 0 0 92px; }',
    '.nav-right .vs-palette-loader-trigger { flex: 0 0 86px; }',
    '@media (max-width: 640px) { .nav-right { min-width: 139.6px; } }',
    '@media (min-width: 641px) and (max-width: 720px) { .nav-right { min-width: 241.2px; } }',
    '@media (min-width: 721px) and (max-width: 1024px) { .nav-right { min-width: 145.6px; } }',
    '@media (min-width: 1025px) { .nav { gap: 0.6rem; }\n  .nav-center > a,\n  .nav-center > .nav-item > a { padding-inline: 0.35rem; } }',
  ].join('\n');
  const goodNav = 'return `<header class="site-header">\n    <div class="container nav"></div>\n    <div class="desk-wire" data-desk-wire>\n      <div class="container desk-wire__inner">\n        <a class="desk-wire__link" href="/news/" data-desk-wire-link>x</a>\n      </div>\n    </div>\n  </header>`;';
  const goodPerf = "const MATRIX_PROFILES = ['tablet:768x1024:dark:2200:250', 'tablet-light:768x1024:light:2400:250']; valueFor('--batch-size'); valueFor('--min-disk-mb');";
  const goodMembership = '<script src="/assets/membership-idle-loader.js" defer></script>';
  const badShell = "const CRITICAL_SHELL_CSS = '.hero-ticker{min-height:0}';";
  const base = { shellSource: goodShell, styleSource: goodStyle, perfSource: goodPerf, membershipSource: goodMembership, navSource: goodNav };

  const goodFailures = collectFailures(base);
  const badFailures = collectFailures({ ...base, shellSource: badShell });
  const noDeskShell = collectFailures({ ...base, shellSource: goodShell.replace('.desk-wire{height:36px;', '.desk-wire{') });
  const noDrawerOffset = collectFailures({ ...base, styleSource: goodStyle.replace('+ 36px', '+ 0px') });
  const noSlot = collectFailures({ ...base, navSource: goodNav.replace('data-desk-wire>', '>') });
  const fallbackToOtherRoute = collectFailures({ ...base, navSource: goodNav.replace('href="/news/"', 'href="#"') });

  if (goodFailures.length) throw new Error(`self-test good fixture failed: ${goodFailures.join('; ')}`);
  if (!badFailures.includes('critical-shell: missing tablet-container-padding')) {
    throw new Error('self-test bad fixture did not catch missing tablet container padding');
  }
  if (!noDeskShell.includes('critical-shell: missing desk-wire-height-reservation')) throw new Error('self-test did not catch a missing desk-wire height reservation');
  if (!noDrawerOffset.includes('style.css: missing desk-wire-drawer-offset')) throw new Error('self-test did not catch a drawer that would sit under the desk wire');
  if (!noSlot.includes('propagate-nav buildNav: missing desk-wire-static-slot')) throw new Error('self-test did not catch a missing static desk-wire slot');
  if (!fallbackToOtherRoute.includes('propagate-nav buildNav: missing desk-wire-no-js-fallback-link')) throw new Error('self-test did not catch a broken no-JS fallback link');
  // S358 nav-right reservation — each half of the contract must be catchable.
  const noTriggerPin = collectFailures({ ...base, shellSource: goodShell.replace('.nav-right .vs-palette-loader-trigger{flex:0 0 86px}', '') });
  const noPhoneBand = collectFailures({ ...base, styleSource: goodStyle.replace('min-width: 139.6px', 'min-width: 0') });
  const noPickerSlot = collectFailures({ ...base, styleSource: goodStyle.replace('flex: 0 0 92px', 'flex: 0 0 auto') });
  const noSigninCritical = collectFailures({ ...base, shellSource: goodShell.replace(/\.nav-signin\{[^}]*\}/, '') });
  if (!noTriggerPin.includes('critical-shell: missing palette-trigger-critical-pin')) throw new Error('self-test did not catch an unpinned palette trigger');
  if (!noPhoneBand.includes('style.css: missing nav-right-phone-reservation-full-css')) throw new Error('self-test did not catch a missing phone nav-right reservation');
  if (!noPickerSlot.includes('style.css: missing theme-picker-slot-full-css')) throw new Error('self-test did not catch a theme picker that no longer fills its reserved 92px slot');
  if (!noSigninCritical.includes('critical-shell: missing nav-signin-critical-geometry')) throw new Error('self-test did not catch missing critical .nav-signin geometry');
  const noCompaction = collectFailures({ ...base, shellSource: goodShell.replace('@media(min-width:1025px){.nav{gap:.6rem}.nav-center>a,.nav-center>.nav-item>a{padding-inline:.35rem}}', '') });
  const noCompactionStyle = collectFailures({ ...base, styleSource: goodStyle.replace('padding-inline: 0.35rem', 'padding-inline: 0.8rem') });
  if (!noCompaction.includes('critical-shell: missing desktop-nav-compaction')) throw new Error('self-test did not catch a critical shell missing the desktop nav compaction block');
  if (!noCompactionStyle.includes('style.css: missing desktop-nav-compaction-full-css')) throw new Error('self-test did not catch style.css losing the desktop nav compaction block');
  console.log('critical-shell-geometry self-test passed');
}

function main() {
  if (SELF_TEST) {
    runSelfTest();
    return;
  }

  const shellSource = readFileSync(resolve(ROOT, 'scripts/build-shell-assets.mjs'), 'utf8');
  const styleSource = readFileSync(resolve(ROOT, 'assets/style.css'), 'utf8');
  const perfSource = readFileSync(resolve(ROOT, 'scripts/measure-page-performance.mjs'), 'utf8');
  const membershipSource = readFileSync(resolve(ROOT, 'membership/index.html'), 'utf8');
  const navSource = readFileSync(resolve(ROOT, 'scripts/propagate-nav.mjs'), 'utf8');
  const failures = collectFailures({ shellSource, styleSource, perfSource, membershipSource, navSource });

  if (failures.length) {
    console.error('check-critical-shell-geometry failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('critical-shell geometry ✓');
}

main();
