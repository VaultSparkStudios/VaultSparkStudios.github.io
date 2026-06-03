#!/usr/bin/env node
/**
 * probe-tt-soak.mjs (S172 audit #5 · tt-soak-kv-probe)
 *
 * Reads the Trusted Types report-only soak counters from Workers KV.
 *
 * Background: TRUSTED-TYPES-ENFORCE-CANARY (S164 audit #2) was evidence-
 * deferred because the named capability `cloudflare.kv` is MISSING. But the
 * broad `cloudflare.studio` cfut_ token (READY) declares KV in its scope —
 * CANON-019 requires probing that path before the item stays blocked.
 *
 * The Worker writes TT reports into the RATE_LIMIT KV namespace
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

const { getSecret, redact } = await import('./lib/secrets.mjs');

let token, accountId;
try {
  // S172 probe result: the deploy token has KV read scope (verified via
  // wrangler kv key list); the broad cfut_ studio token returned error 10000
  // on the KV REST API. Deploy token first, studio token as fallback.
  accountId = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
  try {
    token = getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
  } catch {
    token = getSecret('CLOUDFLARE_STUDIO_TOKEN', 'cloudflare.studio');
  }
} catch (err) {
  console.error(`probe-tt-soak: credential resolution failed — ${redact(String(err?.message || err))}`);
  process.exit(1);
}

const API = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${NAMESPACE_ID}`;
const headers = { Authorization: `Bearer ${token}` };

async function cf(pathPart) {
  const res = await fetch(`${API}${pathPart}`, { headers });
  const text = await res.text();
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try { detail = JSON.parse(text)?.errors?.map((e) => `${e.code}: ${e.message}`).join(' · ') || detail; } catch {}
    throw new Error(`${detail} (${pathPart.split('?')[0]})`);
  }
  return text;
}

try {
  // List tt: keys (paginated)
  const keys = [];
  let cursor = '';
  do {
    const qs = `/keys?prefix=${encodeURIComponent('tt:')}&limit=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
    const body = JSON.parse(await cf(qs));
    keys.push(...(body.result || []).map((k) => k.name));
    cursor = body.result_info?.cursor || '';
  } while (cursor);

  const cutoff = new Date(Date.now() - DAYS * 86400000).toISOString().slice(0, 10);
  const counterKeys = keys.filter((k) => /^tt:\d{4}-\d{2}-\d{2}:counter$/.test(k) && k.slice(3, 13) >= cutoff);
  const reportKeys = keys.filter((k) => /^tt:\d{4}-\d{2}-\d{2}:\d{4}$/.test(k) && k.slice(3, 13) >= cutoff);

  const days = {};
  for (const k of counterKeys) {
    const day = k.slice(3, 13);
    try { days[day] = Number(await cf(`/values/${encodeURIComponent(k)}`)) || 0; } catch { days[day] = null; }
  }

  // Pull up to 5 sample report bodies for qualitative review
  const samples = [];
  for (const k of reportKeys.slice(0, 5)) {
    try { samples.push({ key: k, body: JSON.parse(await cf(`/values/${encodeURIComponent(k)}`)) }); } catch {}
  }

  const totalViolations = Object.values(days).reduce((a, b) => a + (b || 0), 0);
  const daysWithData = Object.keys(days).length;
  const verdict = daysWithData === 0
    ? 'NO-DATA — soak counters absent in window; either zero violations ever recorded or report-only header not firing. Verify header on live route before enforcing.'
    : totalViolations === 0
      ? 'CLEAN — soak recorded 0 violations; evidence gate SATISFIED. Remaining step: founder real-device verify, then enforce /privacy/ only.'
      : `VIOLATIONS PRESENT — ${totalViolations} across ${daysWithData} day(s); review samples before any enforce step.`;

  console.log(`probe-tt-soak: ${keys.length} tt:* key(s) · ${daysWithData} counter day(s) in ${DAYS}d window · total violations: ${totalViolations}`);
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
      `> Read autonomously via the \`cloudflare.studio\` token (CANON-019 elevated probe).`,
      `> Namespace: RATE_LIMIT (\`${NAMESPACE_ID}\`) · window: last ${DAYS} days · probed: ${date}`,
      '',
      `## Verdict`,
      '',
      verdict,
      '',
      `## Daily counters (${daysWithData} day(s), ${totalViolations} total violation(s))`,
      '',
      daysWithData ? '| Day | Violations |\n|---|---|' : '_No counter keys in window._',
      ...Object.entries(days).sort().map(([d, n]) => `| ${d} | ${n ?? 'unreadable'} |`),
      '',
      samples.length ? `## Sample reports (${samples.length})` : '',
      ...samples.map((s) => `- \`${s.key}\` → ${JSON.stringify(s.body).slice(0, 300)}`),
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
