#!/usr/bin/env node
// @verification-scope publisher — free advisory inference publisher, not a build gate.
/**
 * generate-vault-narrative — daily AI-authored "what's happening at the studio".
 *
 * Reads:  api/public-intelligence.json (live portfolio snapshot)
 * Writes: api/vault-narrative.json     (homepage reads this, RSS-able)
 *
 * Runs daily via .github/workflows/vault-narrative.yml. Soft-fails if Anthropic
 * is unavailable — preserves the previous narrative.json so the homepage never
 * shows an empty surface.
 *
 * Cost: ONE Sonnet call per day. ~6K input / 250 output → ~$0.02/day.
 * Token meter: this script logs spend to ignis_daily_meter via Supabase if
 * SUPABASE_URL is set; otherwise it just runs.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chat } from './lib/desk-inference.mjs';

const ROOT = process.cwd();
const INTEL_PATH = path.join(ROOT, 'api', 'public-intelligence.json');
const OUT_PATH = path.join(ROOT, 'api', 'vault-narrative.json');
const HISTORY_PATH = path.join(ROOT, 'api', 'vault-narrative-history.json');
const RSS_PATH = path.join(ROOT, 'journal', 'dispatches', 'feed.xml');
const HISTORY_LIMIT = 30;

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function buildPrompt(intel) {
  const project = intel.project || {};
  const portfolio = intel.portfolio || {};
  const pulse = intel.pulse || {};
  const heat = (intel.activityHeatmap || []).slice(0, 5);
  const shipped = (pulse.shipped || []).slice(0, 5);
  const now = (pulse.now || []).slice(0, 3);

  return [
    'You are writing a 2–3 sentence dispatch for the VaultSpark Studios homepage.',
    'Voice: vault-forge brand — poetic, precise, never hyped. Use "the vault", "the forge", "sparked", "sealed" when natural.',
    'Length: 35–80 words total. No emoji. No hashtags. No "we are excited to announce".',
    'Reference at least one concrete artifact (a project name, a count, an event) but never invent.',
    '',
    '── INPUT SNAPSHOT ──',
    `Studio: ${project.name || 'VaultSpark Studios'} — session ${project.currentSession || '?'}`,
    project.currentFocus ? `Current focus: ${project.currentFocus}` : '',
    `Portfolio: ${portfolio.sparked || 0} SPARKED · ${portfolio.forge || 0} FORGE · ${portfolio.sealedCount || 0} SEALED · ${portfolio.vaulted || 0} VAULTED.`,
    heat.length ? 'Hottest projects (30d): ' + heat.map((h) => `${h.name}:${h.heat}`).join(', ') : '',
    shipped.length ? 'Recently shipped: ' + shipped.join(' · ') : '',
    now.length ? 'In motion now: ' + now.join(' · ') : '',
    '',
    'Write the dispatch now. No preamble, no header — just the sentences.',
  ].filter(Boolean).join('\n');
}

async function callAdvisoryInference(prompt) {
  return chat({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 768,
    temperature: 0.35,
    thinking: false,
  });
}

export function validateDispatch(dispatch, intel) {
  const words = String(dispatch || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 35 || words.length > 100) return { ok: false, reason: 'dispatch must contain 35–100 words' };
  const concrete = [
    ...((intel.catalog || []).map((project) => project.name)),
    String(intel.portfolio?.sparked ?? ''),
    String(intel.portfolio?.forge ?? ''),
    ...((intel.pulse?.shipped || []).slice(0, 5)),
  ].filter((value) => String(value).length > 1);
  const normalized = dispatch.toLowerCase();
  if (!concrete.some((value) => normalized.includes(String(value).toLowerCase()))) {
    return { ok: false, reason: 'dispatch is not grounded in a named project, count, or shipped artifact' };
  }
  if (/https?:\/\/|we are excited to announce|revolutionary|game-changing/i.test(dispatch)) {
    return { ok: false, reason: 'dispatch contains a prohibited hype or URL pattern' };
  }
  return { ok: true };
}

async function logSpendToMeter(usage) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !usage) return;
  try {
    await fetch(`${url}/rest/v1/rpc/increment_ignis_meter`, {
      method: 'POST',
      headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_function_name: 'generate-vault-narrative',
        p_input_tokens: Number(usage.input_tokens || 0),
        p_output_tokens: Number(usage.output_tokens || 0),
        p_cache_read: Number(usage.cache_read_input_tokens || 0),
        p_cache_create: Number(usage.cache_creation_input_tokens || 0),
      }),
    });
  } catch { /* non-fatal */ }
}

