#!/usr/bin/env node
/**
 * ingest-news-art.mjs — accept operator-reviewed illustrations into The Desk.
 *
 * Input: a directory of <date>--<slug>/art.png (default: the staging dir written
 * by scripts/generate-news-art-codex.mjs, or any --from dir such as a scratchpad
 * backfill). Nothing is accepted unless its id is listed in --reviewed: "contains
 * no text/logos/likeness and fits the story" is not machine-checkable, so a human
 * (or image-capable agent) must LOOK at each image and name it.
 *
 * Per accepted image:
 *   1. validate: decodes as PNG · ≥1200x630 (panel crop) · aspect 1.6–2.1 ·
 *      entropy ≥ REAL_ART_ENTROPY_FLOOR · pixels not identical to any existing
 *      Desk art or another image in the batch · the story exists.
 *   2. normalize: fit inside 1600x900 (never enlarge), PNG level 9, metadata stripped.
 *   3. preflight the real panel pipeline in memory (same overlay + encodings as
 *      build-news-desk.mjs) against the PNG/WebP/AVIF budgets.
 *   4. write data/news-desk/art/<date>--<slug>.png and rebind the story receipt
 *      (sha256, entropy, size, kind "source-raster", reviewer, reviewed:true,
 *      semanticVerified stays false, generatedArt true) — refusing if the edit
 *      would add any validateStoryVisual error.
 *   5. run `build-news-desk.mjs --rebuild --refresh-art-only <ids>` so ONLY these
 *      stories' derivatives are re-encoded (D-S327.2 lock stays intact elsewhere).
 *
 * Usage:
 *   node scripts/ingest-news-art.mjs --dry-run [--from <dir>]
 *   node scripts/ingest-news-art.mjs --reviewed 2026-09-12--slug,2026-09-11--other
 *   node scripts/ingest-news-art.mjs --reviewed 2026-09-12--slug@9f2c1ab4  # hash-bound approval
 *   node scripts/ingest-news-art.mjs --reviewed reviewed.txt   # one id per line, # comments
 *   node scripts/ingest-news-art.mjs --self-test               # temp fixtures only
 *   node scripts/ingest-news-art.mjs --kind satire --dry-run   # D-S368.7 satire cartoons (<id>/satire.png)
 *   node scripts/ingest-news-art.mjs --kind satire --reviewed 2026-10-03--slug@9f2c1ab4+none
 * Options: --kind banner|satire · --from <dir> · --story <ids> (filter) · --no-rebuild
 *          · --allow-reformat · --reviewer "<text>"
 *
 * --kind satire writes data/news-desk/art/<id>--satire.png and records
 * visual.satireCartoon (artSource, kind, alt, caption, persona, register,
 * caricature, reviewer, reviewedAt, semanticVerified, sha256, size, entropy,
 * promptSha256) under the same hash-bound review rule, plus a required
 * +caricature/+none decision per approval; then runs
 * `build-news-desk.mjs --rebuild --refresh-satire-only <ids>` for derivatives.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { spawnSync } from './lib/safe-spawn.mjs';
import {
  renderEditorialOverlaySvg,
  storyMemeOverlayOptions,
  SATIRE_CARTOON_ASPECT,
  SATIRE_CARTOON_ENTROPY_FLOOR,
  SATIRE_CARTOON_KIND,
  SATIRE_CARTOON_MAX,
  SATIRE_CARTOON_MIN,
  satireCartoonArtSource,
  satireCartoonBrief,
} from './lib/news-memes.mjs';
import { PERSONAS, validateStoryVisual, validateSatireCartoon } from './lib/news-desk.mjs';
import { renderSatireDerivatives, satireBudgetFailures } from './lib/news-satire-raster.mjs';
import {
  PANEL_WIDTH,
  PANEL_HEIGHT,
  REAL_ART_ENTROPY_FLOOR,
  SOURCE_RASTER_KIND,
  measureArt,
  panelBudgetFailures,
  renderFallbackArtSvg,
  renderPanelDerivatives,
  renderSyntheticRasterFixture,
} from './generate-news-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_FROM = path.join(ROOT, '.cache', 'desk-art-staging');
export const DEFAULT_REVIEWER = 'codex image_generation (ChatGPT plan) + operator visual review';
export const DEFAULT_SATIRE_REVIEWER = 'codex image_generation (ChatGPT plan) + operator satire-cartoon review';
export const NORMALIZED_MAX = Object.freeze({ width: 1600, height: 900 });
const ID_RE = /^(\d{4}-\d{2}-\d{2})--([a-z0-9][a-z0-9-]*)$/;

export function normalizeId(value) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:\/|--)([a-z0-9][a-z0-9-]*)$/.exec(String(value || '').trim());
  if (!match) throw new Error(`"${value}" is not a <date>--<slug> story id`);
  return `${match[1]}--${match[2]}`;
}

const HASH_RE = /^[a-f0-9]{8,64}$/;

/**
 * --reviewed accepts a file (ids separated by newlines/commas, # comments) or an
 * inline comma list. Each entry is either `<id>` or `<id>@<sha256 prefix>`.
 *
 * WHY THE HASH FORM EXISTS. Approval used to be keyed on the story id alone, so
 * `--story <id> --force` could re-roll a NEW image after the review and the next
 * ingest would publish those unlooked-at pixels under an "operator visual
 * review" receipt. The hash names the bytes that were actually looked at.
 *
 * The rule this implements:
 *   · `<id>@<hash>` — the staged image's sha256 (raw or normalized) must start
 *     with that prefix, or ingestion of that story is REFUSED.
 *   · `<id>` alone — accepted only when no re-roll is detectable for that story
 *     (see detectReroll: a prior reviewed source-raster receipt for different
 *     pixels, discarded `art.invalid-*.png` generations, or more than one
 *     `generated` row for the id in results.ndjson). After a re-roll the plain
 *     form is refused and the @hash form is required.
 * Returns Map<id, hashPrefix|null>.
 *
 * D-S368.7 satire cartoons add a REVIEW DECISION suffix: `<id>[@<hash>]+caricature`
 * (the cartoon shows a real public figure) or `+none`. It is recorded on the
 * returned map as `.markers` (Map<id, 'caricature'|'none'>); --kind satire
 * refuses an approval without one, so the caricature label is never a default.
 */
