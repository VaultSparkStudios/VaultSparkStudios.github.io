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
 * This gate enforces the invariant: no `rewriter.transform(` call in the Worker
 * may use a streaming chain (i.e. the call must be chained with `.arrayBuffer()`
 * on the same expression). A streaming `.transform()` that is later cloned more
 * than once will silently deadlock — this gate makes that impossible to miss.
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
    scanForUnsafeTransform('// rewriter.transform(upstream) — note about old bug').length === 0,
    'comment line → clean'
  );

  const total = 5;
  if (fail === 0) { console.log(`✓ check-worker-rewriter-safety --self-test: ${total}/${total} passed`); process.exit(0); }
  console.error(`✗ check-worker-rewriter-safety --self-test: ${fail} failure(s)`); process.exit(1);
}

function runScan() {
  const source = readFileSync(WORKER, 'utf8');
  const violations = scanForUnsafeTransform(source);
  if (violations.length === 0) {
    console.log('✓ check-worker-rewriter-safety: all HTMLRewriter.transform() calls are buffered (no double-clone deadlock risk)');
    process.exit(0);
  }
  console.error(`✗ check-worker-rewriter-safety: ${violations.length} unsafe HTMLRewriter.transform() call(s) — each must chain .arrayBuffer() before the result is assigned or cloned (S239 P0 regression guard):`);
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
