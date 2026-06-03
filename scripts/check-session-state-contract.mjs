#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

function requireIncludes(label, text, needles) {
  const missing = needles.filter((needle) => !text.includes(needle));
  return missing.map((needle) => `${label} missing ${needle}`);
}

function sourceOrder(bundleSource) {
  const signed = bundleSource.indexOf("'assets/signed-in-state.js'");
  const loader = bundleSource.indexOf("'assets/account-chip-loader.js'");
  if (signed === -1) return 'ambient source list missing signed-in-state.js';
  if (loader === -1) return 'ambient source list missing account-chip-loader.js';
  if (signed > loader) return 'signed-in-state.js must run before account-chip-loader.js';
  return null;
}

export function evaluate(files) {
  const findings = [];
  findings.push(...requireIncludes('signed-in-state.js', files.signedInState, [
    "SUPABASE_REF = 'fjnpzjjyhnpmunfoycrp'",
    'function readPersistedSession()',
    "document.body.setAttribute('data-vs-signed-in'",
    "document.documentElement.setAttribute('data-vs-signed-in'",
    "new CustomEvent('vs:session-ready'",
    'window.VSSignedInState',
    'readPersistedSession: readPersistedSession'
  ]));
  findings.push(...requireIncludes('account-chip-loader.js', files.accountChipLoader, [
    "var SRC = '/assets/account-chip.js'",
    "document.addEventListener('vs:session-ready'",
    'hasPersistedSession()',
    "script[data-vs-account-chip]"
  ]));
  const orderFinding = sourceOrder(files.ambientBuilder);
  if (orderFinding) findings.push(orderFinding);
  return findings;
}

if (SELF_TEST) {
  const good = evaluate({
    signedInState: [
      "SUPABASE_REF = 'fjnpzjjyhnpmunfoycrp'",
      'function readPersistedSession()',
      "document.body.setAttribute('data-vs-signed-in'",
      "document.documentElement.setAttribute('data-vs-signed-in'",
      "new CustomEvent('vs:session-ready'",
      'window.VSSignedInState',
      'readPersistedSession: readPersistedSession'
    ].join('\n'),
    accountChipLoader: [
      "var SRC = '/assets/account-chip.js'",
      "document.addEventListener('vs:session-ready'",
      'hasPersistedSession()',
      "script[data-vs-account-chip]"
    ].join('\n'),
    ambientBuilder: "const AMBIENT_SOURCES = ['assets/signed-in-state.js', 'assets/account-chip-loader.js'];"
  });
  const bad = evaluate({
    signedInState: '',
    accountChipLoader: '',
    ambientBuilder: "const AMBIENT_SOURCES = ['assets/account-chip-loader.js', 'assets/signed-in-state.js'];"
  });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good session contract`);
  console.log(`  ${bad.length >= 10 ? 'ok' : 'fail'} bad session contract`);
  process.exit(good.length === 0 && bad.length >= 10 ? 0 : 1);
}

const files = {
  signedInState: fs.readFileSync(path.join(ROOT, 'assets', 'signed-in-state.js'), 'utf8'),
  accountChipLoader: fs.readFileSync(path.join(ROOT, 'assets', 'account-chip-loader.js'), 'utf8'),
  ambientBuilder: fs.readFileSync(path.join(ROOT, 'scripts', 'build-ambient-bundle.mjs'), 'utf8')
};

const findings = evaluate(files);
if (findings.length) {
  console.error('session state contract failed');
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log('session state contract ok');