export const REVIEW_MARKERS = Object.freeze(['caricature', 'none']);
export function parseReviewed(value, { exists = fs.existsSync, read = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  if (value == null || value === '') return null;
  const text = exists(value) ? read(value) : String(value);
  const entries = text.split(/\r?\n/).map((line) => line.replace(/#.*$/, '')).join(',').split(',').map((s) => s.trim()).filter(Boolean);
  const out = new Map();
  out.markers = new Map();
  for (const rawEntry of entries) {
    const plus = rawEntry.indexOf('+');
    const entry = plus === -1 ? rawEntry : rawEntry.slice(0, plus).trim();
    const marker = plus === -1 ? null : rawEntry.slice(plus + 1).trim().toLowerCase();
    if (marker !== null && !REVIEW_MARKERS.includes(marker)) {
      throw new Error(`"${rawEntry}" has an unknown review marker — expected +caricature or +none`);
    }
    const at = entry.indexOf('@');
    const rawId = at === -1 ? entry : entry.slice(0, at);
    const hash = at === -1 ? null : entry.slice(at + 1).trim().toLowerCase();
    if (hash !== null && !HASH_RE.test(hash)) {
      throw new Error(`"${entry}" is not a valid approval — expected <id> or <id>@<sha256 prefix of 8–64 hex chars>`);
    }
    out.set(normalizeId(rawId), hash);
    if (marker) out.markers.set(normalizeId(rawId), marker);
  }
  return out;
}

/**
 * Was this story's staged image re-generated after an earlier review? Structural
 * evidence only — never a timestamp guess.
 */
export function detectReroll({ story = null, from = null, id = '', stagedSha = '', normalizedSha = '', kind = 'banner' } = {}) {
  const satire = kind === 'satire';
  if (satire) {
    const prior = story?.visual?.satireCartoon;
    if (prior && /^[a-f0-9]{64}$/.test(String(prior.sha256 || '')) && prior.sha256 !== normalizedSha && prior.sha256 !== stagedSha) {
      return { rerolled: true, reason: 'this story already carries a reviewed satire cartoon for different pixels' };
    }
  } else {
    const receipt = story?.visual?.pixelInspection;
    if (receipt && receipt.reviewed === true && receipt.kind === SOURCE_RASTER_KIND
      && /^[a-f0-9]{64}$/.test(String(receipt.sha256 || ''))
      && receipt.sha256 !== normalizedSha && receipt.sha256 !== stagedSha) {
      return { rerolled: true, reason: 'this story already carries a reviewed source-raster receipt for different pixels' };
    }
  }
  if (from && id) {
    const itemDir = path.join(from, id);
    if (fs.existsSync(itemDir)) {
      const pattern = satire ? /^satire\.invalid-.*\.png$/i : /^art\.invalid-.*\.png$/i;
      const discarded = fs.readdirSync(itemDir).filter((name) => pattern.test(name));
      if (discarded.length) return { rerolled: true, reason: `${discarded.length} discarded generation(s) staged alongside this image` };
    }
    const results = path.join(from, 'results.ndjson');
    if (fs.existsSync(results)) {
      let generated = 0;
      for (const line of fs.readFileSync(results, 'utf8').split(/\r?\n/)) {
        if (!line.trim()) continue;
        let row = null;
        try { row = JSON.parse(line); } catch { continue; }
        // Satire rows carry kind:"satire"; banner rows predate the field.
        if (row && row.id === id && row.status === 'generated' && (row.kind === 'satire') === satire) generated += 1;
      }
      if (generated > 1) return { rerolled: true, reason: `${generated} generations recorded for this id in results.ndjson` };
    }
  }
  return { rerolled: false, reason: '' };
}

export function parseArgs(argv) {
  const opts = { kind: 'banner', from: DEFAULT_FROM, reviewed: null, only: null, dryRun: false, selfTest: false, rebuild: true, allowReformat: false, reviewer: null };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value == null || value.startsWith('--')) throw new Error(`${flag} requires a value`);
      i += 1;
      return value;
    };
    if (flag === '--kind') opts.kind = next();
    else if (flag === '--from') opts.from = path.resolve(next());
    else if (flag === '--reviewed') opts.reviewed = parseReviewed(next());
    else if (flag === '--story') opts.only = new Set(next().split(',').map((s) => s.trim()).filter(Boolean).map(normalizeId));
    else if (flag === '--dry-run') opts.dryRun = true;
    else if (flag === '--self-test') opts.selfTest = true;
    else if (flag === '--no-rebuild') opts.rebuild = false;
    else if (flag === '--allow-reformat') opts.allowReformat = true;
    else if (flag === '--reviewer') opts.reviewer = next();
    else throw new Error(`unknown argument ${flag}`);
  }
  if (!['banner', 'satire'].includes(opts.kind)) throw new Error('--kind must be banner or satire');
  if (opts.reviewer == null) opts.reviewer = opts.kind === 'satire' ? DEFAULT_SATIRE_REVIEWER : DEFAULT_REVIEWER;
  return opts;
}

function hashIndex(artDir) {
  const index = new Map();
  if (!fs.existsSync(artDir)) return index;
  return (async () => {
    for (const name of fs.readdirSync(artDir).filter((f) => /\.png$/i.test(f))) {
      const m = await measureArt(path.join(artDir, name));
      index.set(m.sha256, name);
    }
    return index;
  })();
}

/** Validate + normalize every candidate. Pure with respect to the repo (reads only). */
/**
 * Normalize one source raster, memoized on its CONTENT hash.
 *
 * S357 — `png({ compressionLevel: 9, adaptiveFiltering: true })` at 1600x900 is
 * the most expensive single operation in this file, and the documented workflow
 * runs planIngest twice over the same staged batch (a --dry-run pass, then the
 * real pass), so every image was normalized twice for byte-identical output.
 * In --self-test, where both passes happen in one process over eight staged
 * rasters, that was most of a 95s step — 43.3% of build:check's parallel
 * segment, which tripped the concentration ratchet the first time a run ever
 * got far enough to observe it.
 *
 * The key is the source's own sha256, which planIngest has already computed by
 * this point, so a changed file can never hit a stale entry. This is a cache of
 * a pure function: the bytes and every assertion made about them are unchanged.
 */
