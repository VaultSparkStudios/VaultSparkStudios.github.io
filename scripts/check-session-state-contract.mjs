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

function requireExcludes(label, text, needles) {
  const present = needles.filter((needle) => text.includes(needle));
  return present.map((needle) => `${label} must not contain ${needle}`);
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
    "window.fetch('/api/auth/me'",
    'function normalizePublicIdentity(identity)',
    "document.body.setAttribute('data-vs-signed-in'",
    "document.documentElement.setAttribute('data-vs-signed-in'",
    "new CustomEvent('vs:session-ready'",
    'window.VSSignedInState',
    'resolve(null)'
  ]));
  findings.push(...requireExcludes('signed-in-state.js', files.signedInState, [
    'readPersistedSession',
    'auth-token',
    'supabase.auth.token'
  ]));
  findings.push(...requireIncludes('account-chip-loader.js', files.accountChipLoader, [
    "var SRC = '/assets/account-chip.js'",
    "document.addEventListener('vs:session-ready'",
    'hasAuthoritativeSession()',
    "script[data-vs-account-chip]"
  ]));
  findings.push(...requireExcludes('account-chip-loader.js', files.accountChipLoader, [
    'hasPersistedSession',
    'localStorage',
    'auth-token'
  ]));
  const orderFinding = sourceOrder(files.ambientBuilder);
  if (orderFinding) findings.push(orderFinding);
  for (const [name, source] of Object.entries(files.credentialConsumers || {})) {
    if (/sb-[A-Za-z0-9_-]*-auth-token|supabase\.auth\.token|readPersistedSession|hasPersistedSession/.test(source)) {
      findings.push(`${name} reads a legacy browser credential`);
    }
    if (/localStorage\.(?:getItem|setItem)\([^\n)]*(?:auth-token|access_token|refresh_token)/i.test(source)) {
      findings.push(`${name} persists or reads a browser credential`);
    }
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate({
    signedInState: [
      "window.fetch('/api/auth/me'",
      'function normalizePublicIdentity(identity)',
      "document.body.setAttribute('data-vs-signed-in'",
      "document.documentElement.setAttribute('data-vs-signed-in'",
      "new CustomEvent('vs:session-ready'",
      'window.VSSignedInState',
      'resolve(null)'
    ].join('\n'),
    accountChipLoader: [
      "var SRC = '/assets/account-chip.js'",
      "document.addEventListener('vs:session-ready'",
      'hasAuthoritativeSession()',
      "script[data-vs-account-chip]"
    ].join('\n'),
    ambientBuilder: "const AMBIENT_SOURCES = ['assets/signed-in-state.js', 'assets/account-chip-loader.js'];"
    ,credentialConsumers: { 'analytics.js': 'VSSignedInState.getSession()' }
  });
  const legacy = evaluate({
    signedInState: "readPersistedSession auth-token supabase.auth.token",
    accountChipLoader: 'hasPersistedSession localStorage auth-token',
    ambientBuilder: "const AMBIENT_SOURCES = ['assets/account-chip-loader.js', 'assets/signed-in-state.js'];",
    credentialConsumers: { 'analytics.js': 'localStorage.getItem("sb-project-auth-token")' }
  });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good session contract`);
  console.log(`  ${legacy.length >= 12 ? 'ok' : 'fail'} legacy persisted-session contract rejected`);
  process.exit(good.length === 0 && legacy.length >= 12 ? 0 : 1);
}

const files = {
  signedInState: fs.readFileSync(path.join(ROOT, 'assets', 'signed-in-state.js'), 'utf8'),
  accountChipLoader: fs.readFileSync(path.join(ROOT, 'assets', 'account-chip-loader.js'), 'utf8'),
  ambientBuilder: fs.readFileSync(path.join(ROOT, 'scripts', 'build-ambient-bundle.mjs'), 'utf8'),
  credentialConsumers: Object.fromEntries([
    'analytics.js',
    'game-utils.js',
    'intent-state.js',
    'invite-page.js',
    'lib/pre-paint-stage.js',
    'membership-interview.js',
    'push-prompt.js',
    'theme-toggle.js',
    'vault-oracle.js',
    'vault-score.js',
    'vault-cta.js',
    'vault-sdk.js',
  ].map((relative) => [relative, fs.readFileSync(path.join(ROOT, 'assets', relative), 'utf8')]))
};

for (const relative of [
  'games/call-of-doodie/index.html',
  'games/gridiron-gm/index.html',
  'games/franchise-architect/index.html',
  'tests/helpers/vaultAuth.js',
  'tests/signed-in-member-state.spec.js',
]) {
  files.credentialConsumers[relative] = fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

const findings = evaluate(files);
if (findings.length) {
  console.error('session state contract failed');
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log('session state contract ok');
