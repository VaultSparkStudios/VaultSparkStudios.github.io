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
import { createHash } from 'node:crypto';
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
  { id: 'desktop-nav-compaction', pattern: /@media\(min-width:1025px\)\{\.nav\{gap:\.6rem\}\.nav-center\{gap:\.1rem\}\.nav-right\{gap:\.35rem\}\.nav-center>a,\.nav-center>\.nav-item>a\{padding-inline:\.2rem\}\}/ },
  { id: 'desktop-brand-fit', pattern: /@media\(min-width:1025px\) and \(max-width:1366px\)\{\.brand small,\.brand \.brand-suffix\{display:none\}\}/ },
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
  { id: 'desktop-nav-compaction-full-css', pattern: /@media \(min-width: 1025px\)\s*\{\s*\.nav \{ gap: 0\.6rem; \}\s*\.nav-center \{ gap: 0\.1rem; \}\s*\.nav-right \{ gap: 0\.35rem; \}\s*\.nav-center > a,\s*\.nav-center > \.nav-item > a \{ padding-inline: 0\.2rem; \}/ },
  { id: 'desktop-brand-fit-full-css', pattern: /@media \(min-width: 1025px\) and \(max-width: 1366px\)\s*\{\s*\.brand small, \.brand \.brand-suffix \{ display: none; \}\s*\}/ },
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

// Shell filenames are accepted only through the producer's manifest identity.
// The loader embeds the fingerprinted interview path, so compare its actual
// bytes with the normalized source plus that one verified child substitution.
function membershipFailures(membershipSource, shellManifest, readAsset) {
  const failures = [];
  const rawLoader = 'assets/membership-idle-loader.js';
  const scripts = [...membershipSource.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/script>/g)];
  const loaders = scripts.filter((match) => match[1].startsWith('/assets/membership-idle-loader'));
  let expectedPath = rawLoader;
  if (loaders.some((match) => match[1] !== '/' + rawLoader)) {
    try {
      const verifyEntry = (key, source, expectedText = null) => {
        const entry = shellManifest?.assets?.[key];
        if (!entry || entry.source !== source || !/^[a-f0-9]{10}$/.test(entry.hash || '')
            || entry.path !== source.slice(0, -3) + '.shell-' + entry.hash + '.js') {
          throw new Error('invalid shell mapping');
        }
        const bytes = Buffer.from(readAsset(entry.path));
        if (createHash('sha256').update(bytes).digest('hex').slice(0, 10) !== entry.hash) {
          throw new Error('stale shell hash');
        }
        const expected = expectedText ?? Buffer.from(readAsset(source)).toString('utf8').replace(/\r\n/g, '\n');
        if (!bytes.equals(Buffer.from(expected, 'utf8'))) throw new Error('shell bytes differ from source');
        return entry;
      };
      const child = verifyEntry('membershipInterview', 'assets/membership-interview.js');
      const expectedLoader = Buffer.from(readAsset(rawLoader)).toString('utf8').replace(/\r\n/g, '\n')
        .replace(/\/assets\/membership-interview(?:\.shell-[a-f0-9]{10})?\.js(?:\?[^'"]*)?/g, '/' + child.path);
      expectedPath = verifyEntry('membershipIdleLoader', rawLoader, expectedLoader).path;
    } catch {
      failures.push('membership/index.html: invalid membership-idle-loader-manifest');
      expectedPath = null;
    }
  }
  if (loaders.length !== 1 || !expectedPath
      || loaders[0][0] !== '<script src="/' + expectedPath + '" defer></script>') {
    failures.push('membership/index.html: missing membership-idle-loader-script');
  }
  // Direct rank scripts defeat idle loading, regardless of defer/attribute order.
  if (scripts.some((match) => /^\/assets\/rank-projector(?:\.shell-[a-f0-9]{10})?\.js(?:[?#].*)?$/.test(match[1]))) {
    failures.push('membership/index.html: unexpected membership-no-eager-rank-projector');
  }
  return failures;
}

function extractCriticalShell(source) {
  const match = source.match(/const CRITICAL_SHELL_CSS = '([\s\S]*?)';/);
  const brand = source.match(/const DESKTOP_BRAND_CSS = '([^']*)';/);
  const consumesBrand = /const RESPONSIVE_CRITICAL_SHELL_CSS = \(CRITICAL_SHELL_CSS \+ RANK_THEME_CSS \+ DESKTOP_BRAND_CSS\)/.test(source);
  return match ? (match[1] + (brand && consumesBrand ? brand[1] : ''))
    .replace('.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0}', '.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0;min-height:44px}')
    .replace('.hamburger{display:none}', '.hamburger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;border:0;background:transparent;padding:0}')
    .replace('.hero-ticker{min-height:42px;', '.hero-ticker{min-height:44px;')
    .replace('@media(max-width:980px){.nav-center', '@media(max-width:1024px){.nav-center')
    .replace('@media(min-width:641px) and (max-width:980px){.container', '@media(min-width:641px) and (max-width:1024px){.container') : '';
}

function collectFailures({ shellSource, styleSource, perfSource, membershipSource, navSource, shellManifest, readAsset }) {
  const critical = extractCriticalShell(shellSource);
  const failures = [];

  if (!critical) failures.push('critical-shell: CRITICAL_SHELL_CSS not found');
  const consumers = [...shellSource.matchAll(/<style data-vs-critical-shell>\$\{([^}]+)\}<\/style>/g)];
  if (!consumers.length || consumers.some(match => match[1] !== 'RESPONSIVE_CRITICAL_SHELL_CSS')) {
    failures.push('critical-shell: composed CSS not consumed by every style emission');
  }
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
  failures.push(...membershipFailures(membershipSource, shellManifest, readAsset));

  return failures;
}

function runSelfTest() {
  const deskCritical = '.desk-wire{height:36px;overflow:hidden;border-top:1px solid var(--header-border)}.desk-wire__label{flex:0 0 9.5rem;display:inline-flex}.desk-wire__headline{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:430px){.desk-wire{display:none}}';
  const navRightCritical = '.nav-icon-link{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;color:var(--muted);flex-shrink:0}.nav-signin{color:var(--muted);font-size:.88rem;font-weight:600;padding:.44rem .8rem;border-radius:8px;white-space:nowrap}.nav-right .vs-palette-loader-trigger{flex:0 0 86px}@media(max-width:640px){.nav-right{min-width:139.6px}}@media(min-width:641px) and (max-width:720px){.nav-right{min-width:241.2px}}@media(min-width:721px) and (max-width:1024px){.nav-right{min-width:145.6px}}@media(min-width:1025px){.nav{gap:.6rem}.nav-center{gap:.1rem}.nav-right{gap:.35rem}.nav-center>a,.nav-center>.nav-item>a{padding-inline:.2rem}}@media(min-width:1025px) and (max-width:1366px){.brand small,.brand .brand-suffix{display:none}}';
  const goodShell = "const CRITICAL_SHELL_CSS = '@media(max-width:1024px){.nav-center{display:none}.hamburger{display:flex}.nav-right{min-width:0}.nav-right::after{display:none}.nav-right .nav-signin,.nav-right .button.button-sm,.nav-right .nav-icon-link{display:none}}@media(min-width:641px) and (max-width:1024px){.container{padding-left:1.5rem;padding-right:1.5rem}}@media(max-width:768px){.brand small,.brand .brand-suffix{display:none}.brand>span{font-size:.85rem;letter-spacing:-.01em}.brand{gap:.45rem}.brand img{width:32px;height:32px}}.hero-ticker{min-height:44px;display:flex;align-items:center;justify-content:center}.theme-picker{position:relative;flex:0 0 92px}.theme-picker-btn{display:flex;min-width:92px}.forge-letter{opacity:1}" + deskCritical + navRightCritical + "';\nconst emitted = `<style data-vs-critical-shell>${RESPONSIVE_CRITICAL_SHELL_CSS}</style>`;";
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
    '@media (min-width: 1025px) { .nav { gap: 0.6rem; } .nav-center { gap: 0.1rem; } .nav-right { gap: 0.35rem; }\n  .nav-center > a,\n  .nav-center > .nav-item > a { padding-inline: 0.2rem; } }',
    '@media (min-width: 1025px) and (max-width: 1366px) { .brand small, .brand .brand-suffix { display: none; } }',
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
  const noCompaction = collectFailures({ ...base, shellSource: goodShell.replace('@media(min-width:1025px){.nav{gap:.6rem}.nav-center{gap:.1rem}.nav-right{gap:.35rem}.nav-center>a,.nav-center>.nav-item>a{padding-inline:.2rem}}', '') });
  const noCompactionStyle = collectFailures({ ...base, styleSource: goodStyle.replace('padding-inline: 0.2rem', 'padding-inline: 0.8rem') });
  if (!noCompaction.includes('critical-shell: missing desktop-nav-compaction')) throw new Error('self-test did not catch a critical shell missing the desktop nav compaction block');
  if (!noCompactionStyle.includes('style.css: missing desktop-nav-compaction-full-css')) throw new Error('self-test did not catch style.css losing the desktop nav compaction block');
  const noDesktopBrand = collectFailures({ ...base, shellSource: goodShell.replace('@media(min-width:1025px) and (max-width:1366px){.brand small,.brand .brand-suffix{display:none}}', '') });
  const noDesktopBrandStyle = collectFailures({ ...base, styleSource: goodStyle.replace('.brand small, .brand .brand-suffix { display: none; }', '.brand .brand-suffix { display: inline; }') });
  if (!noDesktopBrand.includes('critical-shell: missing desktop-brand-fit')) throw new Error('self-test did not catch missing critical desktop brand fit');
  if (!noDesktopBrandStyle.includes('style.css: missing desktop-brand-fit-full-css')) throw new Error('self-test did not catch missing full stylesheet desktop brand fit');
  const brandRule = '@media(min-width:1025px) and (max-width:1366px){.brand small,.brand .brand-suffix{display:none}}';
  const composedBrandShell = goodShell.replace(brandRule, '') + "\nconst DESKTOP_BRAND_CSS = '" + brandRule + "';\nconst RESPONSIVE_CRITICAL_SHELL_CSS = (CRITICAL_SHELL_CSS + RANK_THEME_CSS + DESKTOP_BRAND_CSS)";
  if (collectFailures({ ...base, shellSource: composedBrandShell }).length) throw new Error('self-test rejected consumed desktop brand CSS');
  const unusedBrand = collectFailures({ ...base, shellSource: composedBrandShell.replace(' + DESKTOP_BRAND_CSS)', ')') });
  if (!unusedBrand.includes('critical-shell: missing desktop-brand-fit')) throw new Error('self-test accepted unconsumed desktop brand CSS');
  const noCaption = collectFailures({ ...base, shellSource: goodShell.replace(brandRule, brandRule.replace('.brand small,', '')) });
  const noSuffix = collectFailures({ ...base, shellSource: goodShell.replace(brandRule, brandRule.replace(',.brand .brand-suffix', '')) });
  if (!noCaption.includes('critical-shell: missing desktop-brand-fit') || !noSuffix.includes('critical-shell: missing desktop-brand-fit')) throw new Error('self-test accepted a partial compact brand rule');
  const baseOnlyEmission = collectFailures({ ...base, shellSource: goodShell.replaceAll('${RESPONSIVE_CRITICAL_SHELL_CSS}', '${CRITICAL_SHELL_CSS}') });
  if (!baseOnlyEmission.includes('critical-shell: composed CSS not consumed by every style emission')) throw new Error('self-test accepted base-only HTML style emission');
  // Use producer-shaped fixtures; arbitrary fingerprint-looking URLs must fail.
  const childSource = 'window.interviewFixture = true;\n';
  const loaderSource = "load('/assets/membership-interview.js');\n";
  const shortHash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 10);
  const childHash = shortHash(childSource);
  const childPath = 'assets/membership-interview.shell-' + childHash + '.js';
  const loaderBytes = loaderSource.replace('/assets/membership-interview.js', '/' + childPath);
  const loaderHash = shortHash(loaderBytes);
  const loaderPath = 'assets/membership-idle-loader.shell-' + loaderHash + '.js';
  const fixtureManifest = { assets: {
    membershipInterview: { source: 'assets/membership-interview.js', path: childPath, hash: childHash },
    membershipIdleLoader: { source: 'assets/membership-idle-loader.js', path: loaderPath, hash: loaderHash },
  } };
  const fixtureFiles = new Map([
    ['assets/membership-interview.js', childSource], [childPath, childSource],
    ['assets/membership-idle-loader.js', loaderSource], [loaderPath, loaderBytes],
  ]);
  const fixtureRead = (file) => {
    if (!fixtureFiles.has(file)) throw new Error('missing fixture asset');
    return Buffer.from(fixtureFiles.get(file));
  };
  const hashedTag = '<script src="/' + loaderPath + '" defer></script>';
  const hashed = { ...base, membershipSource: hashedTag, shellManifest: fixtureManifest, readAsset: fixtureRead };
  const checks = [
    ['valid manifest-resolved alias', collectFailures(hashed).length === 0],
    ['missing manifest', collectFailures({ ...hashed, shellManifest: null }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['malformed manifest entry', collectFailures({ ...hashed, shellManifest: { assets: { ...fixtureManifest.assets, membershipIdleLoader: { ...fixtureManifest.assets.membershipIdleLoader, hash: 'not-a-hash' } } } }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['unknown alias', collectFailures({ ...hashed, membershipSource: hashedTag.replace(loaderHash, '0000000000') }).some((x) => x.includes('missing membership-idle-loader-script'))],
    ['missing alias bytes', collectFailures({ ...hashed, readAsset: (file) => { if (file === loaderPath) throw new Error('missing'); return fixtureRead(file); } }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['stale alias bytes', collectFailures({ ...hashed, readAsset: (file) => file === loaderPath ? Buffer.from(loaderBytes + '// stale') : fixtureRead(file) }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['wrong source mapping', collectFailures({ ...hashed, shellManifest: { assets: { ...fixtureManifest.assets, membershipIdleLoader: { ...fixtureManifest.assets.membershipIdleLoader, source: 'assets/other.js' } } } }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['wrong path mapping', collectFailures({ ...hashed, shellManifest: { assets: { ...fixtureManifest.assets, membershipIdleLoader: { ...fixtureManifest.assets.membershipIdleLoader, path: '../' + loaderPath } } } }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['changed raw source', collectFailures({ ...hashed, readAsset: (file) => file === 'assets/membership-idle-loader.js' ? Buffer.from(loaderSource + '// changed') : fixtureRead(file) }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['stale child bytes', collectFailures({ ...hashed, readAsset: (file) => file === childPath ? Buffer.from(childSource + '// stale') : fixtureRead(file) }).some((x) => x.includes('invalid membership-idle-loader-manifest'))],
    ['missing defer', collectFailures({ ...hashed, membershipSource: hashedTag.replace(' defer', '') }).some((x) => x.includes('missing membership-idle-loader-script'))],
    ['async instead of defer', collectFailures({ ...hashed, membershipSource: hashedTag.replace(' defer', ' async') }).some((x) => x.includes('missing membership-idle-loader-script'))],
    ['missing loader', collectFailures({ ...hashed, membershipSource: '' }).some((x) => x.includes('missing membership-idle-loader-script'))],
    ['duplicate loader', collectFailures({ ...hashed, membershipSource: hashedTag + hashedTag }).some((x) => x.includes('missing membership-idle-loader-script'))],
    ['eager raw rank', collectFailures({ ...hashed, membershipSource: hashedTag + '<script src="/assets/rank-projector.js" defer></script>' }).some((x) => x.includes('unexpected membership-no-eager-rank-projector'))],
    ['eager rank without defer', collectFailures({ ...hashed, membershipSource: hashedTag + '<script src="/assets/rank-projector.js"></script>' }).some((x) => x.includes('unexpected membership-no-eager-rank-projector'))],
    ['eager hashed rank', collectFailures({ ...hashed, membershipSource: hashedTag + '<script src="/assets/rank-projector.shell-aaaaaaaaaa.js" defer></script>' }).some((x) => x.includes('unexpected membership-no-eager-rank-projector'))],
  ];
  for (const [name, ok] of checks) if (!ok) throw new Error('self-test membership alias: ' + name);
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
  let shellManifest = null;
  try { shellManifest = JSON.parse(readFileSync(resolve(ROOT, 'assets/shell-manifest.json'), 'utf8')); } catch { /* alias validation fails closed */ }
  const readAsset = (relative) => readFileSync(resolve(ROOT, relative));
  const failures = collectFailures({ shellSource, styleSource, perfSource, membershipSource, navSource, shellManifest, readAsset });

  if (failures.length) {
    console.error('check-critical-shell-geometry failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('critical-shell geometry ✓');
}

main();
