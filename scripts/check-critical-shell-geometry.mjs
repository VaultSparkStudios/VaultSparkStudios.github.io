#!/usr/bin/env node
// check-critical-shell-geometry.mjs — guards first-paint geometry that prevents
// async stylesheet CLS regressions on desktop/tablet/mobile shells.

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
];

const REQUIRED_STYLE_PATTERNS = [
  {
    id: 'hero-ticker-full-css',
    pattern: /\.hero-ticker\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;[\s\S]*?\}/,
  },
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

function collectFailures({ shellSource, styleSource, perfSource, membershipSource }) {
  const critical = extractCriticalShell(shellSource);
  const failures = [];

  if (!critical) failures.push('critical-shell: CRITICAL_SHELL_CSS not found');
  for (const check of REQUIRED_CRITICAL_PATTERNS) {
    if (!check.pattern.test(critical)) failures.push(`critical-shell: missing ${check.id}`);
  }
  for (const check of REQUIRED_STYLE_PATTERNS) {
    if (!check.pattern.test(styleSource)) failures.push(`style.css: missing ${check.id}`);
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
  const goodShell = "const CRITICAL_SHELL_CSS = '@media(max-width:1024px){.nav-center{display:none}.hamburger{display:flex}.nav-right{min-width:0}.nav-right::after{display:none}.nav-right .nav-signin,.nav-right .button.button-sm,.nav-right .nav-icon-link{display:none}}@media(min-width:641px) and (max-width:1024px){.container{padding-left:1.5rem;padding-right:1.5rem}}@media(max-width:768px){.brand small,.brand .brand-suffix{display:none}.brand>span{font-size:.85rem;letter-spacing:-.01em}.brand{gap:.45rem}.brand img{width:32px;height:32px}}.hero-ticker{min-height:44px;display:flex;align-items:center;justify-content:center}.theme-picker{position:relative;flex:0 0 92px}.theme-picker-btn{display:flex;min-width:92px}.forge-letter{opacity:1}';";
  const goodStyle = '.hero-ticker { min-height: 44px; display: flex; align-items: center; justify-content: center; }';
  const goodPerf = "const MATRIX_PROFILES = ['tablet:768x1024:dark:2200:250', 'tablet-light:768x1024:light:2400:250']; valueFor('--batch-size'); valueFor('--min-disk-mb');";
  const goodMembership = '<script src="/assets/membership-idle-loader.js" defer></script>';
  const badShell = "const CRITICAL_SHELL_CSS = '.hero-ticker{min-height:0}';";

  const goodFailures = collectFailures({ shellSource: goodShell, styleSource: goodStyle, perfSource: goodPerf, membershipSource: goodMembership });
  const badFailures = collectFailures({ shellSource: badShell, styleSource: goodStyle, perfSource: goodPerf, membershipSource: goodMembership });

  if (goodFailures.length) throw new Error(`self-test good fixture failed: ${goodFailures.join('; ')}`);
  if (!badFailures.includes('critical-shell: missing tablet-container-padding')) {
    throw new Error('self-test bad fixture did not catch missing tablet container padding');
  }
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
  const failures = collectFailures({ shellSource, styleSource, perfSource, membershipSource });

  if (failures.length) {
    console.error('check-critical-shell-geometry failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('critical-shell geometry ✓');
}

main();
