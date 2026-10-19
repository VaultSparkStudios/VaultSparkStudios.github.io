#!/usr/bin/env node
/**
 * probe-tt-soak.mjs (S172 audit #5 · tt-soak-kv-probe)
 *
 * Reads sampled Trusted Types reports from private R2 and legacy Workers KV.
 *
 * Background: TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2) was evidence-
 * deferred because the named capability `cloudflare.kv` is MISSING. But the
 * broad `cloudflare.studio` cfut_ token (READY) declares KV in its scope —
 * CANON-019 requires probing that path before the item stays blocked.
 *
 * Before S387 the Worker wrote TT reports into the RATE_LIMIT KV namespace
 * (wrangler.toml id 6fde74ca7f3d462786afbb85c85611e0) under keys:
 *   tt:<YYYY-MM-DD>:counter   — daily violation count
 *   tt:<YYYY-MM-DD>:<NNNN>    — sampled report bodies
 *
 * Output: docs/TT_SOAK_EVIDENCE_<date>.md with per-day counts + verdict.
 * On API failure the exact error code is printed as durable evidence.
 *
 * Usage:
 *   node scripts/probe-tt-soak.mjs            # probe last 30 days
 *   node scripts/probe-tt-soak.mjs --days=14
 *   node scripts/probe-tt-soak.mjs --no-write # stdout only
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const NO_WRITE = args.includes('--no-write');

function flag(name, fallback) {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : fallback;
}

const DAYS = Math.max(1, Number(flag('--days', 30)) || 30);
const NAMESPACE_ID = flag('--namespace', '6fde74ca7f3d462786afbb85c85611e0');
const ENFORCE_CANDIDATES = (flag('--routes', '/privacy/,/terms/') || '')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);

const { redact } = await import('./lib/secrets.mjs');
const { readTtReports } = await import('./lib/tt-report-reader.mjs');
try {
  const evidence = await readTtReports({ days: DAYS, namespace: NAMESPACE_ID });
  console.log('Storage reads are complete; sampled and budget-capped intake is not a complete traffic census.');
  const days = {};
  for (const row of evidence.reports) {
    const day = row.ts.slice(0, 10);
    days[day] = (days[day] || 0) + 1;
  }
  const samples = evidence.reports.slice(0, 5).map((body, i) => ({ key: 'sample-' + i, body }));
  const routeHits = {};
  for (const sample of samples) {
    const body = sample.body || {};
    const blocked = String(body.documentUri || body.documentURI || body.documentURL || body.url || '');
    let route = '/';
    try { route = new URL(blocked).pathname || '/'; } catch {}
    routeHits[route] = (routeHits[route] || 0) + 1;
  }

  const totalViolations = Object.values(days).reduce((a, b) => a + (b || 0), 0);
  const daysWithData = Object.keys(days).length;
  const routeReadiness = ENFORCE_CANDIDATES.map((route) => ({
    route,
    ready: daysWithData > 0 && totalViolations === 0 && !routeHits[route],
    observedSampleHits: routeHits[route] || 0,
    rollback: `Remove ${route} from TT_ENFORCE_ROUTES and redeploy cloudflare/security-headers-worker.js`,
  }));
  const verdict = daysWithData === 0
    ? 'NO-DATA — no sampled reports in window; zero observed reports does not prove absence of violations. Verify header and coverage before enforcing.'
    : totalViolations === 0
      ? 'CLEAN — soak recorded 0 violations; evidence gate SATISFIED. Remaining step: founder real-device verify, then enforce /privacy/ only.'
      : `VIOLATIONS PRESENT — ${totalViolations} across ${daysWithData} day(s); review samples before any enforce step.`;

  console.log(`probe-tt-soak: ${evidence.reports.length} sampled report(s) · ${daysWithData} sampled day(s) in ${DAYS}d window · sampled violations: ${totalViolations}`);
  for (const [day, n] of Object.entries(days).sort()) console.log(`  ${day}  ${n ?? '(unreadable)'}`);
  console.log(`  verdict: ${verdict.split(' — ')[0]}`);

  if (!NO_WRITE) {
    const date = new Date().toISOString().slice(0, 10);
    const out = path.join(ROOT, 'docs', `TT_SOAK_EVIDENCE_${date}.md`);
    const lines = [
      `<!-- generated-by: scripts/probe-tt-soak.mjs -->`,
      `<!-- generated-at: ${date} -->`,
      '',
      '# Trusted Types Soak Evidence',
      '',
      `> Complete private R2 + legacy KV read via the secrets gateway.`,
      `> Namespace: RATE_LIMIT (\`${NAMESPACE_ID}\`) · window: last ${DAYS} days · probed: ${date}`,
      '',
      `## Verdict`,
      '',
      verdict,
      '',
      `## Sampled reports (${daysWithData} day(s), ${totalViolations} sampled violation(s))`,
      '',
      daysWithData ? '| Day | Violations |\n|---|---|' : '_No counter keys in window._',
      ...Object.entries(days).sort().map(([d, n]) => `| ${d} | ${n ?? 'unreadable'} |`),
      '',
      samples.length ? `## Sample reports (${samples.length})` : '',
      ...samples.map((s) => `- \`${s.key}\` → ${JSON.stringify(s.body).slice(0, 300)}`),
      '',
      '## Route enforce ladder',
      '',
      '| Route | Ready | Observed sample hits | Rollback |',
      '|---|:-:|---:|---|',
      ...routeReadiness.map((r) => `| \`${r.route}\` | ${r.ready ? 'yes' : 'no'} | ${r.observedSampleHits} | ${r.rollback} |`),
      '',
      '---',
      '*Unblocks the evidence half of TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2). Founder device verify remains before enforce.*',
      '',
    ].filter((l) => l !== undefined);
    fs.writeFileSync(out, lines.join('\n'), 'utf8');
    console.log(`  evidence → ${path.relative(ROOT, out)}`);
  }
  process.exit(0);
} catch (err) {
  console.error(`probe-tt-soak: ${redact(String(err?.message || err))}`);
  console.error('  This exact error is the durable evidence for the TASK_BOARD item if the token lacks KV scope.');
  process.exit(1);
}
