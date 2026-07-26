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
  return {
    ...compareShellHtml(expectedHtml, html),
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
    status: observed.status || 200,
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
