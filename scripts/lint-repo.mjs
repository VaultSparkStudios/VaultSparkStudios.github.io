#!/usr/bin/env node
/**
 * lint-repo.mjs — pre-push repo lint.
 *
 * Fails on two classes of incidents that shipped to production this year:
 *
 *   1. Git conflict markers — raw `<<<<<<<`, `=======`, `>>>>>>>` lines.
 *      S86 P0: sw.js shipped with live conflict markers (commit 7ec6402-ish).
 *      Fix added: this lint.
 *
 *   2. Committed credentials — Anthropic keys, GitHub classic PATs, fine-grained
 *      PATs, Slack bot tokens, AWS access keys, Stripe live/restricted keys,
 *      generic private-key headers.
 *      S86 addendum: a classic PAT was surfaced in transcript during extraction.
 *      Hardened against future leaks that DO reach git.
 *
 * Usage:
 *   node scripts/lint-repo.mjs           # scan tracked + untracked (skip ignored)
 *   node scripts/lint-repo.mjs --staged  # scan only staged changes (fast, pre-commit)
 *
 * Exit 0 on clean, exit 1 on any finding.
 *
 * Wired into `npm run build:check` + runnable standalone from CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const STAGED_ONLY = process.argv.includes('--staged');

// Text-bearing file extensions. We do not scan binary assets.
const TEXT_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.json', '.html', '.htm',
  '.css', '.md', '.yml', '.yaml', '.toml', '.sh', '.ps1', '.xml', '.svg',
  '.txt', '.conf', '.ini', '.env', '.gitignore', '.editorconfig',
]);

// Paths never scanned — node_modules, lock files, build outputs, minified bundles.
const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'playwright-report', 'test-results',
  '.cache', 'dist', 'build', 'coverage',
]);
const SKIP_FILE_PATTERNS = [
  /\.min\.(js|css)$/i,
  /package-lock\.json$/i,
  /pnpm-lock\.yaml$/i,
  /yarn\.lock$/i,
  /shell-manifest\.json$/i,    // contains content hashes that resemble entropy patterns
  /\.shell-[a-f0-9]{10}\.(js|css)$/i,  // fingerprinted shell outputs
  /^scripts\/lint-repo\.mjs$/,  // this file itself contains the patterns as source text
  /^scripts\/scan-secrets\.mjs$/,  // sister scanner if present
  /^config\/csp-policy\.mjs$/,     // contains sha256 hashes that match some entropy patterns
];

// ── Conflict-marker patterns ─────────────────────────────────────────────────
// Match at start-of-line only to reduce false positives in code that discusses them.
const CONFLICT_PATTERNS = [
  /^<{7} (HEAD|[a-f0-9]{6,40}|[\w\-\/]+)/m,
  /^={7}$/m,
  /^>{7} [a-f0-9]{6,40}|^>{7} [\w\-\/]+/m,
];

// ── Credential patterns (real live formats only; never example/placeholder shapes) ──
// Each entry: { name, pattern, minEntropyChars }. Patterns require enough characters
// to avoid matching `sk-ant-…` documentation placeholders (hence minChars floor).
const SECRET_PATTERNS = [
  { name: 'Anthropic API key',        pattern: /sk-ant-api\d{2}-[A-Za-z0-9_\-]{80,}/ },
  { name: 'GitHub classic PAT',       pattern: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'GitHub fine-grained PAT',  pattern: /\bgithub_pat_[A-Za-z0-9_]{80,}/ },
  { name: 'GitHub OAuth token',       pattern: /\bgho_[A-Za-z0-9]{36}\b/ },
  { name: 'Slack bot token',          pattern: /\bxoxb-\d{10,}-\d{10,}-[A-Za-z0-9]{24}/ },
  { name: 'Slack user token',         pattern: /\bxoxp-\d{10,}-\d{10,}-\d{10,}-[A-Za-z0-9]{32}/ },
  { name: 'AWS access key',           pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Stripe live secret',       pattern: /\bsk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Stripe restricted secret', pattern: /\brk_live_[A-Za-z0-9]{24,}/ },
  { name: 'Private key header',       pattern: /-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Google API key',           pattern: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
];

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXT.has(ext);
}

function isSkipped(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  for (const dir of SKIP_DIRS) {
    if (norm === dir || norm.startsWith(dir + '/')) return true;
  }
  for (const pat of SKIP_FILE_PATTERNS) {
    if (pat.test(norm)) return true;
  }
  return false;
}

function listFiles() {
  if (STAGED_ONLY) {
    try {
      const out = execSync('git diff --cached --name-only --diff-filter=ACMRT', { cwd: ROOT, encoding: 'utf8' });
      return out.split('\n').filter(Boolean);
    } catch (_e) {
      console.error('lint-repo: git diff --cached failed; falling back to full scan.');
    }
  }
  try {
    const out = execSync('git ls-files --cached --others --exclude-standard', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch (_e) {
    // git not available — walk filesystem as fallback.
    const files = [];
    walkDir(ROOT, files);
    return files.map((abs) => path.relative(ROOT, abs).replace(/\\/g, '/'));
  }
}

function walkDir(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkDir(path.join(dir, entry.name), out);
      continue;
    }
    out.push(path.join(dir, entry.name));
  }
}

function scanFile(relPath) {
  const abs = path.join(ROOT, relPath);
  let content;
  try {
    content = fs.readFileSync(abs, 'utf8');
  } catch (_e) {
    return []; // deleted/binary/unreadable — ignore
  }

  const findings = [];

  for (const pat of CONFLICT_PATTERNS) {
    const m = content.match(pat);
    if (m) {
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({ kind: 'conflict-marker', file: relPath, line, match: m[0].slice(0, 80) });
      break; // one finding per file is enough to fail
    }
  }

  for (const { name, pattern } of SECRET_PATTERNS) {
    const m = content.match(pattern);
    if (m) {
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({
        kind: 'secret',
        file: relPath,
        line,
        name,
        // never print the match itself; just prefix + length to aid triage
        hint: `${m[0].slice(0, 8)}…(${m[0].length} chars)`,
      });
    }
  }

  return findings;
}

function main() {
  const files = listFiles()
    .filter((f) => !isSkipped(f))
    .filter((f) => isTextFile(f));

  const findings = [];
  for (const f of files) {
    findings.push(...scanFile(f));
  }

  if (!findings.length) {
    console.log(`lint-repo: clean (${files.length} text files scanned${STAGED_ONLY ? ', staged only' : ''})`);
    process.exit(0);
  }

  console.error(`lint-repo: ${findings.length} finding(s):\n`);
  for (const f of findings) {
    if (f.kind === 'conflict-marker') {
      console.error(`  [CONFLICT-MARKER] ${f.file}:${f.line} → ${JSON.stringify(f.match)}`);
    } else if (f.kind === 'secret') {
      console.error(`  [SECRET:${f.name}] ${f.file}:${f.line} → ${f.hint}`);
    }
  }
  console.error(`\nFix before pushing. See docs: docs/LINT_REPO.md (or memory/feedback_secret_extraction_rule.md).`);
  process.exit(1);
}

main();
