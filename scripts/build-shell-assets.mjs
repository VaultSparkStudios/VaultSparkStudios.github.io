import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkMode = process.argv.includes('--check');

const SHELL_ASSETS = [
  { key: 'style', source: 'assets/style.css', stem: 'style.shell', attribute: 'href' },
  { key: 'themeToggle', source: 'assets/theme-toggle.js', stem: 'theme-toggle.shell', attribute: 'src' },
  { key: 'navToggle', source: 'assets/nav-toggle.js', stem: 'nav-toggle.shell', attribute: 'src' },
  { key: 'shellHealth', source: 'assets/shell-health.js', stem: 'shell-health.shell', attribute: 'src' },
  { key: 'navSheet', source: 'assets/nav-sheet.js', stem: 'nav-sheet.shell', attribute: 'src' },
  // Authentication semantics are release-critical. Fingerprinting prevents a
  // week-old portal bridge from surviving an identity-plane deployment in a
  // browser or Worker asset cache.
  { key: 'supabaseClient', source: 'assets/supabase-client.js', stem: 'supabase-client.shell', attribute: 'src' },
  { key: 'sentryInit', source: 'assets/sentry-init.js', stem: 'sentry-init.shell', attribute: 'src' },
  { key: 'homeIdleLoader', source: 'assets/home-idle-loader.js', stem: 'home-idle-loader.shell', attribute: 'src' },
  // S136 speed sprint: ambient scripts concatenated into hashed bundles.
  // S175 stable-core split: core (rarely changes - hash survives feature
  // sessions, visitors keep their cached copy) + feature (small, rotates
  // freely). Both defer -> execution order preserved (core first).
  { key: 'ambientCore', source: 'assets/ambient-core.bundle.js', stem: 'ambient-core.shell', attribute: 'src' },
  { key: 'ambientFeature', source: 'assets/ambient-feature.bundle.js', stem: 'ambient-feature.shell', attribute: 'src' },
  // S304: /proof verifier — content-addressed so the page + exact script bytes
  // can ride the content lane together (the hotfix gate's executable exception
  // is precisely hash-named shell assets).
  { key: 'proofVerify', source: 'assets/proof-verify.js', stem: 'proof-verify.shell', attribute: 'src' },
  // S310: The Desk's reader reactions. Same reason as proofVerify — a plain
  // assets/desk-reactions.js is withheld by the content lane (only hash-named
  // shell assets are promotable), and the reference resolver then correctly
  // refuses to publish story pages that would point at a 404. Content-addressing
  // is what lets the pages and their script ship in the same lane.
  { key: 'deskReactions', source: 'assets/desk-reactions.js', stem: 'desk-reactions.shell', attribute: 'src' },
  { key: 'deskPresence', source: 'assets/desk-presence.js', stem: 'desk-presence.shell', attribute: 'src' },
  { key: 'statsSurface', source: 'assets/stats-surface.js', stem: 'stats-surface.shell', attribute: 'src' },
  { key: 'ecosystemStats', source: 'assets/ecosystem-stats.js', stem: 'ecosystem-stats.shell', attribute: 'src' },
  { key: 'heroChoiceTracking', source: 'assets/hero-choice-tracking.js', stem: 'hero-choice-tracking.shell', attribute: 'src' },
  // S317: journey-conductor is predicate-loaded from ambient-loader.js, not from
  // an HTML src, so it never had an HTML reference to hash. That left it the one
  // unhashed ambient script the content lane could not promote — and because the
  // full-site lane has been held since S306, it 404'd on EVERY page for weeks
  // (its 38 predicate-loaded siblings all serve fine; they predate the hold).
  // Content-addressing makes it promotable; build-ambient-bundle rewrites the
  // loader's reference to this hashed path at bundle time.
  { key: 'journeyConductor', source: 'assets/journey-conductor.js', stem: 'journey-conductor.shell', attribute: 'src' },
];