function preservePrevious() {
  try {
    if (fs.existsSync(OUT_PATH)) {
      const prev = readJson(OUT_PATH);
      console.log(`[vault-narrative] preserved previous (generated ${prev.generatedAt})`);
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

async function main() {
  if (!fs.existsSync(INTEL_PATH)) {
    console.error('[vault-narrative] no public-intelligence.json — run generate-public-intelligence.mjs first');
    process.exit(2);
  }
  const intel = readJson(INTEL_PATH);

  let dispatch, inference;
  try {
    inference = await callAdvisoryInference(buildPrompt(intel));
    if (!inference.ok) throw new Error(inference.state + ': ' + inference.reason);
    dispatch = inference.content.trim();
  } catch (err) {
    console.error('[vault-narrative] advisory inference unavailable:', err.message);
    if (preservePrevious()) process.exit(0);
    process.exit(1);
  }

  const grounding = validateDispatch(dispatch, intel);
  if (!grounding.ok) {
    console.error('[vault-narrative] rejected ungrounded response:', grounding.reason);
    if (preservePrevious()) process.exit(0);
    process.exit(1);
  }

  const payload = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    dispatch,
    model: inference.model || 'hetzner-advisory',
    sourceSession: intel.project?.currentSession || null,
    sourceSnapshot: intel.generatedAt || null,
  };

  const json = JSON.stringify(payload, null, 2) + '\n';
  fs.writeFileSync(OUT_PATH, json);
  console.log(`[vault-narrative] wrote ${OUT_PATH}`);
  console.log(`  dispatch: "${dispatch.slice(0, 100)}${dispatch.length > 100 ? '…' : ''}"`);

  appendHistory(payload);
  writeRss();

  await logSpendToMeter(inference.usage);
}

function appendHistory(entry) {
  let history = [];
  try {
    if (fs.existsSync(HISTORY_PATH)) {
      const parsed = readJson(HISTORY_PATH);
      if (Array.isArray(parsed?.entries)) history = parsed.entries;
    }
  } catch { /* start fresh on parse error */ }
  // Skip if today's dispatch already in history (reruns same UTC day)
  const today = entry.generatedAt.slice(0, 10);
  history = history.filter((h) => (h.generatedAt || '').slice(0, 10) !== today);
  history.unshift({
    generatedAt: entry.generatedAt,
    dispatch: entry.dispatch,
    sourceSession: entry.sourceSession,
    model: entry.model,
  });
  history = history.slice(0, HISTORY_LIMIT);
  const out = { schemaVersion: '1.0', updatedAt: entry.generatedAt, count: history.length, entries: history };
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`[vault-narrative] history → ${history.length} entries`);
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function writeRss() {
  let history = [];
  try { history = readJson(HISTORY_PATH).entries || []; } catch { return; }
  const SITE = 'https://vaultsparkstudios.com';
  const items = history.map((h) => {
    const date = new Date(h.generatedAt);
    const dateStr = date.toUTCString();
    const dayKey = h.generatedAt.slice(0, 10);
    const guid = `${SITE}/journal/dispatches/#${dayKey}`;
    const title = `Studio dispatch — ${dayKey}`;
    return [
      '    <item>',
      `      <title>${escapeXml(title)}</title>`,
      `      <link>${escapeXml(guid)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(guid)}</guid>`,
      `      <pubDate>${dateStr}</pubDate>`,
      `      <description>${escapeXml(h.dispatch)}</description>`,
      '    </item>',
    ].join('\n');
  }).join('\n');
  const lastBuild = new Date().toUTCString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>VaultSpark Studios — Daily Dispatches</title>',
    `    <link>${SITE}/journal/dispatches/</link>`,
    '    <description>Daily AI-authored dispatches from VaultSpark Studios — one signal per day from the forge.</description>',
    '    <language>en-us</language>',
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <atom:link href="${SITE}/journal/dispatches/feed.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  fs.mkdirSync(path.dirname(RSS_PATH), { recursive: true });
  fs.writeFileSync(RSS_PATH, xml);
  console.log(`[vault-narrative] wrote ${RSS_PATH}`);
}

if (process.argv.includes('--self-test')) {
  const intel = { catalog: [{ name: 'Velaxis' }], portfolio: { sparked: 4, forge: 9 }, pulse: { shipped: ['a concrete release receipt'] } };
  const grounded = 'Velaxis moved through the forge with a concrete release receipt now sealed into public proof. The vault holds four sparked initiatives while nine more take shape, and this dispatch names only what the source snapshot can carry today without pretending that motion is the same thing as completion.';
  if (!validateDispatch(grounded, intel).ok) throw new Error('grounded fixture rejected');
  if (validateDispatch('A very short ungrounded sentence.', intel).ok) throw new Error('ungrounded fixture accepted');
  console.log('generate-vault-narrative: self-test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error('[vault-narrative] fatal', err);
  if (preservePrevious()) process.exit(0);
  process.exit(1);
});
