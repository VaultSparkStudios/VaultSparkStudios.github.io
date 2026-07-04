#!/usr/bin/env node
/**
 * run-build-check.mjs
 *
 * Windows cannot reliably execute the full build:check command once the chain
 * grows past the shell command-line limit. Keep the ordered command list in
 * package.json as build:check:steps and execute each step directly.
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function splitCommands(script) {
  return String(script || '')
    .split(/\s+&&\s+/)
    .map((cmd) => cmd.trim())
    .filter(Boolean);
}

function tokenize(command) {
  const tokens = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command))) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export function commandsFromPackage(pkg) {
  const steps = pkg.scripts?.['build:check:steps'];
  if (!steps) throw new Error('package.json missing scripts.build:check:steps');
  return splitCommands(steps);
}

function main() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
  const commands = commandsFromPackage(pkg);
  const fromArg = process.argv.find((arg) => arg.startsWith('--from='));
  const from = fromArg ? Math.max(1, Number(fromArg.split('=')[1]) || 1) : 1;
  console.log(`run-build-check: ${commands.length} step(s)${from > 1 ? ` · starting at ${from}` : ''}`);
  for (let i = from - 1; i < commands.length; i += 1) {
    const command = commands[i];
    const [bin, ...args] = tokenize(command);
    if (!bin) continue;
    console.log(`\n[build:check ${i + 1}/${commands.length}] ${command}`);
    const result = spawnSync(bin, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: false,
      windowsHide: true,
    });
    if (result.error) {
      console.error(`run-build-check: failed to start "${command}": ${result.error.message}`);
      process.exit(1);
    }
    if (result.status !== 0) {
      console.error(`run-build-check: step ${i + 1} failed with exit ${result.status}`);
      process.exit(result.status || 1);
    }
  }
  console.log('\nrun-build-check: all steps passed');
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
