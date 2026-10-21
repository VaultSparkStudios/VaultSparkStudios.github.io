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
import { compareShellHtml, selfTestShellParity } from './lib/shell-parity.mjs';
import { parseDeployArgv } from './lib/deploy-argv.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
let options;
try {
  options = parseDeployArgv(args, {
    name: 'check-deploy-parity', boolFlags: ['--local', '--self-test'],
    valueFlags: ['--base', '--route'],
    exclusive: [['--local', '--base', '--self-test'], ['--self-test', '--route']],
  });
  // A route always denotes a path on the selected origin, never another host
  // or a filesystem escape. Validate before either local reads or fetch.
  const routeValue = options.values['--route'] || '/';
  if (!routeValue.startsWith('/') || routeValue.startsWith('//') || /[\\?#\s\x00-\x1f]/.test(routeValue)
      || routeValue.split('/').some(part => /^(?:\.|%2e){1,2}$/i.test(part)) || /%2f|%5c/i.test(routeValue)) {
    throw new Error('--route requires an absolute site path without traversal, query or fragment');
  }
  if (options.values['--base']) {
    const url = new URL(options.values['--base']);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error('--base requires an HTTP(S) origin without credentials, path, query or fragment');
    }
  }
} catch (error) {
  console.error(`check-deploy-parity: ${error.message}`);
  process.exit(2);
}
if (options.help || options.dry) {
  console.log('Usage: check-deploy-parity.mjs [--local | --base <HTTP(S) origin> | --self-test] [--route /path/]\nHelp/preview: no files read and no network requests.');
  process.exit(0);
}
const SELF_TEST = options.flags.has('--self-test');
const base = options.values['--base'];
const LOCAL = !base;
const route = options.values['--route'] || '/';

function loadManifest() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'shell-manifest.json'), 'utf8'));
}

function localHtmlForRoute(routePath) {
  if (routePath === '/' || routePath === '') return path.join(ROOT, 'index.html');
  const clean = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const dirIndex = path.join(ROOT, clean, 'index.html');
  if (fs.existsSync(dirIndex)) return dirIndex;
  return path.join(ROOT, `${clean}.html`);
}

function readExpectedHtml() {
  const htmlPath = localHtmlForRoute(route);
  return {
    source: path.relative(ROOT, htmlPath).replace(/\\/g, '/'),
    html: fs.readFileSync(htmlPath, 'utf8'),
  };
}

async function readObservedHtml() {
  if (LOCAL) {
    return readExpectedHtml();
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

export function buildParityReport({ expectedSource, expectedHtml, source, status = 200, html, manifestVersion = null }) {
  const parity = compareShellHtml(expectedHtml, html);
  const responseOk = Number.isInteger(status) && status >= 200 && status < 300;
  const expectedShellPresent = parity.expected.length > 0;
  return {
    ...parity,
    ok: responseOk && expectedShellPresent && parity.ok,
    responseOk,
    expectedShellPresent,
    expectedSource,
    source,
    status,
    manifestVersion,
  };
}

async function run() {
  const manifest = loadManifest();
  const expected = readExpectedHtml();
  const observed = await readObservedHtml();
  const report = buildParityReport({
    expectedSource: expected.source,
    expectedHtml: expected.html,
    source: observed.source,
    status: observed.status ?? 200,
    html: observed.html,
    manifestVersion: manifest.version,
  });

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

function selfTest() {
  const cases = selfTestShellParity();
  const local = '<script src="/assets/nav-sheet.shell-aaaaaaaaaa.js"></script>';
  const report = buildParityReport({ expectedSource: 'index.html', expectedHtml: local, source: 'index.html', html: local, manifestVersion: 'fixture' });
  cases.push(['local sanity compares route source to itself', report.ok && report.expectedSource === report.source]);
  for (const status of [0, 301, 404, 429, 500, 503]) {
    const error = buildParityReport({ expectedHtml: local, html: local, status });
    cases.push([`matching shell cannot accept HTTP ${status}`, !error.ok && !error.responseOk && error.missing.length === 0]);
  }
  cases.push(['empty expected shell cannot prove parity', !buildParityReport({ expectedHtml: '', html: '' }).ok]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) throw new Error(`${failed.length} shell parity fixture(s) failed`);
  console.log(`check-deploy-parity self-test: ${cases.length}/${cases.length} passed`);
}

if (SELF_TEST) {
  selfTest();
} else {
  run().catch((error) => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  });
}
