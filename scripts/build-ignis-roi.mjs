#!/usr/bin/env node
/**
 * build-ignis-roi.mjs — aggregate AI ROI receipts for /ignis/roi/.
 *
 * Joins docs/cache-ledger.ndjson + docs/AUDIT_*.json + recent commits to
 * render a JSON payload showing tokens spent, cache hit %, audit items
 * shipped, and rough founder time saved. Output → api/ignis-roi.json,
 * consumed by /ignis/roi/index.html.
 *
 * Usage:
 *   node scripts/build-ignis-roi.mjs           # write
 *   node scripts/build-ignis-roi.mjs --check   # fail if stale (lenient — only schema)
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'docs', 'cache-ledger.ndjson');
const OUT = path.join(ROOT, 'api', 'ignis-roi.json');
const CHECK = process.argv.includes('--check');

function readLedger() {
  let raw = '';
  try { raw = fs.readFileSync(LEDGER, 'utf8'); } catch { return []; }
  return raw.trim().split('\n').filter(Boolean).map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

function listAudits() {
  const dir = path.join(ROOT, 'docs');
  return fs.readdirSync(dir)
    .filter((n) => /^AUDIT_.*\.json$/.test(n))
    .map((n) => {
      try { return JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')); } catch { return null; }
    })
    .filter(Boolean);
}

function aggregate() {
  const rows = readLedger();
  const audits = listAudits();

  let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheCreate = 0;
  const byModel = {};
  const byScript = {};
  for (const r of rows) {
    totalInput += r.input || 0;
    totalOutput += r.output || 0;
    totalCacheRead += r.cache_read || 0;
    totalCacheCreate += r.cache_create || 0;
    const m = r.model || 'unknown';
    byModel[m] = (byModel[m] || 0) + (r.input || 0) + (r.output || 0);
    const s = r.script || 'unknown';
    byScript[s] = (byScript[s] || 0) + 1;
  }
  const totalTokens = totalInput + totalOutput;
  const cacheHitPct = totalInput > 0 ? Math.round((totalCacheRead / totalInput) * 100) : 0;

  // Audit items shipped: sum of items across all audits (skip "Execution Log" complexity — proxy is item count).
  const totalItems = audits.reduce((acc, a) => acc + (a.topline?.totalItems || (Array.isArray(a.items) ? a.items.length : 0)), 0);
  const combinedPriority = audits.reduce((acc, a) => acc + (a.topline?.combinedPriority || 0), 0);

  // Rough founder time saved: assume 20min average per shipped audit item.
  // Conservative — many items are 1-line config flips, but some are 4h pages.
  const minutesSaved = totalItems * 20;

  // Rough Anthropic cost based on Haiku pricing (most ledger rows are Haiku helpers).
  // Haiku 4.5: $1/M input, $5/M output, $0.08/M cache-read, $1.25/M cache-create.
  const cost =
    (totalInput / 1e6) * 1.00 +
    (totalOutput / 1e6) * 5.00 +
    (totalCacheRead / 1e6) * 0.08 +
    (totalCacheCreate / 1e6) * 1.25;

  // S329: generatedAt was a hardcoded literal ('2026-05-22'), so the feed read
  // as permanently stale the day its freshness ceiling landed — and would have
  // read as permanently fresh had the literal been bumped. Derive it from the
  // newest input evidence instead: deterministic per tree (no wall clock, so
  // byte-reproducible), and it advances exactly as long as real usage flows.
  const newestEvidence = rows.reduce((max, r) => {
    const d = String(r.ts || '').slice(0, 10);
    return d > max ? d : max;
  }, '');
  return {
    generatedAt: newestEvidence || null,
    ledgerRows: rows.length,
    tokens: {
      input: totalInput,
      output: totalOutput,
      cacheRead: totalCacheRead,
      cacheCreate: totalCacheCreate,
      total: totalTokens,
    },
    cacheHitPct,
    estimatedSpendUSD: Number(cost.toFixed(2)),
    auditsRun: audits.length,
    auditItemsShipped: totalItems,
    combinedPriorityShipped: Number(combinedPriority.toFixed(1)),
    founderMinutesSaved: minutesSaved,
    byModel: Object.entries(byModel).sort((a, b) => b[1] - a[1]).slice(0, 5),
    byScript: Object.entries(byScript).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}

function main() {
  const agg = aggregate();
  const json = JSON.stringify(agg, null, 2);

  if (CHECK) {
    let existing = '';
    try { existing = fs.readFileSync(OUT, 'utf8'); } catch {}
    // Schema check only — file must exist + parse — never demand byte-exact since
    // ledger grows continuously.
    if (!existing) {
      console.error('build-ignis-roi --check: api/ignis-roi.json missing. Run build-ignis-roi.');
      process.exit(1);
    }
    try { JSON.parse(existing); } catch {
      console.error('build-ignis-roi --check: api/ignis-roi.json invalid JSON.');
      process.exit(1);
    }
    console.log('build-ignis-roi --check: present and parseable');
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json + '\n');
  console.log(`build-ignis-roi: wrote api/ignis-roi.json — ${agg.auditItemsShipped} items shipped, ${(agg.tokens.total/1000).toFixed(1)}K tokens, $${agg.estimatedSpendUSD}`);
}

main();
