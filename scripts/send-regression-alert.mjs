#!/usr/bin/env node
/**
 * send-regression-alert.mjs (S175 #7 · regression-email-alerts)
 *
 * Majors get paged; the founder previously found regressions at the next
 * session. This reads the two regression detectors the site already runs —
 *   data/field-verdicts.json      (deploy boundaries graded by field RUM)
 *   .cache/rum-anomaly-canary.json (week-over-week field anomalies)
 * — and emails the founder via Resend when anything reads REGRESSED/alert.
 *
 * Dedup: .cache/regression-alerts-sent.json records what was already mailed
 * so the daily cron never re-sends the same verdict.
 *
 * Usage:
 *   node scripts/send-regression-alert.mjs            # check + send if needed
 *   node scripts/send-regression-alert.mjs --dry-run  # print what would send
 *   node scripts/send-regression-alert.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SENT = path.join(ROOT, '.cache', 'regression-alerts-sent.json');
const DRY = process.argv.includes('--dry-run');
const TO = 'founder@vaultsparkstudios.com';

function readJson(rel, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch { return fallback; }
}

export function collectAlerts({ verdicts, canary }) {
  const alerts = [];
  for (const b of verdicts?.boundaries || []) {
    if (b.overall === 'regressed') {
      const home = b.routes?.['/'];
      alerts.push({
        key: `verdict:${b.date}:regressed`,
        subject: `Field REGRESSION — deploy ${b.date}`,
        body: `Deploy "${b.label}" graded REGRESSED by field data: homepage LCP ${home?.lcpDeltaPct > 0 ? '+' : ''}${home?.lcpDeltaPct}% (${home?.pre?.samples} pre / ${home?.post?.samples} post · ${home?.confidence} confidence).\n\nNext: node scripts/compare-rum-windows.mjs && check lib/perf-forensics.mjs suspectCommits.`,
      });
    }
  }
  if (canary?.status === 'alert' || canary?.verdict === 'alert') {
    alerts.push({
      key: `canary:${canary.generatedAt || 'latest'}`,
      subject: 'RUM anomaly canary ALERT',
      body: `Week-over-week field anomaly detected:\n${JSON.stringify(canary.findings || canary, null, 2).slice(0, 800)}`,
    });
  }
  return alerts;
}

if (process.argv.includes('--self-test')) {
  const alerts = collectAlerts({
    verdicts: { boundaries: [
      { date: '2026-06-05', label: 'x', overall: 'regressed', routes: { '/': { lcpDeltaPct: 25, pre: { samples: 10 }, post: { samples: 8 }, confidence: 'medium' } } },
      { date: '2026-06-01', label: 'y', overall: 'improved' },
    ] },
    canary: { status: 'ok' },
  });
  const none = collectAlerts({ verdicts: { boundaries: [{ overall: 'pending' }] }, canary: { status: 'ok' } });
  const checks = [
    ['regression alerts', alerts.length === 1],
    ['improved is silent', !alerts.some((a) => a.key.includes('2026-06-01'))],
    ['pending is silent', none.length === 0],
    ['subject names the deploy', alerts[0].subject.includes('2026-06-05')],
  ];
  let pass = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`send-regression-alert --self-test: ${pass}/${checks.length}`);
  process.exit(pass === checks.length ? 0 : 1);
}

const alerts = collectAlerts({
  verdicts: readJson('data/field-verdicts.json', null),
  canary: readJson('.cache/rum-anomaly-canary.json', null),
});
const sent = readJson('.cache/regression-alerts-sent.json', { keys: [] });
const fresh = alerts.filter((a) => !sent.keys.includes(a.key));

if (!fresh.length) {
  console.log(`send-regression-alert: nothing to send (${alerts.length} known, all already alerted)`);
  process.exit(0);
}

if (DRY) {
  for (const a of fresh) console.log(`DRY: ${a.subject}\n${a.body}\n`);
  process.exit(0);
}

const { getSecret, redact } = await import('./lib/secrets.mjs');
let key;
try { key = getSecret('RESEND_API_KEY', 'resend.email'); }
catch (err) {
  console.error(`send-regression-alert: credential resolution failed — ${redact(String(err?.message || err))}`);
  process.exit(1);
}

for (const a of fresh) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'VaultSpark Sentinel <sentinel@vaultsparkstudios.com>',
      to: [TO],
      subject: `[vaultsparkstudios.com] ${a.subject}`,
      text: `${a.body}\n\n— send-regression-alert.mjs · runs after every rum:pull`,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`  ✓ sent: ${a.subject} (${j.id || 'ok'})`);
    sent.keys.push(a.key);
  } else {
    console.error(`  ✗ send failed: ${a.subject} — HTTP ${res.status} ${JSON.stringify(j).slice(0, 200)}`);
  }
}
fs.mkdirSync(path.dirname(SENT), { recursive: true });
fs.writeFileSync(SENT, JSON.stringify({ updatedAt: new Date().toISOString(), keys: sent.keys.slice(-100) }, null, 2));