const normalizedCache = new Map();
// Pure encodings repeat across review plans. Keep validation outside the cache,
// and bind banner results to the complete overlay as well as the raster bytes.
const panelDerivativeCache = new Map();
const satireDerivativeCache = new Map();
export async function cachedDerivatives(cache, key, render) {
  if (cache.has(key)) return cache.get(key);
  const result = await render(); // a rejected render never enters the cache
  if (cache.size >= 16) cache.delete(cache.keys().next().value);
  cache.set(key, result);
  return result;
}
export async function normalizeRaster(source, sourceSha) {
  const hit = normalizedCache.get(sourceSha);
  if (hit) return hit;
  const buffer = await sharp(source)
    .resize({ width: NORMALIZED_MAX.width, height: NORMALIZED_MAX.height, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  normalizedCache.set(sourceSha, buffer);
  return buffer;
}

export async function planIngest({ root = ROOT, from = DEFAULT_FROM, reviewed = null, only = null, renderDerivatives = renderPanelDerivatives } = {}) {
  const plan = { accepted: [], skipped: [], rejected: [] };
  if (!fs.existsSync(from)) return plan;
  const artDir = path.join(root, 'data', 'news-desk', 'art');
  const existing = await hashIndex(artDir);
  const batchHashes = new Map();
  const dirs = fs.readdirSync(from, { withFileTypes: true }).filter((d) => d.isDirectory() && ID_RE.test(d.name)).map((d) => d.name).sort();
  for (const id of dirs) {
    if (only && !only.has(id)) continue;
    const source = path.join(from, id, 'art.png');
    if (!fs.existsSync(source)) { plan.skipped.push({ id, reason: 'no art.png' }); continue; }
    const [, date, slug] = ID_RE.exec(id);
    const reject = (reason) => plan.rejected.push({ id, reason });
    const dayFile = path.join(root, 'data', 'news-desk', 'days', `${date}.json`);
    const day = fs.existsSync(dayFile) ? JSON.parse(fs.readFileSync(dayFile, 'utf8')) : null;
    const story = day?.stories?.find((s) => s.slug === slug);
    if (!day || day.simulated !== false || !story) { reject('no committed public story with this id'); continue; }
    const m = await measureArt(source);
    if (m.format !== 'png') { reject(`not a PNG (decoded as ${m.format})`); continue; }
    if (!(m.width >= PANEL_WIDTH && m.height >= PANEL_HEIGHT)) { reject(`too small ${m.width}x${m.height} (need ≥${PANEL_WIDTH}x${PANEL_HEIGHT})`); continue; }
    const aspect = m.width / m.height;
    if (aspect < 1.6 || aspect > 2.1) { reject(`aspect ${aspect.toFixed(2)} outside 1.6–2.1 (panel crop would destroy the composition)`); continue; }
    if (!(m.entropy >= REAL_ART_ENTROPY_FLOOR)) { reject(`entropy ${m.entropy} below real-art floor ${REAL_ART_ENTROPY_FLOOR} (flat, blank or diagram-like)`); continue; }
    if (batchHashes.has(m.sha256)) { reject(`identical pixels to ${batchHashes.get(m.sha256)} in this batch`); continue; }
    batchHashes.set(m.sha256, id);
    const buffer = await normalizeRaster(source, m.sha256);
    const n = await measureArt(buffer);
    const current = story.visual?.artSource ? path.join(root, story.visual.artSource) : null;
    const currentSha = current && fs.existsSync(current) ? (await measureArt(current)).sha256 : null;
    if (currentSha === n.sha256) { plan.skipped.push({ id, reason: 'already ingested (art on disk matches)' }); continue; }
    const duplicateOf = existing.get(m.sha256) || existing.get(n.sha256);
    if (duplicateOf) { reject(`identical pixels to existing Desk art ${duplicateOf}`); continue; }
    if (!(n.width >= PANEL_WIDTH && n.height >= PANEL_HEIGHT && n.entropy >= REAL_ART_ENTROPY_FLOOR)) { reject(`normalized raster failed re-measure (${n.width}x${n.height}, entropy ${n.entropy})`); continue; }
    const persona = PERSONAS.find((p) => p.id === story.memeLine?.personaId);
    let budget = 'skipped (story has no meme line; build renders no panel)';
    if (persona && story.memeLine?.text) {
      const overlay = renderEditorialOverlaySvg(storyMemeOverlayOptions({ date, text: story.memeLine.text, persona }));
      const derivatives = renderDerivatives === renderPanelDerivatives
        ? await cachedDerivatives(panelDerivativeCache, `${n.sha256}\n${overlay}`, () => renderPanelDerivatives(buffer, overlay))
        : await renderDerivatives(buffer, overlay);
      const failures = panelBudgetFailures(derivatives);
      if (failures.length) { reject(`panel budget preflight failed: ${failures.join('; ')}`); continue; }
      budget = Object.fromEntries(Object.entries(derivatives).map(([ext, buf]) => [ext, buf.length]));
    }
    const entry = { id, date, slug, dayFile, source, buffer, measured: n, original: { width: m.width, height: m.height, sha256: m.sha256 }, budget };
    if (reviewed) {
      if (!reviewed.has(id)) { plan.skipped.push({ id, reason: 'awaiting operator visual review (not listed in --reviewed)', validated: true }); continue; }
      const approvedHash = typeof reviewed.get === 'function' ? reviewed.get(id) : null;
      const shortSha = n.sha256.slice(0, 16);
      if (approvedHash) {
        // The approval names the bytes that were looked at. Anything else — a
        // --force re-roll above all — is refused rather than published under an
        // "operator visual review" receipt it never received.
        if (!(n.sha256.startsWith(approvedHash) || m.sha256.startsWith(approvedHash))) {
          reject(`staged image does not match the approved hash ${approvedHash} (staged normalizes to ${shortSha}…): look at the image you actually have, then approve it as ${id}@${shortSha}`);
          continue;
        }
        entry.approvedHash = approvedHash;
      } else {
        const reroll = detectReroll({ story, from, id, stagedSha: m.sha256, normalizedSha: n.sha256 });
        if (reroll.rerolled) {
          reject(`a plain-id approval is not accepted after a re-roll (${reroll.reason}); re-review the current image and approve it as ${id}@${shortSha}`);
          continue;
        }
      }
    }
    plan.accepted.push(entry);
  }
  return plan;
}

/** Rebind a story's visual receipt to a reviewed source raster. */
export function applyVisualReceipt(story, measured, { reviewer = DEFAULT_REVIEWER, reviewedAt = new Date().toISOString().slice(0, 10) } = {}) {
  story.visual.pixelInspection = {
    sha256: measured.sha256,
    reviewed: true,
    reviewer,
    semanticVerified: false,
    kind: SOURCE_RASTER_KIND,
    entropy: measured.entropy,
    width: measured.width,
    height: measured.height,
    bytes: measured.bytes,
    reviewedAt,
  };
  story.visual.generatedArt = true;
  return story;
}

/** Write accepted art + receipts. Refuses a day whose JSON would be reformatted, or any new visual-contract error. */
export async function applyIngest(plan, { root = ROOT, allowReformat = false, reviewer = DEFAULT_REVIEWER, reviewedAt } = {}) {
  const written = [];
  const refused = [];
  const byDay = new Map();
  for (const entry of plan.accepted) byDay.set(entry.dayFile, [...(byDay.get(entry.dayFile) || []), entry]);
  for (const [dayFile, entries] of byDay) {
    const raw = fs.readFileSync(dayFile, 'utf8');
    const day = JSON.parse(raw);
    if (!allowReformat && `${JSON.stringify(day, null, 2)}\n` !== raw) {
      for (const entry of entries) refused.push({ id: entry.id, reason: `${path.basename(dayFile)} is not canonical 2-space JSON; rerun with --allow-reformat after checking the diff` });
      continue;
    }
    const ok = [];
    for (const entry of entries) {
      const story = day.stories.find((s) => s.slug === entry.slug);
      const before = new Set(validateStoryVisual(story.visual, { story, date: day.date }));
      const snapshot = JSON.stringify(story.visual);
      applyVisualReceipt(story, entry.measured, { reviewer, reviewedAt });
      const added = validateStoryVisual(story.visual, { story, date: day.date }).filter((error) => !before.has(error));
      if (added.length) {
        story.visual = JSON.parse(snapshot);
        refused.push({ id: entry.id, reason: `receipt would add visual-contract errors: ${added.join('; ')}` });
        continue;
      }
      ok.push(entry);
    }
    if (!ok.length) continue;
    for (const entry of ok) {
      const story = day.stories.find((s) => s.slug === entry.slug);
      const target = path.resolve(root, story.visual.artSource);
      const artRoot = path.resolve(root, 'data', 'news-desk', 'art') + path.sep;
      if (!target.startsWith(artRoot)) throw new Error(`${entry.id}: artSource escapes data/news-desk/art/`);
      fs.writeFileSync(target, entry.buffer);
      written.push(entry.id);
    }
    fs.writeFileSync(dayFile, `${JSON.stringify(day, null, 2)}\n`);
  }
  return { written, refused };
}

export function rebuildCommand(ids, { root = ROOT } = {}) {
  return {
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'build-news-desk.mjs'), '--rebuild', '--refresh-art-only', ids.map((id) => id.replace('--', '/')).join(',')],
    options: { cwd: root, stdio: 'inherit', windowsHide: true, shell: false },
  };
}

function runRebuild(ids, { root = ROOT, run = spawnSync, kind = 'banner' } = {}) {
  const { cmd, args, options } = kind === 'satire' ? satireRebuildCommand(ids, { root }) : rebuildCommand(ids, { root });
  return run(cmd, args, options);
}

/* ── D-S368.7 satire cartoons ─────────────────────────────────────────── */

