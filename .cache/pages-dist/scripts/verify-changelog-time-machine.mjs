#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function assert(label, condition) {
  if (!condition) failures.push(label);
}

const page = read('changelog/index.html');
const script = read('assets/changelog-time-machine.js');

assert('changelog mounts time machine root', /data-time-machine/.test(page));
assert('changelog loads time machine asset', /\/assets\/changelog-time-machine\.js/.test(page));
assert('time machine reads changelog phases', /querySelectorAll\('\.cl-timeline \.cl-phase'\)/.test(script));
assert('time machine exposes range scrubber', /type="range"/.test(script));
assert('time machine marks active phase', /data-tm-active/.test(script));
assert('time machine scrolls selected phase into view', /scrollIntoView/.test(script));
assert('time machine has mobile-safe controls', /\.tm-controls/.test(page) && /@media\(max-width:600px\)/.test(page));

if (failures.length) {
  console.error('Changelog Time Machine verification failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('Changelog Time Machine verified: root, asset, scrubber, active phase, and responsive controls are wired.');
