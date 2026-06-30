#!/usr/bin/env node
/**
 * check-worker-rewriter-safety.mjs — S239 regression guard for the P0 deadlock.
 *
 * Root cause (S239): The Cloudflare Worker's nonce-injection path called
 * `finalResponse.clone()` twice on a streaming HTMLRewriter output. Both calls
 * created stream tees whose backpressure blocked each other — causing every HTML
 * request to hang indefinitely after a cache purge.
 *
 * Fix: `await rewriter.transform(upstream).arrayBuffer()` materialises the HTML
 * body so that subsequent `clone()` calls copy an ArrayBuffer reference (not a
 * stream tee) — safe to call any number of times.
 *
 * This gate enforces two invariants:
 * 1. no `rewriter.transform(` call in the Worker may use a streaming chain
 *    (the call must be chained with `.arrayBuffer()` on the same expression).
 * 2. generic HTML responses must also be buffered before the multi-clone cache
 *    path. Nonce mode is not the only path that can clone a response twice.
 *
 * Usage:
 *   node scripts/check-worker-rewriter-safety.mjs            # scan the Worker
 *   node scripts/check-worker-rewriter-safety.mjs --self-test
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WORKER = join(ROOT, 'cloudflare', 'security-headers-worker.js');

/**
 * Scan source text for `rewriter.transform(` patterns that are NOT immediately
 * chained with `.arrayBuffer()`. Returns an array of {line, text} violations.
 *
 * Safe pattern (buffered):
 *   await rewriter.transform(upstream).arrayBuffer()
 *
 * Unsafe pattern (streaming — will deadlock on multi-clone):
 *   const r = rewriter.transform(upstream);
 *   finalResponse = withSecurityHeaders(rewriter.transform(upstream), ...)
 */
export function scanForUnsafeTransform(source) {
  const violations = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Find any `.transform(` call (covers rewriter.transform, this.transform, etc.)
    if (!line.includes('.transform(')) continue;
    // Skip comment lines
    if (/^\s*\/\//.test(line)) continue;
    // A safe transform is one that chains .arrayBuffer() on the same line or next line.
    const combinedCtx = (line + (lines[i + 1] || '')).replace(/\s+/g, ' ');
    const hasSafeChain = /\.transform\([^)]*\)\s*\.arrayBuffer\(\)/.test(combinedCtx);
    if (!hasSafeChain) {
      violations.push({ line: i + 1, text: line.trim() });
    }
  }
  return violations;
}
/**
 * Scan for the generic HTML fallback branch that buffers HTML before it reaches
 * cache/DR clone writes. This catches regressions where nonce-mode HTML is safe
 * but plain HTML can still enter the clone path as a live ReadableStream.
 */
export function scanForMissingGenericHtmlBuffer(source) {
  const collapsed = source.replace(/\s+/g, ' ');
  const branch = /else if\s*\(\s*isHtml\s*\)\s*\{(?<body>.*?)\}\s*else if\s*\(\s*jsonSwr\s*\)/.exec(collapsed);
  if (!branch?.groups?.body) {
    return [{ line: 1, text: 'missing generic else-if(isHtml) buffer branch before jsonSwr fallback' }];
  }
  if (!/upstream\.arrayBuffer\(\)/.test(branch.groups.body)) {
    return [{ line: 1, text: 'generic else-if(isHtml) branch does not buffer upstream.arrayBuffer() before cache clones' }];
  }
  return [];
}

/**
 * Nonce-mode HTML rewrites must preserve upstream headers after buffering.
 * Dropping `Content-Type: text/html` while sending `nosniff` makes browsers
 * render the page as raw source text instead of a document.
 */
