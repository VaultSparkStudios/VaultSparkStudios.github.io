#!/usr/bin/env node
/**
 * update-test-signal.mjs (S174 audit #10 · brief-signal-plumbing)
 *
 * The startup brief's Tests signal read PROJECT_STATUS.json fields that
 * nothing ever wrote — so it showed "?/? passing" forever. This stamps an
 * honest signal: the number of build:check gate commands, marked passing
 * only when invoked after a green run.
 *
 * Usage:
 *   node scripts/update-test-signal.mjs --green   # after build:check passes
 *   node scripts/update-test-signal.mjs --failed  # after a red run
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATUS = path.join(ROOT, 'context', 'PROJECT_STATUS.json');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const gates = String(pkg.scripts['build:check'] || '').split('&&').map((s) => s.trim()).filter(Boolean);
const green = process.argv.includes('--green');

const status = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
status.testsTotal = gates.length;
status.testsPassing = green ? gates.length : 0;
status.testsLastRun = new Date().toISOString().slice(0, 10);
status.testsLabel = 'build:check gates';
fs.writeFileSync(STATUS, JSON.stringify(status, null, 2) + '\n');
console.log(`update-test-signal: ${status.testsPassing}/${status.testsTotal} build:check gate(s) · ${status.testsLastRun}`);