/** Normalize a cartoon: fit inside 1200x1200 (never enlarge), PNG level 9, metadata stripped. Memoized on content. */
const normalizedSatireCache = new Map();
export async function normalizeSatireRaster(source, sourceSha) {
  const hit = normalizedSatireCache.get(sourceSha);
  if (hit) return hit;
  const buffer = await sharp(source)
    .resize({ width: SATIRE_CARTOON_MAX.width, height: SATIRE_CARTOON_MAX.height, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  normalizedSatireCache.set(sourceSha, buffer);
  return buffer;
}

/**
 * Validate + normalize every staged <id>/satire.png. Reads only. The same
 * review rules as the banner (plain id only without a detectable re-roll,
 * otherwise <id>@<hash>), plus one more: every approval must declare
 * +caricature or +none, because whether a real public figure is drawn is a
 * judgement only the reviewer can make, and it decides the page's label.
 */
export async function planSatireIngest({ root = ROOT, from = DEFAULT_FROM, reviewed = null, only = null, renderDerivatives = renderSatireDerivatives } = {}) {
  const plan = { accepted: [], skipped: [], rejected: [] };
  if (!fs.existsSync(from)) return plan;
  const existing = await hashIndex(path.join(root, 'data', 'news-desk', 'art'));
  const batchHashes = new Map();
  const dirs = fs.readdirSync(from, { withFileTypes: true }).filter((d) => d.isDirectory() && ID_RE.test(d.name)).map((d) => d.name).sort();
  for (const id of dirs) {
    if (only && !only.has(id)) continue;
    const source = path.join(from, id, 'satire.png');
    if (!fs.existsSync(source)) { plan.skipped.push({ id, reason: 'no satire.png' }); continue; }
    const [, date, slug] = ID_RE.exec(id);
    const reject = (reason) => plan.rejected.push({ id, reason });
    const dayFile = path.join(root, 'data', 'news-desk', 'days', `${date}.json`);
    const day = fs.existsSync(dayFile) ? JSON.parse(fs.readFileSync(dayFile, 'utf8')) : null;
    const story = day?.stories?.find((s) => s.slug === slug);
    if (!day || day.simulated !== false || !story) { reject('no committed public story with this id'); continue; }
    const persona = PERSONAS.find((p) => p.id === story.memeLine?.personaId);
    const brief = satireCartoonBrief({ story, persona });
    if (!brief) { reject('story has no meme line with a known persona; a satire cartoon credits that voice'); continue; }
    // The alt text is derived from the generation brief. If the story's joke
    // changed after the cartoon was generated, the picture no longer matches.
    const metaFile = path.join(from, id, 'satire-meta.json');
    const meta = fs.existsSync(metaFile) ? (() => { try { return JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch { return null; } })() : null;
    if (meta?.alt && meta.alt !== brief.alt) { reject('the story\'s satire fields or meme line changed after this cartoon was generated; re-roll it with --kind satire --story <id> --force'); continue; }
    const m = await measureArt(source);
    if (m.format !== 'png') { reject(`not a PNG (decoded as ${m.format})`); continue; }
    if (!(m.width >= SATIRE_CARTOON_MIN.width && m.height >= SATIRE_CARTOON_MIN.height)) { reject(`too small ${m.width}x${m.height} (need ≥${SATIRE_CARTOON_MIN.width}x${SATIRE_CARTOON_MIN.height})`); continue; }
    const aspect = m.width / m.height;
    if (aspect < SATIRE_CARTOON_ASPECT.min || aspect > SATIRE_CARTOON_ASPECT.max) { reject(`aspect ${aspect.toFixed(2)} is not square (${SATIRE_CARTOON_ASPECT.min}–${SATIRE_CARTOON_ASPECT.max})`); continue; }
    if (!(m.entropy >= SATIRE_CARTOON_ENTROPY_FLOOR)) { reject(`entropy ${m.entropy} below cartoon floor ${SATIRE_CARTOON_ENTROPY_FLOOR} (blank or near-blank)`); continue; }
    if (batchHashes.has(m.sha256)) { reject(`identical pixels to ${batchHashes.get(m.sha256)} in this batch`); continue; }
    batchHashes.set(m.sha256, id);
    const buffer = await normalizeSatireRaster(source, m.sha256);
    const n = await measureArt(buffer);
    if (story.visual?.satireCartoon?.sha256 === n.sha256) { plan.skipped.push({ id, reason: 'already ingested (satire cartoon receipt matches)' }); continue; }
    const duplicateOf = existing.get(m.sha256) || existing.get(n.sha256);
    if (duplicateOf) { reject(`identical pixels to existing Desk art ${duplicateOf}`); continue; }
    const derivatives = renderDerivatives === renderSatireDerivatives
      ? await cachedDerivatives(satireDerivativeCache, n.sha256, () => renderSatireDerivatives(buffer))
      : await renderDerivatives(buffer);
    const failures = satireBudgetFailures(derivatives);
    if (failures.length) { reject(`satire budget preflight failed: ${failures.join('; ')}`); continue; }
    const budget = Object.fromEntries(Object.entries(derivatives).map(([suffix, buf]) => [suffix, buf.length]));
    const entry = { id, date, slug, dayFile, source, buffer, measured: n, original: { width: m.width, height: m.height, sha256: m.sha256 }, budget, brief, promptSha256: meta?.promptSha256 || null };
    if (reviewed) {
      if (!reviewed.has(id)) { plan.skipped.push({ id, reason: 'awaiting operator satire review (not listed in --reviewed)', validated: true }); continue; }
      const marker = reviewed.markers?.get(id) || null;
      const shortSha = n.sha256.slice(0, 16);
      if (!marker) { reject(`declare the review decision: approve as ${id}@${shortSha}+caricature (shows a real public figure) or ${id}@${shortSha}+none`); continue; }
      const approvedHash = reviewed.get(id);
      if (approvedHash) {
        if (!(n.sha256.startsWith(approvedHash) || m.sha256.startsWith(approvedHash))) {
          reject(`staged cartoon does not match the approved hash ${approvedHash} (staged normalizes to ${shortSha}…): look at the cartoon you actually have, then approve it as ${id}@${shortSha}+${marker}`);
          continue;
        }
        entry.approvedHash = approvedHash;
      } else {
        const reroll = detectReroll({ story, from, id, stagedSha: m.sha256, normalizedSha: n.sha256, kind: 'satire' });
        if (reroll.rerolled) { reject(`a plain-id approval is not accepted after a re-roll (${reroll.reason}); re-review the current cartoon and approve it as ${id}@${shortSha}+${marker}`); continue; }
      }
      entry.caricature = marker === 'caricature';
    }
    plan.accepted.push(entry);
  }
  return plan;
}

/** The story's satire-cartoon record (data contract, D-S368.7). */
export function satireCartoonRecord({ date, slug, measured, brief, caricature, reviewer = DEFAULT_SATIRE_REVIEWER, reviewedAt = new Date().toISOString().slice(0, 10), promptSha256 = null }) {
  return {
    artSource: satireCartoonArtSource(date, slug),
    kind: SATIRE_CARTOON_KIND,
    alt: brief.alt,
    caption: brief.caption,
    persona: brief.personaId,
    register: brief.register,
    caricature: caricature === true,
    reviewer,
    reviewedAt,
    semanticVerified: false,
    sha256: measured.sha256,
    width: measured.width,
    height: measured.height,
    bytes: measured.bytes,
    entropy: measured.entropy,
    ...(promptSha256 ? { promptSha256 } : {}),
  };
}

/** Write accepted cartoons + records. Same canonical-JSON and contract-regression refusals as applyIngest. */
export async function applySatireIngest(plan, { root = ROOT, allowReformat = false, reviewer = DEFAULT_SATIRE_REVIEWER, reviewedAt } = {}) {
  const written = [];
  const refused = [];
  const byDay = new Map();
  for (const entry of plan.accepted) byDay.set(entry.dayFile, [...(byDay.get(entry.dayFile) || []), entry]);
  for (const [dayFile, entries] of byDay) {
    const raw = fs.readFileSync(dayFile, 'utf8');
    const day = JSON.parse(raw);
    if (!allowReformat && `${JSON.stringify(day, null, 2)}\n` !== raw) {
      for (const entry of entries) refused.push({ id: entry.id, reason: `${path.basename(dayFile)} is not canonical 2-space JSON; rerun with --allow-reformat after checking the diff` });
      continue;
    }
    const ok = [];
    for (const entry of entries) {
      if (typeof entry.caricature !== 'boolean') { refused.push({ id: entry.id, reason: 'no +caricature/+none review decision recorded' }); continue; }
      const story = day.stories.find((s) => s.slug === entry.slug);
      const record = satireCartoonRecord({ date: day.date, slug: entry.slug, measured: entry.measured, brief: entry.brief, caricature: entry.caricature, reviewer, reviewedAt, promptSha256: entry.promptSha256 });
      const errors = validateSatireCartoon(record, { story, date: day.date });
      if (errors.length) { refused.push({ id: entry.id, reason: `record fails the satire-cartoon contract: ${errors.join('; ')}` }); continue; }
      story.visual.satireCartoon = record;
      ok.push(entry);
    }
    if (!ok.length) continue;
    const artRoot = path.resolve(root, 'data', 'news-desk', 'art') + path.sep;
    for (const entry of ok) {
      const story = day.stories.find((s) => s.slug === entry.slug);
      const target = path.resolve(root, story.visual.satireCartoon.artSource);
      if (!target.startsWith(artRoot)) throw new Error(`${entry.id}: satire artSource escapes data/news-desk/art/`);
      fs.writeFileSync(target, entry.buffer);
      written.push(entry.id);
    }
    fs.writeFileSync(dayFile, `${JSON.stringify(day, null, 2)}\n`);
  }
  return { written, refused };
}

export function satireRebuildCommand(ids, { root = ROOT } = {}) {
  return {
    cmd: process.execPath,
    args: [path.join(root, 'scripts', 'build-news-desk.mjs'), '--rebuild', '--refresh-satire-only', ids.map((id) => id.replace('--', '/')).join(',')],
    options: { cwd: root, stdio: 'inherit', windowsHide: true, shell: false },
  };
}

async function mainSatire(opts) {
  if (!opts.dryRun && !opts.reviewed) {
    console.error('ingest-news-art --kind satire: refusing — --reviewed <id@hash+caricature|none,...> is required. Look at each staged satire.png first.');
    return 2;
  }
  const plan = await planSatireIngest({ from: opts.from, reviewed: opts.dryRun ? null : opts.reviewed, only: opts.only });
  const mark = opts.dryRun ? '(dry-run) ' : '';
  for (const e of plan.accepted) {
    const listed = opts.reviewed?.has(e.id) ? `reviewed${typeof e.caricature === 'boolean' ? (e.caricature ? ' +caricature' : ' +none') : ''}` : 'NOT YET REVIEWED';
    console.log(`${mark}✓ valid satire ${e.id} ${e.original.width}x${e.original.height} → ${e.measured.width}x${e.measured.height} sha=${e.measured.sha256.slice(0, 16)} entropy=${e.measured.entropy} ${e.brief.personaName}/${e.brief.register} derivatives=${JSON.stringify(e.budget)} [${listed}]`);
  }
  for (const s of plan.skipped) console.log(`${mark}· skip ${s.id}: ${s.reason}`);
  for (const r of plan.rejected) console.log(`${mark}✗ reject ${r.id}: ${r.reason}`);
  if (opts.dryRun) return plan.rejected.length ? 1 : 0;
  if (!plan.accepted.length) {
    console.log('ingest-news-art --kind satire: nothing to ingest.');
    return plan.rejected.length ? 1 : 0;
  }
  const { written, refused } = await applySatireIngest(plan, { allowReformat: opts.allowReformat, reviewer: opts.reviewer });
  for (const r of refused) console.error(`✗ refused ${r.id}: ${r.reason}`);
  if (!written.length) return 1;
  console.log(`\nwrote ${written.length} satire cartoon(s) + records: ${written.join(', ')}`);
  const ids = written.map((id) => id.replace('--', '/')).join(',');
  if (opts.rebuild) {
    const result = runRebuild(written, { kind: 'satire' });
    if (result.status !== 0) {
      console.error(`✗ scoped rebuild failed — cartoons + records are written; fix the error and rerun:\n  node scripts/build-news-desk.mjs --rebuild --refresh-satire-only ${ids}`);
      return 1;
    }
  } else {
    console.log(`next: node scripts/build-news-desk.mjs --rebuild --refresh-satire-only ${ids}`);
  }
  console.log('\nThen (see docs/DESK_ART_WORKER.md): regenerate news pages, do the CANON-053 rendered-pixel review, run build:check, commit.');
  return refused.length ? 1 : 0;
}

async function main(opts) {
  if (opts.kind === 'satire') return mainSatire(opts);
  if (!opts.dryRun && !opts.reviewed) {
    console.error('ingest-news-art: refusing — --reviewed <ids|file> is required. Look at each staged art.png first, then list the ids you accept.');
    return 2;
  }
  const plan = await planIngest({ from: opts.from, reviewed: opts.dryRun ? null : opts.reviewed, only: opts.only });
  const mark = opts.dryRun ? '(dry-run) ' : '';
  for (const e of plan.accepted) {
    const listed = opts.reviewed?.has(e.id) ? 'reviewed' : 'NOT YET REVIEWED';
    console.log(`${mark}✓ valid ${e.id} ${e.original.width}x${e.original.height} → ${e.measured.width}x${e.measured.height} entropy=${e.measured.entropy} panel=${JSON.stringify(e.budget)} [${listed}]`);
  }
  for (const s of plan.skipped) console.log(`${mark}· skip ${s.id}: ${s.reason}`);
  for (const r of plan.rejected) console.log(`${mark}✗ reject ${r.id}: ${r.reason}`);
  if (opts.reviewed) {
    const known = new Set([...plan.accepted, ...plan.skipped, ...plan.rejected].map((x) => x.id));
    for (const id of opts.reviewed.keys()) if (!known.has(id)) console.log(`${mark}? reviewed id ${id} has no staged art.png in ${opts.from}`);
  }
  if (opts.dryRun) return plan.rejected.length ? 1 : 0;
  if (!plan.accepted.length) {
    console.log('ingest-news-art: nothing to ingest.');
    return plan.rejected.length ? 1 : 0;
  }
  const { written, refused } = await applyIngest(plan, { allowReformat: opts.allowReformat, reviewer: opts.reviewer });
  for (const r of refused) console.error(`✗ refused ${r.id}: ${r.reason}`);
  if (!written.length) return 1;
  console.log(`\nwrote ${written.length} source raster(s) + receipts: ${written.join(', ')}`);
  if (opts.rebuild) {
    const result = runRebuild(written);
    if (result.status !== 0) {
      console.error('✗ scoped rebuild failed — art + receipts are written; fix the error and rerun:');
      console.error(`  node scripts/build-news-desk.mjs --rebuild --refresh-art-only ${written.map((id) => id.replace('--', '/')).join(',')}`);
      return 1;
    }
  } else {
    console.log(`next: node scripts/build-news-desk.mjs --rebuild --refresh-art-only ${written.map((id) => id.replace('--', '/')).join(',')}`);
  }
  console.log('\nThen (see docs/DESK_ART_WORKER.md): regenerate LQIP + news pages + visual receipts, do the CANON-053 rendered-pixel review, run build:check, commit.');
  console.log('More art: node scripts/generate-news-art-codex.mjs --dry-run');
  return refused.length ? 1 : 0;
}

/* ── Self-test: temp repo fixture, never real data ─────────────────────── */

async function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push({ name, ok: Boolean(ok) });
  // Exercise each real full-size codec pipeline once. Review, receipt, reroll,
  // duplicate and write-policy cases reuse those known-good encoded fixtures;
  // they still measure and normalize every candidate's actual source pixels.
  // Injected fixtures never enter the production derivative caches.
  let bannerEncoding, satireEncoding, bannerEncodes = 0, satireEncodes = 0;
  const policyBanner = async (buffer, overlay) => {
    if (!bannerEncoding) { bannerEncodes++; bannerEncoding = await renderPanelDerivatives(buffer, overlay); }
    return bannerEncoding;
  };
  const policySatire = async (buffer) => {
    if (!satireEncoding) { satireEncodes++; satireEncoding = await renderSatireDerivatives(buffer); }
    return satireEncoding;
  };
  const policyPlanIngest = (options) => planIngest({ ...options, renderDerivatives: policyBanner });
  const policyPlanSatireIngest = (options) => planSatireIngest({ ...options, renderDerivatives: policySatire });
  const memo = new Map();
  let renders = 0;
  const render = async () => ({ png: Buffer.from(String(++renders)) });
  const first = await cachedDerivatives(memo, 'raster\noverlay-a', render);
  const repeated = await cachedDerivatives(memo, 'raster\noverlay-a', render);
  const changed = await cachedDerivatives(memo, 'raster\noverlay-b', render);
  t('derivative cache reuses only identical raster and overlay inputs', first === repeated && first !== changed && renders === 2);
  for (let i = 0; i < 16; i++) await cachedDerivatives(memo, `other-${i}`, render);
  t('derivative cache remains bounded and evicts the oldest encoding', memo.size === 16 && !memo.has('raster\noverlay-a'));
  let rejected = false;
  try { await cachedDerivatives(memo, 'failed', async () => { throw new Error('fixture encoder failure'); }); } catch { rejected = true; }
  t('failed encodings are not cached', rejected && !memo.has('failed'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-art-ingest-selftest-'));
  try {
    const root = path.join(tmp, 'repo');
    const daysDir = path.join(root, 'data', 'news-desk', 'days');
    const artDir = path.join(root, 'data', 'news-desk', 'art');
    const from = path.join(tmp, 'staging');
    fs.mkdirSync(daysDir, { recursive: true });
    fs.mkdirSync(artDir, { recursive: true });
    const date = '2026-09-12';
    const persona = PERSONAS[0];
    const mkStory = (slug) => ({
      slug,
      headline: `Headline ${slug}`,
      memeLine: { text: 'The cabinet grows; the harbor stays empty.', personaId: persona.id },
      visual: {
        artSource: `data/news-desk/art/${date}--${slug}.png`,
        scene: 'A towering filing cabinet swallows a queue of tiny paper boats while a lighthouse points its beam at an empty harbor.',
        alt: 'A towering filing cabinet swallows a queue of tiny paper boats while a lighthouse beam sweeps an empty harbor at night.',
        anchors: [], relationships: [],
        pixelInspection: { sha256: '', reviewed: false, reviewer: 'scripts/generate-news-art.mjs procedural fallback pixel-integrity review (real illustration pending)', semanticVerified: false, kind: 'procedural-fallback' },
        generatedArt: false,
        satire: { target: 'Institutions that audit the harbor instead of the boats', setup: 'Every boat must file a manifest before it may float at all', payoff: 'The cabinet grows every quarter while the harbor stays empty', institutional: true },
      },
    });
    const slugs = ['good', 'unreviewed', 'flat', 'small', 'twin-of-good', 'dup-existing', 'reroll', 'orphan-missing-story-x'];
    const day = { date, simulated: false, stories: slugs.slice(0, 7).map(mkStory) };
    const dayFile = path.join(daysDir, `${date}.json`);
    fs.writeFileSync(dayFile, `${JSON.stringify(day, null, 2)}\n`);
    for (const story of day.stories) {
      fs.writeFileSync(path.join(root, story.visual.artSource), await sharp(Buffer.from(renderFallbackArtSvg(story, date))).png().toBuffer());
    }
    const existingReal = await renderSyntheticRasterFixture('existing-real', 1600, 900);
    fs.writeFileSync(path.join(artDir, '2026-08-01--older-real.png'), existingReal);
    const stage = async (slug, buffer) => { fs.mkdirSync(path.join(from, `${date}--${slug}`), { recursive: true }); fs.writeFileSync(path.join(from, `${date}--${slug}`, 'art.png'), buffer); };
    const goodBuffer = await renderSyntheticRasterFixture('good', 1536, 864);
    await stage('good', goodBuffer);
    await stage('unreviewed', await renderSyntheticRasterFixture('unreviewed', 1536, 864));
    await stage('flat', await sharp(Buffer.from(renderFallbackArtSvg({ slug: 'flat' }, date))).resize(1536, 864).png().toBuffer());
    await stage('small', await renderSyntheticRasterFixture('small', 800, 450));
    await stage('twin-of-good', goodBuffer);
    await stage('dup-existing', existingReal);
    await stage('reroll', await renderSyntheticRasterFixture('reroll', 1536, 864));
    // A --force re-roll leaves the rejected generation behind as art.invalid-*.png.
    fs.writeFileSync(path.join(from, `${date}--reroll`, 'art.invalid-1700000000000.png'), existingReal);
    await stage('orphan-missing-story-x', await renderSyntheticRasterFixture('orphan', 1536, 864));
    fs.mkdirSync(path.join(from, 'not-an-id'), { recursive: true });

    const reviewed = parseReviewed('2026-09-12--good, 2026-09-12/flat,2026-09-12--small,2026-09-12--twin-of-good,2026-09-12--dup-existing', { exists: () => false });
    t('parseReviewed normalizes date/slug and date--slug inline lists', reviewed.has('2026-09-12--flat') && reviewed.size === 5);
    t('parseReviewed reads a file with # comments', parseReviewed('x', { exists: () => true, read: () => '# looked at these\n2026-09-12--good\n2026-09-12/flat # ok\n' }).size === 2);

    const dayRawBefore = fs.readFileSync(dayFile, 'utf8');
    const goodArtBefore = fs.readFileSync(path.join(artDir, `${date}--good.png`));
    const dry = await policyPlanIngest({ root, from, reviewed: null });
    const missingBannerFormats = await planIngest({ root, from, renderDerivatives: async () => ({}) });
    t('an injected encoder cannot bypass the banner format budgets', missingBannerFormats.rejected.some((r) => r.id === `${date}--good` && /budget preflight/.test(r.reason)));
    t('dry-run plan writes nothing', fs.readFileSync(dayFile, 'utf8') === dayRawBefore && Buffer.compare(fs.readFileSync(path.join(artDir, `${date}--good.png`)), goodArtBefore) === 0);
    t('dry-run validates unreviewed images too', dry.accepted.some((e) => e.id.endsWith('--unreviewed')));

    const plan = await policyPlanIngest({ root, from, reviewed });
    const reason = (id) => plan.rejected.find((r) => r.id === `${date}--${id}`)?.reason || '';
    t('reviewed + valid image is accepted', plan.accepted.map((e) => e.id).join(',') === `${date}--good`);
    t('unreviewed image is skipped, awaiting review', plan.skipped.some((s) => s.id === `${date}--unreviewed` && /awaiting operator visual review/.test(s.reason)));
    t('flat / diagram-like image is rejected on entropy', /entropy/.test(reason('flat')));
    t('undersized image is rejected', /too small/.test(reason('small')));
    t('image identical to another in the batch is rejected', /in this batch/.test(reason('twin-of-good')));
    t('image identical to existing Desk art is rejected', /existing Desk art/.test(reason('dup-existing')));
    t('image with no committed story is rejected', /no committed public story/.test(reason('orphan-missing-story-x')));
    t('accepted image passed the panel budget preflight', typeof plan.accepted[0]?.budget === 'object' && plan.accepted[0].budget['.avif'] > 0);
    t('normalized raster fits inside 1600x900', plan.accepted[0].measured.width <= 1600 && plan.accepted[0].measured.height <= 900);

    const { written, refused } = await applyIngest(plan, { root, reviewedAt: '2026-09-14' });
    const after = JSON.parse(fs.readFileSync(dayFile, 'utf8'));
    const story = after.stories.find((s) => s.slug === 'good');
    const onDisk = await measureArt(path.join(artDir, `${date}--good.png`));
    t('ingest writes exactly the reviewed story', written.join(',') === `${date}--good` && refused.length === 0);
    t('receipt sha256 binds the written raster', story.visual.pixelInspection.sha256 === onDisk.sha256);
    t('receipt: source-raster, reviewed, operator reviewer, semanticVerified false, generatedArt true',
      story.visual.pixelInspection.kind === SOURCE_RASTER_KIND && story.visual.pixelInspection.reviewed === true
      && story.visual.pixelInspection.reviewer === DEFAULT_REVIEWER && story.visual.pixelInspection.semanticVerified === false && story.visual.generatedArt === true
      && story.visual.pixelInspection.entropy >= REAL_ART_ENTROPY_FLOOR && story.visual.pixelInspection.reviewedAt === '2026-09-14');
    t('other stories are untouched', JSON.stringify(after.stories.find((s) => s.slug === 'unreviewed')) === JSON.stringify(day.stories.find((s) => s.slug === 'unreviewed')));
    t('day JSON stays canonical 2-space', `${JSON.stringify(after, null, 2)}\n` === fs.readFileSync(dayFile, 'utf8'));
    const again = await policyPlanIngest({ root, from, reviewed });
    t('re-running is idempotent (already ingested)', again.accepted.length === 0 && again.skipped.some((s) => s.id === `${date}--good` && /already ingested/.test(s.reason)));

    /* ── Hash-bound approval (the --force re-roll hole) ─────────────────── */
    t('parseReviewed accepts id@hash and lowercases it',
      parseReviewed('2026-09-12--unreviewed@9F2C1AB4', { exists: () => false }).get('2026-09-12--unreviewed') === '9f2c1ab4');
    t('parseReviewed keeps a plain id as a null hash',
      parseReviewed('2026-09-12--unreviewed', { exists: () => false }).get('2026-09-12--unreviewed') === null);
    let badHash = false;
    try { parseReviewed('2026-09-12--unreviewed@nothex!', { exists: () => false }); } catch { badHash = true; }
    t('parseReviewed rejects a malformed sha256 prefix', badHash);

    const unreviewedId = `${date}--unreviewed`;
    const plainPlan = await policyPlanIngest({ root, from, reviewed: new Map([[unreviewedId, null]]) });
    const stagedSha = plainPlan.accepted.find((e) => e.id === unreviewedId)?.measured.sha256 || '';
    t('plain id with no re-roll is still accepted', Boolean(stagedSha));

    const matched = await policyPlanIngest({ root, from, reviewed: new Map([[unreviewedId, stagedSha.slice(0, 12)]]) });
    t('approved id@hash matching the staged image ingests', matched.accepted.some((e) => e.id === unreviewedId && e.approvedHash === stagedSha.slice(0, 12)));

    const mismatched = await policyPlanIngest({ root, from, reviewed: new Map([[unreviewedId, 'deadbeefdeadbeef']]) });
    t('hash mismatch is refused with the hash to re-approve',
      mismatched.accepted.length === 0
      && /does not match the approved hash deadbeefdeadbeef/.test(mismatched.rejected.find((r) => r.id === unreviewedId)?.reason || '')
      && new RegExp(`approve it as ${unreviewedId}@`).test(mismatched.rejected.find((r) => r.id === unreviewedId)?.reason || ''));

    const rerollId = `${date}--reroll`;
    const rerollPlain = await policyPlanIngest({ root, from, reviewed: new Map([[rerollId, null]]) });
    t('plain id is refused after a discarded generation (re-roll)',
      rerollPlain.accepted.length === 0 && /plain-id approval is not accepted after a re-roll/.test(rerollPlain.rejected.find((r) => r.id === rerollId)?.reason || ''));
    const rerollSha = (await measureArt(await sharp(path.join(from, rerollId, 'art.png'))
      .resize({ width: NORMALIZED_MAX.width, height: NORMALIZED_MAX.height, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer())).sha256;
    const rerollHashed = await policyPlanIngest({ root, from, reviewed: new Map([[rerollId, rerollSha.slice(0, 16)]]) });
    t('the same re-rolled image ingests once it is approved by hash', rerollHashed.accepted.some((e) => e.id === rerollId));

    // A story that already carries a reviewed source-raster receipt for other
    // pixels is the strongest re-roll signal: plain-id approval must not pass.
    const patched = JSON.parse(fs.readFileSync(dayFile, 'utf8'));
    patched.stories.find((s) => s.slug === 'reroll').visual.pixelInspection = {
      sha256: 'a'.repeat(64), reviewed: true, reviewer: DEFAULT_REVIEWER, semanticVerified: false, kind: SOURCE_RASTER_KIND,
    };
    fs.writeFileSync(dayFile, `${JSON.stringify(patched, null, 2)}\n`);
    const afterReview = await policyPlanIngest({ root, from, reviewed: new Map([[rerollId, null]]) });
    t('plain id is refused when a prior reviewed receipt binds different pixels',
      /already carries a reviewed source-raster receipt/.test(afterReview.rejected.find((r) => r.id === rerollId)?.reason || ''));
    fs.writeFileSync(dayFile, `${JSON.stringify(JSON.parse(fs.readFileSync(dayFile, 'utf8')), null, 2)}\n`);

    fs.writeFileSync(dayFile, JSON.stringify(JSON.parse(fs.readFileSync(dayFile, 'utf8'))));
    const unreviewedPlan = await policyPlanIngest({ root, from, reviewed: new Set([`${date}--unreviewed`]) });
    const reformat = await applyIngest(unreviewedPlan, { root });
    t('non-canonical day JSON is refused without --allow-reformat', reformat.written.length === 0 && /--allow-reformat/.test(reformat.refused[0]?.reason || ''));

    /* ── D-S368.7 satire cartoons ─────────────────────────────────────── */
    fs.writeFileSync(dayFile, `${JSON.stringify(JSON.parse(fs.readFileSync(dayFile, 'utf8')), null, 2)}\n`);
    const markers = parseReviewed('2026-09-12--good@abcd1234+caricature, 2026-09-12/unreviewed+none, 2026-09-12--flat', { exists: () => false });
    t('parseReviewed records +caricature/+none review decisions and keeps the hash',
      markers.get('2026-09-12--good') === 'abcd1234' && markers.markers.get('2026-09-12--good') === 'caricature'
      && markers.markers.get('2026-09-12--unreviewed') === 'none' && !markers.markers.has('2026-09-12--flat'));
    let badMarker = false;
    try { parseReviewed('2026-09-12--good+maybe', { exists: () => false }); } catch { badMarker = true; }
    t('parseReviewed rejects an unknown review marker', badMarker);
    const stageSatire = async (slug, buffer, meta = null) => {
      const dir = path.join(from, `${date}--${slug}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'satire.png'), buffer);
      if (meta) fs.writeFileSync(path.join(dir, 'satire-meta.json'), JSON.stringify(meta));
    };
    const satirePersona = PERSONAS[0];
    const briefFor = (slug) => satireCartoonBrief({ story: JSON.parse(fs.readFileSync(dayFile, 'utf8')).stories.find((s) => s.slug === slug), persona: satirePersona });
    await stageSatire('good', await renderSyntheticRasterFixture('satire-good', 1024, 1024), { alt: briefFor('good').alt, promptSha256: 'f'.repeat(64) });
    await stageSatire('unreviewed', await renderSyntheticRasterFixture('satire-unreviewed', 1024, 1024));
    await stageSatire('flat', await renderSyntheticRasterFixture('satire-wide', 1500, 1100));
    await stageSatire('small', await renderSyntheticRasterFixture('satire-stale', 1024, 1024), { alt: 'AI-generated satirical cartoon drawn from an older version of this joke that no longer matches.' });
    const artBeforeSatire = fs.readFileSync(path.join(artDir, `${date}--good.png`));
    const satDry = await policyPlanSatireIngest({ root, from, reviewed: null });
    const missingSatireFormats = await planSatireIngest({ root, from, renderDerivatives: async () => ({}) });
    t('an injected encoder cannot bypass the satire format budgets', missingSatireFormats.rejected.some((r) => r.id === `${date}--good` && /budget preflight/.test(r.reason)));
    t('satire dry-run validates staged cartoons and writes nothing',
      satDry.accepted.some((e) => e.id === `${date}--good`) && !fs.existsSync(path.join(artDir, `${date}--good--satire.png`)));
    t('satire derivatives pass the budget preflight (png/webp/avif/640 webp)',
      ['.png', '.webp', '.avif', '--640.webp'].every((k) => satDry.accepted.find((e) => e.id === `${date}--good`)?.budget[k] > 0));
    const satReason = (plan, slug) => plan.rejected.find((r) => r.id === `${date}--${slug}`)?.reason || '';
    t('a non-square cartoon is rejected', /not square/.test(satReason(satDry, 'flat')));
    t('a cartoon generated from an older joke is rejected (derived alt mismatch)', /changed after this cartoon was generated/.test(satReason(satDry, 'small')));
    const noMarker = await policyPlanSatireIngest({ root, from, reviewed: parseReviewed(`${date}--good`, { exists: () => false }) });
    t('a satire approval without +caricature/+none is refused with the exact approval to use',
      noMarker.accepted.length === 0 && /\+caricature \(shows a real public figure\) or .*\+none/.test(satReason(noMarker, 'good')));
    const satPlan = await policyPlanSatireIngest({ root, from, reviewed: parseReviewed(`${date}--good+none,${date}--unreviewed+caricature`, { exists: () => false }) });
    t('reviewed cartoons with a decision are accepted', satPlan.accepted.map((e) => e.id).sort().join(',') === `${date}--good,${date}--unreviewed`);
    const satApplied = await applySatireIngest(satPlan, { root, reviewedAt: '2026-10-03' });
    const satDay = JSON.parse(fs.readFileSync(dayFile, 'utf8'));
    const goodCartoon = satDay.stories.find((s) => s.slug === 'good').visual.satireCartoon;
    const onDiskSatire = await measureArt(path.join(artDir, `${date}--good--satire.png`));
    t('satire ingest writes data/news-desk/art/<id>--satire.png and binds its sha256',
      satApplied.written.length === 2 && satApplied.refused.length === 0 && goodCartoon.sha256 === onDiskSatire.sha256
      && goodCartoon.artSource === `data/news-desk/art/${date}--good--satire.png`);
    t('satire record: derived alt, meme-line caption, persona + register, reviewer, kind, semanticVerified false, prompt hash',
      goodCartoon.alt === briefFor('good').alt && goodCartoon.caption === 'The cabinet grows; the harbor stays empty.'
      && goodCartoon.persona === satirePersona.id && goodCartoon.register === satirePersona.memeStyle && goodCartoon.reviewer === DEFAULT_SATIRE_REVIEWER
      && goodCartoon.kind === 'satire-cartoon' && goodCartoon.semanticVerified === false && goodCartoon.promptSha256 === 'f'.repeat(64) && goodCartoon.reviewedAt === '2026-10-03');
    t('the caricature decision is recorded exactly (+none → false, +caricature → true)',
      goodCartoon.caricature === false && satDay.stories.find((s) => s.slug === 'unreviewed').visual.satireCartoon.caricature === true);
    t('the satire record passes the shared contract validator', validateSatireCartoon(goodCartoon, { story: satDay.stories.find((s) => s.slug === 'good'), date }).length === 0);
    t('satire ingest leaves the banner raster and its receipt untouched',
      Buffer.compare(fs.readFileSync(path.join(artDir, `${date}--good.png`)), artBeforeSatire) === 0
      && satDay.stories.find((s) => s.slug === 'good').visual.pixelInspection.sha256 === story.visual.pixelInspection.sha256);
    t('satire day JSON stays canonical 2-space', `${JSON.stringify(satDay, null, 2)}\n` === fs.readFileSync(dayFile, 'utf8'));
    const satAgain = await policyPlanSatireIngest({ root, from, reviewed: parseReviewed(`${date}--good+none`, { exists: () => false }) });
    t('satire re-run is idempotent (already ingested)', satAgain.skipped.some((s) => s.id === `${date}--good` && /already ingested/.test(s.reason)));
    // A re-rolled cartoon (discarded satire.invalid-*.png) needs the @hash form.
    await stageSatire('good', await renderSyntheticRasterFixture('satire-good-v2', 1024, 1024));
    fs.writeFileSync(path.join(from, `${date}--good`, 'satire.invalid-1700000000000.png'), existingReal);
    const satReroll = await policyPlanSatireIngest({ root, from, reviewed: parseReviewed(`${date}--good+none`, { exists: () => false }) });
    t('a plain-id satire approval is refused after a re-roll', /plain-id approval is not accepted after a re-roll/.test(satReason(satReroll, 'good')));
    // Banner and satire re-roll evidence never cross-contaminate.
    fs.writeFileSync(path.join(from, 'results.ndjson'), `${JSON.stringify({ id: `${date}--unreviewed`, kind: 'satire', status: 'generated' })}\n${JSON.stringify({ id: `${date}--unreviewed`, kind: 'satire', status: 'generated' })}\n`);
    t('satire generation rows do not count as banner re-rolls', detectReroll({ from, id: `${date}--unreviewed` }).rerolled === false
      && detectReroll({ from, id: `${date}--unreviewed`, kind: 'satire' }).rerolled === true);
    fs.rmSync(path.join(from, 'results.ndjson'));
    const satCmd = satireRebuildCommand([`${date}--good`], { root });
    t('satire rebuild = build-news-desk --rebuild --refresh-satire-only, hidden window, no shell',
      satCmd.args.slice(1).join(' ') === `--rebuild --refresh-satire-only ${date}/good` && satCmd.options.windowsHide === true && satCmd.options.shell === false);
    t('parseArgs: --kind satire switches the default reviewer; a bad kind throws', (() => {
      let bad = false;
      try { parseArgs(['--kind', 'meme']); } catch { bad = true; }
      return parseArgs(['--kind', 'satire']).reviewer === DEFAULT_SATIRE_REVIEWER && parseArgs([]).reviewer === DEFAULT_REVIEWER && parseArgs([]).kind === 'banner' && bad;
    })());

    const command = rebuildCommand([`${date}--good`, '2026-09-11--other'], { root });
    t('scoped rebuild = build-news-desk --rebuild --refresh-art-only date/slug list, hidden window, no shell',
      command.args.slice(1).join(' ') === `--rebuild --refresh-art-only ${date}/good,2026-09-11/other` && command.options.windowsHide === true && command.options.shell === false);
    let captured = null;
    runRebuild([`${date}--good`], { root, run: (cmd, args, options) => { captured = { cmd, args, options }; return { status: 0 }; } });
    t('rebuild runner is invoked with node + the scoped args', captured?.cmd === process.execPath && captured.args.includes('--refresh-art-only'));
    t('art worker script exists alongside (generate-news-art-codex.mjs)', fs.existsSync(path.join(ROOT, 'scripts', 'generate-news-art-codex.mjs')));
    t('policy fixtures exercise the real banner codec pipeline exactly once', bannerEncodes === 1);
    t('policy fixtures exercise the real satire codec pipeline exactly once', satireEncodes === 1);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const failed = cases.filter((c) => !c.ok);
  for (const c of failed) console.error(`  ✗ ${c.name}`);
  console.log(`ingest-news-art --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  return failed.length ? 1 : 0;
}

const invokedDirectly = (() => {
  try {
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    const entry = fs.realpathSync(path.resolve(process.argv[1] || ''));
    return process.platform === 'win32' ? self.toLowerCase() === entry.toLowerCase() : self === entry;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ingest-news-art: ${error.message}`);
    process.exit(2);
  }
  (opts.selfTest ? selfTest() : main(opts))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`ingest-news-art: ${error.message}`);
      process.exit(1);
    });
}