export function scanForMissingNonceHtmlHeaders(source) {
  const collapsed = source.replace(/\s+/g, ' ');
  const start = collapsed.indexOf('if (isHtml && nonceModeOn) {');
  const end = collapsed.indexOf('} else if (isHtml)', start);
  if (start === -1 || end === -1) {
    return [{ line: 1, text: 'missing nonce-mode if(isHtml && nonceModeOn) branch before generic HTML branch' }];
  }
  const body = collapsed.slice(start, end);
  if (!/rewriter\.transform\(upstream\)\.arrayBuffer\(\)/.test(body)) {
    return [{ line: 1, text: 'nonce-mode HTML branch does not buffer HTMLRewriter output before cache clones' }];
  }
  if (!/new Response\(htmlBody,\s*\{[^}]*headers:\s*upstream\.headers/.test(body)) {
    return [{ line: 1, text: 'nonce-mode HTML branch drops upstream headers; Content-Type must survive HTML rewrite' }];
  }
  return [];
}

/**
 * HEAD responses have no body. They must never populate the HTML body cache,
 * otherwise a monitoring `curl -I` can poison the next visitor's GET with a
 * zero-byte HTML response.
 */
export function scanForUnsafeHeadHtmlCache(source) {
  const collapsed = source.replace(/\s+/g, ' ');
  const violations = [];
  if (!/const cacheableGet = method === 'GET';/.test(collapsed)) {
    violations.push({ line: 1, text: 'missing cacheableGet guard for Worker cache body paths' });
  }
  if (!/if \(!isSolaraGameRoute && cacheableGet && \(ttl > 0 \|\| jsonSwr \|\| nonceModeOn\)\)/.test(collapsed)) {
    violations.push({ line: 1, text: 'Worker cache lookup is not restricted to GET responses' });
  }
  if (!/if \(upstream\.status === 200 && cacheableGet\)/.test(collapsed)) {
    violations.push({ line: 1, text: 'Worker cache write is not restricted to GET responses' });
  }
  return violations;
}

function runSelfTest() {
  let fail = 0;
  const assert = (cond, msg) => {
    if (!cond) { console.error('  ✗ ' + msg); fail++; } else { console.log('  ✓ ' + msg); }
  };

  // Safe: buffered chain on one line
  assert(
    scanForUnsafeTransform('const body = await rewriter.transform(upstream).arrayBuffer();').length === 0,
    'buffered chain → clean'
  );
  // Safe: chain splits across two lines (array window covers both)
  assert(
    scanForUnsafeTransform('const body = await rewriter\n  .transform(upstream).arrayBuffer();').length === 0,
    'two-line buffered chain → clean'
  );
  // Unsafe: streaming assignment
  assert(
    scanForUnsafeTransform('const r = rewriter.transform(upstream);').length === 1,
    'streaming assignment → 1 violation'
  );
  // Unsafe: streaming passed directly to a function
  assert(
    scanForUnsafeTransform('finalResponse = withSecurityHeaders(rewriter.transform(upstream), {});').length === 1,
    'streaming arg → 1 violation'
  );
  // Comments are excluded
  assert(
    scanForUnsafeTransform('// rewriter.transform(upstream) - note about old bug').length === 0,
    'comment line -> clean'
  );
  // Safe: generic HTML branch buffers before jsonSwr/non-HTML fallbacks.
  assert(
    scanForMissingGenericHtmlBuffer('if (nonceModeOn) {} else if (isHtml) { const htmlBody = await upstream.arrayBuffer(); } else if (jsonSwr) {}').length === 0,
    'generic HTML buffer branch -> clean'
  );
  // Unsafe: generic HTML branch exists but remains streaming.
  assert(
    scanForMissingGenericHtmlBuffer('if (nonceModeOn) {} else if (isHtml) { finalResponse = withSecurityHeaders(upstream, {}); } else if (jsonSwr) {}').length === 1,
    'streaming generic HTML branch -> 1 violation'
  );
  // Safe: nonce HTML branch buffers and preserves upstream headers.
  assert(
    scanForMissingNonceHtmlHeaders('if (isHtml && nonceModeOn) { const htmlBody = await rewriter.transform(upstream).arrayBuffer(); finalResponse = withSecurityHeaders(new Response(htmlBody, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers }), {}); } else if (isHtml) {}').length === 0,
    'nonce HTML headers preserved -> clean'
  );
  // Unsafe: nonce HTML branch buffers but drops Content-Type/header metadata.
  assert(
    scanForMissingNonceHtmlHeaders('if (isHtml && nonceModeOn) { const htmlBody = await rewriter.transform(upstream).arrayBuffer(); finalResponse = withSecurityHeaders(new Response(htmlBody, { status: upstream.status, statusText: upstream.statusText }), {}); } else if (isHtml) {}').length === 1,
    'nonce HTML header drop -> 1 violation'
  );
  // Safe: cache lookup/write are GET-only so HEAD cannot store empty bodies.
  assert(
    scanForUnsafeHeadHtmlCache("const cacheableGet = method === 'GET'; if (!isSolaraGameRoute && cacheableGet && (ttl > 0 || jsonSwr || nonceModeOn)) {} if (upstream.status === 200 && cacheableGet) {}").length === 0,
    'GET-only cache body guard -> clean'
  );
  // Unsafe: body cache has no GET guard.
  assert(
    scanForUnsafeHeadHtmlCache('if (!isSolaraGameRoute && (ttl > 0 || jsonSwr || nonceModeOn)) {} if (upstream.status === 200) {}').length === 3,
    'HEAD cache poison guard missing -> 3 violations'
  );

  const total = 11;
  if (fail === 0) { console.log(`✓ check-worker-rewriter-safety --self-test: ${total}/${total} passed`); process.exit(0); }
  console.error(`✗ check-worker-rewriter-safety --self-test: ${fail} failure(s)`); process.exit(1);
}

function runScan() {
  const source = readFileSync(WORKER, 'utf8');
  const violations = [
    ...scanForUnsafeTransform(source),
    ...scanForMissingGenericHtmlBuffer(source),
  ];
  if (violations.length === 0) {
    console.log('✓ check-worker-rewriter-safety: HTMLRewriter and generic HTML cache paths are buffered (no double-clone deadlock risk)');
    process.exit(0);
  }
  console.error(`✗ check-worker-rewriter-safety: ${violations.length} unsafe Worker HTML buffering violation(s) — transforms and generic HTML cache paths must materialize the body before multi-clone writes (S239/S240 regression guard):`);
  for (const v of violations) {
    console.error(`  line ${v.line}: ${v.text}`);
  }
  process.exit(1);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-worker-rewriter-safety.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}


