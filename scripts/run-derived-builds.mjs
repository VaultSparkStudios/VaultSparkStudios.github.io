#!/usr/bin/env node
import { runDerivedBuilds } from './lib/build-order.mjs';

const profileArg = process.argv.find((arg) => arg.startsWith('--profile='));
const profileIndex = process.argv.indexOf('--profile');
const profile = profileArg ? profileArg.slice('--profile='.length) : (profileIndex >= 0 ? process.argv[profileIndex + 1] : 'full');
const dry = process.argv.includes('--dry-run');
const results = runDerivedBuilds({ root: process.cwd(), profile, dry });
const failed = results.filter((result) => result.status === 'warn' || result.status === 'missing');
if (failed.length) {
  console.error('run-derived-builds: ' + profile + ' failed: ' + failed.map((result) => result.script + ':' + result.status).join(', '));
  process.exit(1);
}
console.log('run-derived-builds: ' + profile + ' passed · ' + results.length + ' steps');