const HTML_SKIP_DIRS = new Set([
  '.ai',
  '.git',
  '.well-known',
  'node_modules',
  'playwright-report',
  'scripts',
  'test-results',
]);
const REDIRECT_STUB_PATHS = new Set(
  JSON.parse(fs.readFileSync(path.join(root, 'config', 'route-consolidation.json'), 'utf8'))
    .redirects
    .map((rule) => rule.from.replace(/^\//, '') + 'index.html')
);

function shortHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readShellAssetContent(filePath) {
  return Buffer.from(fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function writeIfChanged(filePath, next) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function findHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!HTML_SKIP_DIRS.has(entry.name)) {
        findHtmlFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.name.endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function normalizeRelativeUrl(relativePrefix, targetRelPath) {
  if (relativePrefix.startsWith('/')) {
    return `/${targetRelPath.replace(/\\/g, '/')}`;
  }
  return `${relativePrefix}${targetRelPath.replace(/\\/g, '/')}`;
}

const CRITICAL_SHELL_CSS = ':root{--max:1200px;--nav-height:78px;--bg:#07080f;--bg-soft:#0c0e18;--text:#eef2ff;--muted:#a8b4d0;--dim:#6e7fb0;--gold:#ffc400;--page-bg:#07080f;--header-bg:rgba(7,8,16,.90);--header-border:rgba(255,255,255,.05);--radius:24px;--shadow:0 18px 60px rgba(0,0,0,.55);color-scheme:dark}*{box-sizing:border-box}body{margin:0;position:relative;color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--page-bg);line-height:1.55;overflow-x:clip}a{color:inherit;text-decoration:none}.skip-link{position:absolute;top:-100%;left:1rem;z-index:9999}img,video{max-width:100%;display:block}h1,h2,h3,h4,h5,h6{margin:0;line-height:1.1}h1,h2{font-family:Georgia,"Times New Roman",serif;letter-spacing:0}p{margin:0}.container{width:min(calc(100% - 2rem),var(--max));margin:0 auto}.site-header{position:sticky;top:0;z-index:100;border-bottom:1px solid var(--header-border);background:var(--header-bg)}.nav{min-height:var(--nav-height);display:flex;align-items:center;justify-content:space-between;gap:1rem}.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0}.brand img{width:44px;height:44px;object-fit:contain}.brand>span{display:block;line-height:1.15;font-size:1rem;white-space:nowrap}.brand small{display:block;color:var(--muted);font-size:.72rem;letter-spacing:.09em;text-transform:uppercase;margin-top:.16rem}.nav-center{display:flex;align-items:center;gap:.15rem;flex:1;justify-content:center}.nav-center a{color:var(--muted);font-size:.91rem;font-weight:500;padding:.44rem .8rem;border-radius:8px;white-space:nowrap}.nav-item{position:relative;display:flex;align-items:center}.nav-item>a{display:flex;align-items:center;gap:.3rem}.nav-dropdown{display:none}.nav-right{display:flex;align-items:center;gap:.6rem;flex-shrink:0;justify-content:flex-end;min-width:292px}.nav-right::after{content:"";display:block;flex:0 0 92px;height:34px;order:20}.nav-right:has(.theme-picker)::after{display:none}.theme-picker{position:relative;flex:0 0 92px}.theme-picker-btn{display:flex;align-items:center;gap:.42rem;padding:.38rem .64rem;min-height:44px;min-width:92px;border-radius:10px;border:1px solid var(--header-border);background:var(--header-bg);color:var(--text);font:600 .8rem/1 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap}.theme-picker-swatch{width:11px;height:11px;border-radius:50%;flex-shrink:0}.theme-picker-label{font-size:.78rem;font-weight:600}.theme-picker-arrow{font-size:.48rem;margin-left:.05rem}.theme-picker-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:228px;opacity:0;visibility:hidden;pointer-events:none}.button,.button-secondary,.button-ghost{display:inline-flex;align-items:center;justify-content:center;gap:.55rem;min-height:48px;padding:0 1.3rem;border-radius:999px;font-weight:700;font-size:.94rem;font-family:inherit;border:1px solid transparent;text-decoration:none;white-space:nowrap}.button-sm{min-height:44px;min-width:44px;padding:0 1rem;font-size:.86rem}.hamburger{display:none}.hero{position:relative;padding:6.5rem 0 4rem;overflow:clip}.hero::before{content:"";position:absolute;inset:0;pointer-events:none}.hero-center{position:relative;z-index:1;text-align:center}.hero-chamber{position:absolute;inset:0;pointer-events:none;z-index:0}.hero-glow{position:absolute;border-radius:50%;pointer-events:none;will-change:transform}.hero-glow.blue{width:45vw;height:45vw;max-width:640px;max-height:640px;left:-10%;top:-20%}.hero-glow.orange{width:40vw;height:40vw;max-width:560px;max-height:560px;right:-8%;top:-10%}.hero-glow.gold{width:30vw;height:30vw;max-width:380px;max-height:380px;left:30%;top:40%}.forge-wordmark{margin:0;font-family:Georgia,"Times New Roman",serif;line-height:1;text-align:center}.forge-line{display:block}.forge-line-1{font-size:clamp(2.6rem,13vw,9rem);font-weight:700;letter-spacing:0}.forge-line-2{font-size:clamp(1.7rem,8.4vw,5.8rem);font-weight:400;letter-spacing:.1em;margin-top:.04em}.forge-letter{opacity:1}.hero-tagline{margin:.65rem 0 0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.45rem,3.2vw,2.6rem);line-height:1.1;letter-spacing:0;font-style:italic}.hero-sub{max-width:54ch;margin:0 auto;color:var(--muted);font-size:1.1rem;line-height:1.68}.hero-ticker{min-height:42px;display:flex;align-items:center;justify-content:center}section{padding:1.6rem 0 4.2rem}@media(max-width:980px){.nav-center{display:none}.hamburger{display:flex}.nav-right{min-width:0}.nav-right::after{display:none}.nav-right .nav-signin,.nav-right .button.button-sm,.nav-right .nav-icon-link{display:none}}@media(min-width:641px) and (max-width:980px){.container{padding-left:1.5rem;padding-right:1.5rem}}@media(max-width:768px){.brand small,.brand .brand-suffix{display:none}.brand>span{font-size:.85rem;letter-spacing:0}.brand{gap:.45rem}.brand img{width:32px;height:32px}}@media(max-width:640px){section{padding:1.4rem 0 3rem}.hero{padding:5rem 0 2.8rem}.theme-picker{display:none}.button:not(.nav-right .button),.button-secondary,.button-ghost{width:100%;justify-content:center}}@media(max-width:430px){.brand>span{font-size:.78rem;letter-spacing:0}.brand img{width:30px;height:30px}}';

const RESPONSIVE_CRITICAL_SHELL_CSS = CRITICAL_SHELL_CSS
  .replace('.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0}', '.brand{display:inline-flex;align-items:center;gap:.85rem;font-weight:700;flex-shrink:0;min-height:44px}')
  .replace('.hamburger{display:none}', '.hamburger{display:none;flex-direction:column;justify-content:center;align-items:center;gap:5px;width:44px;height:44px;border:0;background:transparent;padding:0}')
  .replace('.hero-ticker{min-height:42px;', '.hero-ticker{min-height:44px;')
  .replace('@media(max-width:980px){.nav-center', '@media(max-width:1024px){.nav-center')
  .replace('@media(min-width:641px) and (max-width:980px){.container', '@media(min-width:641px) and (max-width:1024px){.container');

function toAsyncStylesheetBlock(indent, href) {
  return [
    `${indent}<style data-vs-critical-shell>${RESPONSIVE_CRITICAL_SHELL_CSS}</style>`,
    `${indent}<link rel="preload" href="${href}" as="style" data-vs-css-preload />`,
    `${indent}<link rel="stylesheet" href="${href}" media="print" data-vs-async-css />`,
    `${indent}<script>!function(){function a(){var s=document.querySelectorAll('link[data-vs-async-css][media="print"]');for(var i=0;i<s.length;i++)s[i].media='all'}'requestAnimationFrame'in window?requestAnimationFrame(a):setTimeout(a,0)}();</script>`,
    `${indent}<noscript><link rel="stylesheet" href="${href}" /></noscript>`,
  ].join('\n') + '\n';
}

// S275 CLS root-fix: the media=print → rAF swap paints every route BEFORE the
// full stylesheet applies. The homepage carries a fold-complete critical-CSS
// contract (check-home-critical-css-contract) so the swap is safe there; every
// other route only has the generic shell inline, so the swap produced a huge
// post-paint reflow (field CLS p75 0.24–0.64 on /games/ /oracle/ /changelog/
// /studio-pulse/). Content routes now load the stylesheet render-blocking —
// zero CLS by construction; repeat visits hit the SW-precached sheet anyway.
// /status/ carries a route-complete critical shell and is continuously measured
// across desktop/mobile. Keeping it async avoids a network-bound LCP regression
// while the receipt gate protects against any future CLS drift.
const ASYNC_CSS_PAGES = new Set(['index.html', 'status/index.html']);

function toBlockingStylesheetBlock(indent, href) {
  return [
    `${indent}<style data-vs-critical-shell>${RESPONSIVE_CRITICAL_SHELL_CSS}</style>`,
    `${indent}<link rel="stylesheet" href="${href}" />`,
  ].join('\n') + '\n';
}

function normalizeAsyncStylesheet(html, relPath) {
  const useAsync = ASYNC_CSS_PAGES.has((relPath || '').replace(/\\/g, '/'));
  const builder = useAsync ? toAsyncStylesheetBlock : toBlockingStylesheetBlock;
  let next = html.replace(
    /(^[ \t]*)(?:<style\s+data-vs-critical-shell>[\s\S]*?<\/style>\s*)?(?:<link\s+rel=["']preload["']\s+href=["']([^"']*?assets\/style(?:\.shell-[a-f0-9]{10})?\.css)["']\s+as=["']style["'][^>]*>\s*)?<link\s+rel=["']stylesheet["']\s+href=["']([^"']*?assets\/style(?:\.shell-[a-f0-9]{10})?\.css)["'][^>]*>\s*(?:<script>!function\(\)\{[\s\S]*?data-vs-async-css[\s\S]*?<\/script>\s*)?(?:<noscript><link\s+rel=["']stylesheet["']\s+href=["'][^"']*?assets\/style(?:\.shell-[a-f0-9]{10})?\.css["'][^>]*><\/noscript>)?\s*/gm,
    (_match, indent, preloadHref, stylesheetHref) => builder(indent, preloadHref || stylesheetHref)
  );

  // Older generated heads can retain a standalone critical block followed by
  // a theme bootstrap and a noscript-only stylesheet. Normalize the inline
  // bytes unconditionally, then restore a blocking stylesheet for content
  // routes so first paint and runtime never diverge.
  next = next.replace(
    /<style\s+data-vs-critical-shell>[\s\S]*?<\/style>/i,
    `<style data-vs-critical-shell>${RESPONSIVE_CRITICAL_SHELL_CSS}</style>`
  );
  const withoutNoscript = next.replace(/<noscript>[\s\S]*?<\/noscript>/gi, '');
  const hasActiveStylesheet = /<link\s+rel=["']stylesheet["'][^>]+assets\/style(?:\.shell-[a-f0-9]{10})?\.css/i.test(withoutNoscript);
  if (!useAsync && !hasActiveStylesheet) {
    const fallbackHref = next.match(/<noscript><link\s+rel=["']stylesheet["']\s+href=["']([^"']*?assets\/style(?:\.shell-[a-f0-9]{10})?\.css)["'][^>]*><\/noscript>/i)?.[1];
    if (fallbackHref) {
      next = next.replace(
        /(<style\s+data-vs-critical-shell>[\s\S]*?<\/style>)/i,
        `$1\n  <link rel="stylesheet" href="${fallbackHref}" />`
      );
    }
  }
  return next;
}

function normalizeThemeBootstrap(html) {
  // S303: `remove.apply` must be invoked WITH THE DOMTokenList as `this` — the
  // element as `this` throws `Illegal invocation`, the boot's try/catch ate it,
  // and every page silently booted dark until theme-toggle.js repaired it after
  // paint (pages without theme-toggle, like /atlas/, never themed at all).
  const resetThemeClasses = "var r=['dark-mode','light-mode','ambient-mode','warm-mode','cool-mode','lava-mode','high-contrast-mode'];document.documentElement.classList.remove.apply(document.documentElement.classList,r);document.body.classList.remove.apply(document.body.classList,r);";
  let next = html.replace(
    /var t=localStorage\.getItem\('vs_theme'\)(?:\|\|'dark')?,m=\{dark:'dark-mode',light:'light-mode',ambient:'ambient-mode',warm:'warm-mode',cool:'cool-mode',lava:'lava-mode','high-contrast':'high-contrast-mode'\};if\((?:t&&m\[t\]|m\[t\])\)\{(?!(?:var r=\['dark-mode','light-mode','ambient-mode','warm-mode','cool-mode','lava-mode','high-contrast-mode'\];))/g,
    `var t=localStorage.getItem('vs_theme')||'dark',m={dark:'dark-mode',light:'light-mode',ambient:'ambient-mode',warm:'warm-mode',cool:'cool-mode',lava:'lava-mode','high-contrast':'high-contrast-mode'};if(m[t]){${resetThemeClasses}`
  );

  next = next.replace(
    /if\(m\[t\]\)\{(?:var r=\['dark-mode','light-mode','ambient-mode','warm-mode','cool-mode','lava-mode','high-contrast-mode'\];document\.documentElement\.classList\.remove\.apply\(document\.documentElement(?:\.classList)?,r\);document\.body\.classList\.remove\.apply\(document\.body(?:\.classList)?,r\);)+var c=m\[t\];/g,
    `if(m[t]){${resetThemeClasses}var c=m[t];`
  );

  next = next.replace(/<html\b([^>]*)>/i, (_match, attrs) => {
    if (/\bdata-theme=/i.test(attrs)) return `<html${attrs}>`;
    const withClass = /\bclass=["']([^"']*)["']/i.test(attrs)
      ? attrs.replace(/\bclass=["']([^"']*)["']/i, (_classMatch, classes) => {
        const nextClasses = /\bdark-mode\b/.test(classes) ? classes : `${classes} dark-mode`.trim();
        return `class="${nextClasses}"`;
      })
      : `${attrs} class="dark-mode"`;
    return `<html${withClass} data-theme="dark">`;
  });

  next = next.replace(/<body\b([^>]*)>/i, (_match, attrs) => {
    if (/\bdata-theme=/i.test(attrs)) return `<body${attrs}>`;
    const withClass = /\bclass=["']([^"']*)["']/i.test(attrs)
      ? attrs.replace(/\bclass=["']([^"']*)["']/i, (_classMatch, classes) => {
        const nextClasses = /\bdark-mode\b/.test(classes) ? classes : `${classes} dark-mode`.trim();
        return `class="${nextClasses}"`;
      })
      : `${attrs} class="dark-mode"`;
    return `<body${withClass} data-theme="dark">`;
  });

  return next;
}

function updateHtmlReferences(html, manifest, relPath) {
  let next = html;

  for (const asset of SHELL_ASSETS) {
    const source = asset.source.replace(/\\/g, '/');
    const ext = path.extname(source);
    const basename = path.basename(source, ext).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stemBasename = path.basename(asset.stem).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const assetNamePattern = `(?:${basename}(?:\\.shell-[a-f0-9]{10})?|${stemBasename}(?:-[a-f0-9]{10})?)`;
    const pattern = new RegExp(
      `(${asset.attribute}=["'])([^"']*?)assets\\/${assetNamePattern}\\${ext}(?:\\?[^"']*)?(["'])`,
      'g'
    );

    next = next.replace(pattern, (_match, prefix, relativePrefix, suffix) => {
      return `${prefix}${normalizeRelativeUrl(relativePrefix, manifest.assets[asset.key].path)}${suffix}`;
    });
  }

  next = normalizeAsyncStylesheet(next, relPath);
  next = normalizeThemeBootstrap(next);

  // The sheet is a canary-selected alternate navigation surface. Load its
  // fingerprinted source on every public page; it exits immediately when a
  // page has no shared hamburger or the cohort is not selected.
  const navSheetPath = manifest.assets.navSheet.path.replace(/\\/g, '/');
  const navSheetRe = /<script[^>]+assets\/nav-sheet(?:\.shell-[a-f0-9]{10})?\.js[^>]*><\/script>/i;
  if (!navSheetRe.test(next)) {
    next = next.replace(/(\s*)<\/body>/i, `$1<script src="/${navSheetPath}" defer></script>$1</body>`);
  }
  return next;
}

function updateServiceWorker(swSource, manifest) {
  let next = swSource;

  next = next.replace(
    /const CACHE_NAME = '[^']+';/,
    `const CACHE_NAME = '${manifest.cacheName}';`
  );

  for (const asset of SHELL_ASSETS) {
    const source = asset.source.replace(/\\/g, '/');
    const ext = path.extname(source);
    const basename = path.basename(source, ext).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stemBasename = path.basename(asset.stem).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacement = `'/` + manifest.assets[asset.key].path.replace(/\\/g, '/') + `'`;
    const pattern = new RegExp(
      `'/assets/(?:${basename}(?:\\.shell-[a-f0-9]{10})?|${stemBasename}-[a-f0-9]{10})\\${ext}(?:\\?[^']*)?'`,
      'g'
    );
    next = next.replace(pattern, replacement);
  }

  next = next.replace(
    /const FINGERPRINTED_SHELL_ASSETS = \[[\s\S]*?\];/,
    `const FINGERPRINTED_SHELL_ASSETS = [\n${SHELL_ASSETS.map((asset) => `  '/${manifest.assets[asset.key].path.replace(/\\/g, '/')}',`).join('\n')}\n];`
  );

  next = next.replace(
    /const NON_CACHEABLE_SHELL_SOURCES = \[[\s\S]*?\];/,
    `const NON_CACHEABLE_SHELL_SOURCES = [\n${SHELL_ASSETS.map((asset) => `  '/${asset.source.replace(/\\/g, '/')}',`).join('\n')}\n];`
  );

  return next;
}

function cleanupOldFingerprintedFiles(asset, keepBasename) {
  const assetDir = path.join(root, path.dirname(asset.source));
  const ext = path.extname(asset.source);
  const stemPattern = new RegExp(`^${asset.stem.replace('.', '\\.')}\\-[a-f0-9]{10}\\${ext.replace('.', '\\.')}$`);

  for (const entry of fs.readdirSync(assetDir)) {
    if (!stemPattern.test(entry)) continue;
    if (entry === keepBasename) continue;

    fs.unlinkSync(path.join(assetDir, entry));
  }
}

function buildManifest() {
  const assets = {};
  const generatedFiles = [];

  for (const asset of SHELL_ASSETS) {
    const sourcePath = path.join(root, asset.source);
    const content = readShellAssetContent(sourcePath);
    const hash = shortHash(content);
    const ext = path.extname(asset.source);
    const generatedName = `${asset.stem}-${hash}${ext}`;
    const generatedPath = path.join(path.dirname(asset.source), generatedName).replace(/\\/g, '/');

    assets[asset.key] = {
      source: asset.source.replace(/\\/g, '/'),
      path: generatedPath,
      hash,
    };

    generatedFiles.push({
      asset,
      outputPath: path.join(root, generatedPath),
      outputRelPath: generatedPath,
      outputName: generatedName,
      content,
    });
  }

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    version: SHELL_ASSETS.map((asset) => assets[asset.key].hash).join('-'),
    cacheName: `vaultspark-shell-${SHELL_ASSETS.map((asset) => assets[asset.key].hash).join('-')}`,
    assets,
    generatedFiles,
  };
}

function checkFileContent(filePath, expected) {
  if (!fs.existsSync(filePath)) return false;
  const current = fs.readFileSync(filePath, 'utf8');

  try {
    const currentJson = JSON.parse(current);
    const expectedJson = JSON.parse(expected);

    delete currentJson.generatedAt;
    delete expectedJson.generatedAt;

    return JSON.stringify(currentJson) === JSON.stringify(expectedJson);
  } catch {
    return current === expected;
  }
}

function checkBufferContent(filePath, expected) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath).equals(expected);
}

function main() {
  const manifest = buildManifest();
  const manifestOutput = JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    generatedAt: manifest.generatedAt,
    version: manifest.version,
    cacheName: manifest.cacheName,
    assets: manifest.assets,
  }, null, 2) + '\n';

  const htmlFiles = findHtmlFiles(root);
  const swPath = path.join(root, 'sw.js');
  const swNext = updateServiceWorker(read(swPath), manifest);
  const manifestPath = path.join(root, 'assets', 'shell-manifest.json');

  const htmlChanges = [];
  for (const htmlPath of htmlFiles) {
    const relativeHtmlPath = path.relative(root, htmlPath).replace(/\\/g, '/');
    if (REDIRECT_STUB_PATHS.has(relativeHtmlPath)) continue;
    const current = read(htmlPath);
    const next = updateHtmlReferences(current, manifest, relativeHtmlPath);
    if (next !== current) {
      htmlChanges.push({ path: htmlPath, next });
    }
  }

  if (checkMode) {
    const stale = [];

    for (const generated of manifest.generatedFiles) {
      if (!checkBufferContent(generated.outputPath, generated.content)) {
        stale.push(generated.outputRelPath);
      }
    }

    if (!checkFileContent(manifestPath, manifestOutput)) {
      stale.push('assets/shell-manifest.json');
    }

    if (!checkFileContent(swPath, swNext)) {
      stale.push('sw.js');
    }

    for (const htmlChange of htmlChanges) {
      stale.push(path.relative(root, htmlChange.path).replace(/\\/g, '/'));
    }

    if (stale.length) {
      console.error(`Shell asset drift detected:\n${Array.from(new Set(stale)).map((item) => `- ${item}`).join('\n')}`);
      process.exit(1);
    }

    console.log('Shell asset manifest and references are in sync.');
    return;
  }

  for (const generated of manifest.generatedFiles) {
    fs.writeFileSync(generated.outputPath, generated.content);
    cleanupOldFingerprintedFiles(generated.asset, generated.outputName);
  }

  writeIfChanged(manifestPath, manifestOutput);
  writeIfChanged(swPath, swNext);

  for (const htmlChange of htmlChanges) {
    writeIfChanged(htmlChange.path, htmlChange.next);
  }

  console.log(`Generated shell assets (${manifest.version})`);
  manifest.generatedFiles.forEach((generated) => {
    console.log(`- ${generated.outputRelPath}`);
  });
  console.log(`Updated ${htmlChanges.length} HTML files`);
}

main();
