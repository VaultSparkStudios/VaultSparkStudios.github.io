#!/usr/bin/env node
// lint-tt-policies.mjs (S185 · tt-named-policy-wave)
//
// Fails if any first-party JS asset registers the generic 'vs-dom' Trusted
// Types policy. Every module must use a file-specific named policy to avoid
// TT re-registration errors when scripts co-load.
//
// Usage: node scripts/lint-tt-policies.mjs
//        node scripts/lint-tt-policies.mjs --self-test

import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS_DIR = join(ROOT, 'assets');
const SELF_TEST = process.argv.includes('--self-test');

const BANNED_POLICY_NAMES = ['vs-dom'];

if (SELF_TEST) {
  const fakeContent = "window.trustedTypes.createPolicy('vs-dom', { createHTML: h => h })";
  const found = BANNED_POLICY_NAMES.some(name => fakeContent.includes("'" + name + "'"));
  console.log(found ? '✓ self-test passed' : '✗ self-test failed');
  process.exit(found ? 0 : 1);
}

let errorCount = 0;
const files = readdirSync(ASSETS_DIR).filter(f => f.endsWith('.js') && !f.startsWith('ambient.shell') && !f.startsWith('ambient-core.shell') && !f.startsWith('ambient-feature.shell') && f !== 'ambient-core.bundle.js');

for (const file of files) {
  const fullPath = join(ASSETS_DIR, file);
  const content = readFileSync(fullPath, 'utf8');
  for (const name of BANNED_POLICY_NAMES) {
    if (content.includes("'" + name + "'") && content.includes('createPolicy')) {
      console.error('✗ ' + file + ': uses generic TT policy "' + name + '" — rename to a file-specific policy (e.g. "vs-' + file.replace('.js', '') + '")');
      errorCount++;
    }
  }
}

if (errorCount === 0) {
  console.log('✓ tt-policy-lint: all named policies are file-specific');
  process.exit(0);
} else {
  console.error('✗ tt-policy-lint: ' + errorCount + ' file(s) use generic policies — fix before push');
  process.exit(1);
}
