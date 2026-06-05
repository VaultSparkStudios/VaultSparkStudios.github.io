#!/usr/bin/env node
/**
 * check-deploy-parity.mjs
 *
 * Compares the shell asset fingerprints in a deployed HTML page against the
 * local assets/shell-manifest.json. Use this before treating live perf traces as
 * post-deploy evidence.
 *
 * Usage:
 *   node scripts/check-deploy-parity.mjs --local
 *   node scripts/check-deploy-parity.mjs --base=https://vaultsparkstudios.com/
 *   node scripts/check-deploy-parity.mjs --self-test
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const LOCAL = args.includes('--local') || (!valueFor('--base') && !SELF_TEST);
const base = valueFor('--base');
const route = valueFor('--route') || '/';

function valueFor(flag) {
  const item = args.find((arg) => arg.startsWith(`${flag}=`));
  if (item) return item.slice(flag.length + 1);
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : null;
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'shell-manifest.json'), 'utf8'));
}

function expectedShellPaths(manifest) {
  return Object.values(manifest.assets || {})
    .map((asset) => asset.path)
    .filter(Boolean)
    .sort();
}

function deployedShellPaths(html) {
  const paths = new Set();
  const re = /(?:src|href)=["']([^"']*assets\/(?:style|theme-toggle|nav-toggle|shell-health|ambient|ambient-core|ambient-feature)\.shell-[a-f0-9]{10}\.(?:css|js))["']/gi;
  let match;
  while ((match = re.exec(html))) {
    const url = match[1];
    const idx = url.indexOf('assets/');
    if (idx >= 0) paths.add(url.slice(idx).replace(/\\/g, '/'));
  }
  return [...paths].sort();
}

function diffShellPaths(expected, actual) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return {
    missing: expected.filter((item) => !actualSet.has(item)),
    unexpected: actual.filter((item) => !expectedSet.has(item)),
  };
}

function localHtmlForRoute(routePath) {
  if (routePath === '/' || routePath === '') return path.join(ROOT, 'index.html');
  const clean = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const dirIndex = path.join(ROOT, clean, 'index.html');
  if (fs.existsSync(dirIndex)) return dirIndex;
  return path.join(ROOT, `${clean}.html`);
}

async function readHtml() {
  if (LOCAL) {
    const htmlPath = localHtmlForRoute(route);
    return {
      source: path.relative(ROOT, htmlPath),
      html: fs.readFileSync(htmlPath, 'utf8'),
    };
  }

  const url = new URL(route, base).toString();
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'VaultSpark deploy parity checker',
    },
  });
  return {
    source: url,
    status: response.status,
    html: await response.text(),
  };
}

async function run() {
  const manifest = loadManifest();
  const expected = expectedShellPaths(manifest);
  const { source, status, html } = await readHtml();
  const actual = deployedShellPaths(html);
  const diff = diffShellPaths(expected, actual);
  const ok = diff.missing.length === 0 && diff.unexpected.length === 0;

  const report = {
    ok,
    source,
    status: status || 200,
    manifestVersion: manifest.version,
    expected,
    actual,
    missing: diff.missing,
    unexpected: diff.unexpected,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

function selfTest() {
  const manifest = {
    assets: {
      style: { path: 'assets/style.shell-aaaaaaaaaa.css' },
      themeToggle: { path: 'assets/theme-toggle.shell-bbbbbbbbbb.js' },
      navToggle: { path: 'assets/nav-toggle.shell-cccccccccc.js' },
      shellHealth: { path: 'assets/shell-health.shell-dddddddddd.js' },
      ambient: { path: 'assets/ambient.shell-eeeeeeeeee.js' },
    },
  };
  const expected = expectedShellPaths(manifest);
  const goodHtml = expected.map((p) => `<script src="/${p}"></script>`).join('\n').replace('style.shell-aaaaaaaaaa.css"></script>', 'style.shell-aaaaaaaaaa.css" rel="stylesheet">');
  const badHtml = goodHtml.replace('assets/ambient.shell-eeeeeeeeee.js', 'assets/ambient.shell-ffffffffbb.js');
  const good = diffShellPaths(expected, deployedShellPaths(goodHtml));
  const bad = diffShellPaths(expected, deployedShellPaths(badHtml));

  if (good.missing.length || good.unexpected.length) {
    throw new Error(`good fixture failed: ${JSON.stringify(good)}`);
  }
  if (!bad.missing.includes('assets/ambient.shell-eeeeeeeeee.js') || !bad.unexpected.includes('assets/ambient.shell-ffffffffbb.js')) {
    throw new Error(`bad fixture did not catch drift: ${JSON.stringify(bad)}`);
  }
  console.log('check-deploy-parity self-test passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  run().catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
}
