#!/usr/bin/env node
/**
 * crawl-all-pages.mjs — deterministic full-site local HTML crawl.
 *
 * Starts the local static preview server, requests every HTML route in the
 * working tree, and reports route failures plus parser-blocking local scripts.
 * This complements Playwright: it gives full-route coverage even when local
 * browser process startup is flaky on Windows.
 */

import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const MAX_BLOCKING_LOCAL_SCRIPTS = 2;

const SKIP_DIRS = new Set([
  'node_modules',
  'playwright-report',
  'test-results',
  '.git',
  '.github',
  'docs',
  'context',
  'logs',
  'scripts',
  'cloudflare',
  'supabase',
  '.cache',
  '.ops-cache',
  'ignis',
]);

const SCRIPT_RE = /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>/gi;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, out);
    } else if (entry.name.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

function routeFor(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

function isBlockingLocalScript(attrs, src) {
  if (/\bdefer\b|\basync\b|type=["']module["']/i.test(attrs)) return false;
  if (/^https?:\/\//i.test(src) || src.startsWith('//')) return false;
  return true;
}

function waitForServer(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('local preview server did not start')), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      const match = text.match(/https?:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`local preview server exited early with code ${code}`));
    });
  });
}

async function main() {
  const server = spawn(process.execPath, ['scripts/local-preview-server.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    const baseUrl = await waitForServer(server);
    const files = walk(ROOT).sort();
    const routeFailures = [];
    const blockingFindings = [];

    for (const file of files) {
      const route = routeFor(file);
      const response = await fetch(baseUrl + route, { redirect: 'manual' }).catch((error) => ({
        status: 0,
        text: async () => '',
        error,
      }));
      const html = await response.text();

      if (!(response.status >= 200 && response.status < 400)) {
        routeFailures.push(`${route} -> ${response.status}${response.error ? ` ${response.error.message}` : ''}`);
      }

      const blockingScripts = [];
      let match;
      SCRIPT_RE.lastIndex = 0;
      while ((match = SCRIPT_RE.exec(html))) {
        const attrs = `${match[1] || ''} ${match[3] || ''}`;
        const src = match[2];
        if (isBlockingLocalScript(attrs, src)) blockingScripts.push(src);
      }

      if (blockingScripts.length > MAX_BLOCKING_LOCAL_SCRIPTS) {
        blockingFindings.push(`${route}: ${blockingScripts.length} blocking local scripts: ${blockingScripts.slice(0, 8).join(', ')}`);
      }
    }

    console.log(`all-page crawl: ${files.length} HTML files via ${baseUrl}`);
    console.log(`status failures: ${routeFailures.length}`);
    for (const failure of routeFailures) console.log(`FAIL ${failure}`);
    console.log(`blocking-script findings: ${blockingFindings.length}`);
    for (const finding of blockingFindings) console.log(`BLOCK ${finding}`);

    if (routeFailures.length || blockingFindings.length) process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
