#!/usr/bin/env node
// @verification-scope closeout — validates the current diff, not a clean build tree.
/** Parse every changed or untracked JSON/NDJSON file without rewriting it. */
import fs from 'node:fs';
import { spawnSync } from './lib/safe-spawn.mjs';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', shell: false });
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

export function parseDataFile(file, source) {
  if (!file.endsWith('.ndjson')) {
    JSON.parse(source);
    return;
  }
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  }
}

const base = argValue('--base', 'HEAD');
const changed = git(['diff', '--name-only', base, '--', '*.json', '*.ndjson']);
const untracked = git(['ls-files', '--others', '--exclude-standard', '--', '*.json', '*.ndjson']);
const files = [...new Set([...changed, ...untracked])].filter((file) => fs.existsSync(file)).sort();
const errors = [];
for (const file of files) {
  try {
    parseDataFile(file, fs.readFileSync(file, 'utf8'));
  } catch (error) {
    errors.push(error.message.startsWith(file) ? error.message : `${file}: ${error.message}`);
  }
}

if (errors.length) {
  console.error(`changed-data-integrity: ${errors.length} corrupt file(s)`);
  errors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}
console.log(`changed-data-integrity: ${files.length}/${files.length} parse-clean (base ${base})`);
