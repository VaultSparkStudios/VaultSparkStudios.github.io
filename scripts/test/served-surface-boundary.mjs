#!/usr/bin/env node
/**
 * served-surface-boundary — the deploy allowlist may not include operator
 * records. On 2026-11-17 `audits/` and `portfolio/` were in the allowlist and
 * the live site served the operator event log, session score files and a
 * ledger of founder decisions to anyone who asked for the URL.
 *
 * Run: node scripts/test/served-surface-boundary.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/served-surface.json'), 'utf8'));

// Folders that hold operator state, source or tooling. None is a visitor surface.
const INTERNAL = [
  'audits/', 'portfolio/', 'context/', 'docs/', 'logs/', 'prompts/', 'scripts/', 'config/',
  'cloudflare/', 'supabase/', 'tests/', 'output/', 'node_modules/', '.cache/', '.github/',
  '.claude/', '.codex/', '.ops-cache/',
];
// Root files that must never be published by exact name.
const INTERNAL_FILES = ['AGENTS.md', 'CLAUDE.md', 'package.json', 'package-lock.json', '.mcp.json', '.npmrc', 'wrangler.toml'];

let failed = 0;
const check = (name, pass, detail = '') => {
  console.log(`${pass ? '✓' : '✗'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
  if (!pass) failed += 1;
};

const prefixes = Array.isArray(manifest.prefixes) ? manifest.prefixes : [];
const exact = Array.isArray(manifest.exact) ? manifest.exact : [];
check('manifest lists served prefixes', prefixes.length > 0);

const leaked = prefixes.filter((p) => INTERNAL.some((i) => p === i || p.startsWith(i) || i.startsWith(p)));
check('no internal folder is in the served prefixes', leaked.length === 0, leaked.join(', '));

const leakedFiles = exact.filter((f) => INTERNAL_FILES.includes(f));
check('no internal root file is in the exact list', leakedFiles.length === 0, leakedFiles.join(', '));

const loose = prefixes.filter((p) => !p.endsWith('/') || p.includes('..') || p.startsWith('/'));
check('every served prefix is a plain relative folder', loose.length === 0, loose.join(', '));

console.log(`served-surface-boundary: ${failed === 0 ? 'all passed' : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
