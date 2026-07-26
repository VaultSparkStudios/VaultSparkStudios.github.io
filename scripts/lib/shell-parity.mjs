/**
 * Route-local fingerprinted-shell parity primitives.
 *
 * A shell manifest is a site-wide inventory, not a promise that every route
 * loads every asset. Parity therefore compares the shell paths in one local
 * route to the paths served by that same route. The parser deliberately
 * accepts every fingerprinted shell family instead of maintaining an
 * allowlist that silently misses new bundles.
 */

const SHELL_PATH_RE = /(?:^|["'(=\s/])((?:\.\.\/|\.\/|\/)?assets\/[a-z0-9-]+\.shell-[a-f0-9]{10}\.(?:css|js))(?=["')?&\s#]|$)/gi;

export function normalizeShellPath(value) {
  const path = String(value || '').replace(/\\/g, '/');
  const marker = path.indexOf('assets/');
  return marker >= 0 ? path.slice(marker) : path.replace(/^\/+/, '');
}

export function shellPaths(html) {
  const paths = new Set();
  for (const match of String(html || '').matchAll(SHELL_PATH_RE)) {
    paths.add(normalizeShellPath(match[1]));
  }
  return [...paths].sort();
}

export function diffShellPaths(expected = [], actual = []) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    missing: expected.filter((item) => !actualSet.has(item)),
    unexpected: actual.filter((item) => !expectedSet.has(item)),
  };
}

export function compareShellHtml(expectedHtml, actualHtml) {
  const expected = shellPaths(expectedHtml);
  const actual = shellPaths(actualHtml);
  const { missing, unexpected } = diffShellPaths(expected, actual);
  return {
    ok: missing.length === 0 && unexpected.length === 0,
    expected,
    actual,
    missing,
    unexpected,
  };
}

export function selfTestShellParity() {
  const local = [
    '<link href="/assets/style.shell-aaaaaaaaaa.css">',
    '<script src="/assets/nav-sheet.shell-bbbbbbbbbb.js"></script>',
    '<script src="../assets/home-idle-loader.shell-cccccccccc.js"></script>',
    '<script src="/assets/sentry-init.shell-dddddddddd.js?build=1"></script>',
    '<script src="/assets/supabase-client.shell-eeeeeeeeee.js"></script>',
  ].join('\n');
  const sameDifferentOrder = [
    '<script src="assets/supabase-client.shell-eeeeeeeeee.js"></script>',
    '<script src="/assets/home-idle-loader.shell-cccccccccc.js"></script>',
    '<script src="/assets/nav-sheet.shell-bbbbbbbbbb.js"></script>',
    '<link href="/assets/style.shell-aaaaaaaaaa.css">',
    '<script src="/assets/sentry-init.shell-dddddddddd.js"></script>',
  ].join('\n');
  const drifted = sameDifferentOrder
    .replace('nav-sheet.shell-bbbbbbbbbb.js', 'nav-sheet.shell-ffffffff00.js')
    .replace('<script src="/assets/sentry-init.shell-dddddddddd.js"></script>', '');
  const same = compareShellHtml(local, sameDifferentOrder);
  const drift = compareShellHtml(local, drifted);
  return [
    ['generic parser sees every live shell family', shellPaths(local).length === 5],
    ['path prefixes, query strings, and order do not create drift', same.ok],
    ['missing route-local shell is detected', drift.missing.includes('assets/sentry-init.shell-dddddddddd.js')],
    ['unexpected fingerprint is detected', drift.unexpected.includes('assets/nav-sheet.shell-ffffffff00.js')],
    ['the replaced fingerprint is also missing', drift.missing.includes('assets/nav-sheet.shell-bbbbbbbbbb.js')],
    ['unfingerprinted assets are outside this contract', shellPaths('<script src="/assets/app.js"></script>').length === 0],
  ];
}
