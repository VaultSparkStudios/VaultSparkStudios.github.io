#!/usr/bin/env node
/**
 * append-genome-snapshot.mjs
 *
 * Appends the current protocol genome scores to context/GENOME_HISTORY.json.
 * Run at every closeout when the truth audit changes, or on demand.
 * The history is consumed by render-genome-history.mjs for trend analysis.
 *
 * Usage:
 *   node scripts/append-genome-snapshot.mjs [--project <localPath>]
 *   node scripts/ops.mjs genome-snapshot
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const projectIdx = process.argv.indexOf('--project');
const targetPath = projectIdx !== -1 ? path.resolve(process.argv[projectIdx + 1]) : ROOT;

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJson(p, fb = null) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fb; }
}

// ── Load sources ──────────────────────────────────────────────────────────────
const ctx = (f) => path.join(targetPath, 'context', f);
const truth  = fs.existsSync(ctx('TRUTH_AUDIT.md')) ? fs.readFileSync(ctx('TRUTH_AUDIT.md'), 'utf8') : '';
const status = readJson(ctx('PROJECT_STATUS.json')) || {};

// ── Parse genome dimensions from TRUTH_AUDIT.md ───────────────────────────────
// Expects rows like: | Schema alignment | 5 | notes |
function parseDimension(content, dimName) {
  const re = new RegExp(`\\|\\s*${dimName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*(\\d+)\\s*\\|`);
  const m = content.match(re);
  return m ? parseInt(m[1]) : null;
}

const DIMENSIONS = [
  'Schema alignment',
  'Prompt/template alignment',
  'Derived-view freshness',
  'Handoff continuity',
  'Contradiction density',
];

const dimensions = {};
const parsedScores = [];
for (const dim of DIMENSIONS) {
  const score = parseDimension(truth, dim);
  const key = dim.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase().replace(/^_|_$/g, '');
  dimensions[key] = score;
  parsedScores.push(score);
}
const genomeScored = parsedScores.every(Number.isFinite);
const total = genomeScored ? parsedScores.reduce((sum, score) => sum + score, 0) : null;

const truthOverallStatus = truth.match(/^Overall status:\s*(.+)$/m)?.[1]?.trim()
  ?? status.truthAuditStatus
  ?? 'unknown';
const genomeStatus = genomeScored ? (total >= 20 ? 'green' : total >= 15 ? 'review' : 'degraded') : 'unscored';
const lastReviewed = truth.match(/^Last reviewed:\s*(.+)$/m)?.[1]?.trim()
  ?? new Date().toISOString().slice(0, 10);

// ── Build snapshot ────────────────────────────────────────────────────────────
const snapshot = {
  date: new Date().toISOString().slice(0, 10),
  session: status.currentSession ?? null,
  total,
  maxTotal: DIMENSIONS.length * 5,
  overallStatus: genomeStatus,
  truthOverallStatus,
  lastReviewed,
  dimensions,
  delta: null, // filled in below
  cause: status.currentFocus?.slice(0, 120) ?? null,
};

// ── Load/update history ───────────────────────────────────────────────────────
const histPath = ctx('GENOME_HISTORY.json');
const history = readJson(histPath) || { schemaVersion: '1.0', project: status.slug ?? 'unknown', snapshots: [] };

// Compute delta vs last snapshot
const last = history.snapshots.at(-1);
if (last) {
  snapshot.delta = Number.isFinite(total) && Number.isFinite(last.total) ? total - last.total : null;
}

// Avoid duplicate same-date snapshots (update instead of append)
const existingIdx = history.snapshots.findIndex(s => s.date === snapshot.date && s.session === snapshot.session);
if (existingIdx !== -1) {
  history.snapshots[existingIdx] = snapshot;
  console.log(`✓ Updated genome snapshot for ${snapshot.date} (S${snapshot.session ?? '?'}) — ${genomeScored ? `total ${total}/${snapshot.maxTotal}` : 'unscored (dimension table absent)'} (${genomeStatus})`);
} else {
  history.snapshots.push(snapshot);
  console.log(`✓ Appended genome snapshot for ${snapshot.date} (S${snapshot.session ?? '?'}) — ${genomeScored ? `total ${total}/${snapshot.maxTotal}` : 'unscored (dimension table absent)'} (${genomeStatus})`);
}

fs.writeFileSync(histPath, JSON.stringify(history, null, 2) + '\n', 'utf8');
