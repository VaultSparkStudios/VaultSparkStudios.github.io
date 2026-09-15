#!/usr/bin/env node
/**
 * Article-bound Desk art: scheduled-CI fallback renderer + pixel-integrity review.
 *
 * WHAT THIS IS (S356). The scheduled publisher (news-publish.yml) has no image
 * model. When a draft's source raster is missing it renders a PROCEDURAL
 * FALLBACK here so a slot is never dropped merely because real art is pending.
 * Real illustrations are produced later, locally and at zero marginal cost, by
 * scripts/generate-news-art-codex.mjs (Codex CLI image_generation on the
 * founder's ChatGPT plan) and accepted by scripts/ingest-news-art.mjs after an
 * operator visual review.
 *
 * WHY THE FALLBACK IS TEXT-FREE. Until S356 the fallback was a diagram card
 * (label, headline, SUBJECT→ACTION→OBJECT boxes, SOURCE ANCHOR boxes, footer).
 * The editorial overlay (lib/news-memes.mjs) was designed for text-free
 * paintings: its opaque label bar and caption panel covered the card's label,
 * clipped its headline and hid its boxes, so 25 stories shipped visibly broken
 * panels. The fallback is now an abstract, on-brand composition whose motif
 * lives entirely inside EDITORIAL_OVERLAY_ZONES.clearBand, with a clean top band
 * and a flat, low-detail lower region — nothing for the overlay to collide with.
 *
 * HOW FALLBACK ART IS FOUND AGAIN. Receipts carry `kind: "procedural-fallback"`
 * (or `"source-raster"`) plus the measured entropy. Legacy receipts predate the
 * field, so classification also measures the raster: fallback art has entropy
 * < FALLBACK_ENTROPY_CEILING (legacy card ≈2.1; real paintings 6.2–7.7). The
 * reviewer string alone is NOT trusted — 2026-08-21's real painting carries the
 * procedural reviewer string from its first render.
 *
 * It makes no semantic pixel claim (semanticVerified remains false).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  EDITORIAL_OVERLAY_ZONES,
  EDITORIAL_PANEL_BUDGETS,
  EDITORIAL_PANEL_ENCODINGS,
  renderEditorialOverlaySvg,
  storyMemeOverlayOptions,
} from './lib/news-memes.mjs';
import { validateArtKindReceipt } from './lib/news-desk.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_DIR = path.join(ROOT, '.cache', 'news-drafts');
const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};

export const FALLBACK_KIND = 'procedural-fallback';
export const SOURCE_RASTER_KIND = 'source-raster';
/** Reviewer string written by every pre-S356 run, fallback or not. */
export const LEGACY_PROCEDURAL_REVIEWER = 'scripts/generate-news-art.mjs direct pixel-integrity review';
export const FALLBACK_REVIEWER = 'scripts/generate-news-art.mjs procedural fallback pixel-integrity review (real illustration pending)';
export const PREPLACED_REVIEWER = 'scripts/generate-news-art.mjs direct pixel-integrity review (pre-placed raster)';
/** Fallback rasters measure below this; real illustrations measure well above. */
export const FALLBACK_ENTROPY_CEILING = 4;
/** Minimum entropy for an accepted real illustration (ingest + worker). */
export const REAL_ART_ENTROPY_FLOOR = 5;
export const PANEL_WIDTH = EDITORIAL_OVERLAY_ZONES.width;
export const PANEL_HEIGHT = EDITORIAL_OVERLAY_ZONES.height;

const round = (value, places = 1) => Number(value.toFixed(places));

/** Deterministic PRNG (FNV-1a seed → mulberry32) so each story's fallback is unique. */
function prng(seedText) {
  let h = 2166136261;
  for (const ch of String(seedText)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Motif geometry for a story's fallback. Every mark is bounded to the overlay's
 * clear band (with padding) so the label bar and caption panel never hide it.
 */
export function fallbackMotifGeometry(story, date) {
  const rnd = prng(`${date}/${story?.slug || story?.headline || 'desk'}`);
  const { clearBand } = EDITORIAL_OVERLAY_ZONES;
  const pad = 14;
  const top = clearBand.top + pad;
  const bottom = clearBand.bottom - pad;
  const cy = (top + bottom) / 2;
  const radius = (bottom - top) / 2;
  const cx = round(600 + (rnd() - 0.5) * 360);
  const rotation = round(rnd() * 90);
  const rayCount = 8 + Math.floor(rnd() * 5);
  const rays = Array.from({ length: rayCount }, (_, i) => {
    const angle = ((i / rayCount) * 360 + rotation + rnd() * 9) * (Math.PI / 180);
    const inner = radius * (0.46 + rnd() * 0.08);
    const outer = radius * (0.8 + rnd() * 0.17);
    return {
      x1: round(cx + Math.cos(angle) * inner), y1: round(cy + Math.sin(angle) * inner),
      x2: round(cx + Math.cos(angle) * outer), y2: round(cy + Math.sin(angle) * outer),
    };
  });
  const satellites = Array.from({ length: 6 }, () => {
    const r = round(2 + rnd() * 2.5);
    const leftSide = rnd() < 0.5;
    const x = leftSide ? round(90 + rnd() * Math.max(10, cx - radius - 150)) : round(cx + radius + 60 + rnd() * Math.max(10, 1110 - (cx + radius + 60)));
    return { x: Math.min(1110, x), y: round(top + r + rnd() * (bottom - top - 2 * r)), r };
  });
  return {
    cx, cy, radius, rotation, rays, satellites,
    rings: [radius, round(radius * (0.64 + rnd() * 0.08)), round(radius * (0.34 + rnd() * 0.06))],
    bounds: { top: cy - radius, bottom: cy + radius, left: cx - radius, right: cx + radius },
  };
}

/**
 * Text-free, overlay-compatible procedural fallback. No <text>, no labels, no
 * numbers — the overlay supplies every word on the published panel.
 */
export function renderFallbackArtSvg(story, date) {
  const g = fallbackMotifGeometry(story, date);
  const { clearBand } = EDITORIAL_OVERLAY_ZONES;
  const spark = (size) => `M0 ${-size} L${size * 0.22} ${-size * 0.22} L${size} 0 L${size * 0.22} ${size * 0.22} L0 ${size} L${-size * 0.22} ${size * 0.22} L${-size} 0 L${-size * 0.22} ${-size * 0.22}Z`;
  const ruleGap = g.radius + 26;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" viewBox="0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}">
  <rect width="${PANEL_WIDTH}" height="${PANEL_HEIGHT}" fill="#0b0f18"/>
  <rect y="${clearBand.top}" width="${PANEL_WIDTH}" height="${clearBand.bottom - clearBand.top}" fill="#111726"/>
  <g stroke="#ffc400" stroke-opacity="0.06" stroke-width="2">${[430, 505, 580].map((y) => `<path d="M60 ${y}H1140"/>`).join('')}</g>
  <g stroke="#ffc400" stroke-opacity="0.35" stroke-width="2">
    <path d="M80 ${g.cy}H${round(Math.max(80, g.cx - ruleGap))}"/>
    <path d="M${round(Math.min(1120, g.cx + ruleGap))} ${g.cy}H1120"/>
  </g>
  <g fill="none">
    <circle cx="${g.cx}" cy="${g.cy}" r="${g.rings[0]}" stroke="#ffc400" stroke-width="3" stroke-opacity="0.85"/>
    <circle cx="${g.cx}" cy="${g.cy}" r="${g.rings[1]}" stroke="#72d6ff" stroke-width="2" stroke-opacity="0.55" stroke-dasharray="6 10"/>
    <circle cx="${g.cx}" cy="${g.cy}" r="${g.rings[2]}" stroke="#ffc400" stroke-width="4"/>
  </g>
  <g stroke="#ffc400" stroke-width="3" stroke-linecap="round" stroke-opacity="0.7">${g.rays.map((ray) => `<path d="M${ray.x1} ${ray.y1}L${ray.x2} ${ray.y2}"/>`).join('')}</g>
  <path transform="translate(${g.cx} ${g.cy}) rotate(${g.rotation})" d="${spark(round(g.radius * 0.3))}" fill="#ffc400"/>
  <g fill="#f7f1e2" fill-opacity="0.55">${g.satellites.map((s) => `<circle cx="${s.x}" cy="${s.y}" r="${s.r}"/>`).join('')}</g>
</svg>`;
}

/** Back-compat name: the renderer every caller used before S356. */
export const renderArticleArtSvg = renderFallbackArtSvg;

/** Decode + measure a raster (read-only). */
export async function measureArt(input) {
  const bytes = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
  const image = sharp(bytes);
  const [metadata, stats] = await Promise.all([image.metadata(), image.stats()]);
  return {
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    entropy: Number.isFinite(stats.entropy) ? round(stats.entropy, 3) : null,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
  };
}

/**
 * Structural fallback detection. The raster is ground truth: low entropy means
 * fallback whatever the receipt says; a `procedural-fallback` receipt counts only
 * while it still binds the file on disk (a replaced raster supersedes it).
 */
export function classifyArtKind({ pixelInspection = null, entropy = null, sha256 = null } = {}) {
  if (Number.isFinite(entropy) && entropy < FALLBACK_ENTROPY_CEILING) return FALLBACK_KIND;
  if (pixelInspection?.kind === FALLBACK_KIND && (!sha256 || pixelInspection.sha256 === sha256)) return FALLBACK_KIND;
  return SOURCE_RASTER_KIND;
}

/**
 * The exact responsive-panel pipeline build-news-desk.mjs rasterizeMemes uses,
 * returned as buffers so a preflight can measure bytes without writing files.
 */
export async function renderPanelDerivatives(source, overlaySvg) {
  const panel = sharp(source)
    .resize(PANEL_WIDTH, PANEL_HEIGHT, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(overlaySvg) }]);
  const [png, webp, avif] = await Promise.all([
    panel.clone().png({ ...EDITORIAL_PANEL_ENCODINGS.png }).toBuffer(),
    panel.clone().webp({ ...EDITORIAL_PANEL_ENCODINGS.webp }).toBuffer(),
    panel.clone().avif({ ...EDITORIAL_PANEL_ENCODINGS.avif }).toBuffer(),
  ]);
  return { '.png': png, '.webp': webp, '.avif': avif };
}

export function panelBudgetFailures(derivatives) {
  return Object.entries(EDITORIAL_PANEL_BUDGETS)
    .filter(([ext, max]) => (derivatives[ext]?.length ?? Infinity) > max)
    .map(([ext, max]) => `${ext} panel is ${derivatives[ext]?.length ?? 'missing'} bytes (budget ${max})`);
}

/**
 * Test support: a painterly-noise raster that behaves like a real illustration
 * (high entropy, compresses within budget). Used only by --self-test modes.
 */
export async function renderSyntheticRasterFixture(seed = 'fixture', width = 1536, height = 864) {
  const rnd = prng(seed);
  const lw = 48;
  const lh = 27;
  const raw = Buffer.alloc(lw * lh * 3);
  for (let i = 0; i < raw.length; i += 1) raw[i] = Math.floor(rnd() * 256);
  return sharp(raw, { raw: { width: lw, height: lh, channels: 3 } })
    .resize(width, height, { kernel: 'cubic' })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function inspect(file, { rendered = false, previous = null } = {}) {
  const m = await measureArt(file);
  if (!(m.width >= PANEL_WIDTH && m.height >= PANEL_HEIGHT)) throw new Error(`expected at least ${PANEL_WIDTH}x${PANEL_HEIGHT}, got ${m.width}x${m.height}`);
  if (!Number.isFinite(m.entropy) || m.entropy < 1) throw new Error(`raster entropy too low (${m.entropy})`);
  // Procedural fallback art is a placeholder nobody illustrated: its receipt
  // must NOT claim reviewed (and the story must not claim generatedArt — see
  // bindArtReceipt). Only a real source raster may carry reviewed:true.
  const base = { sha256: m.sha256, semanticVerified: false };
  if (rendered) return { ...base, reviewed: false, reviewer: FALLBACK_REVIEWER, kind: FALLBACK_KIND, entropy: m.entropy };
  // A pre-placed raster that already carries a receipt binding these exact bytes
  // keeps its reviewer (e.g. an operator/Codex review) instead of being
  // overwritten with this script's name — the S327 08-21 mislabel.
  if (previous?.sha256 === m.sha256 && previous.reviewed === true && String(previous.reviewer || '').trim()) {
    const kind = classifyArtKind({ pixelInspection: previous, entropy: m.entropy, sha256: m.sha256 });
    return { ...previous, semanticVerified: false, reviewed: kind !== FALLBACK_KIND, kind, entropy: m.entropy };
  }
  const kind = classifyArtKind({ entropy: m.entropy });
  return { ...base, reviewed: kind !== FALLBACK_KIND, reviewer: kind === FALLBACK_KIND ? FALLBACK_REVIEWER : PREPLACED_REVIEWER, kind, entropy: m.entropy };
}

/**
 * Bind a pixelInspection receipt to a story visual with the matching disclosure:
 * procedural fallback → generatedArt false (nothing was generated or reviewed);
 * source raster → generatedArt true.
 */
export function bindArtReceipt(visual, receipt) {
  visual.pixelInspection = receipt;
  visual.generatedArt = receipt.kind !== FALLBACK_KIND;
  return visual;
}

async function regionStdev(buffer, { left, top, width, height }) {
  // stats() measures the INPUT, not the pipeline — extract to a buffer first or
  // every region reports whole-image statistics.
  const region = await sharp(buffer).extract({ left, top, width, height }).png().toBuffer();
  const stats = await sharp(region).stats();
  return Math.max(...stats.channels.slice(0, 3).map((channel) => channel.stdev));
}

async function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push({ name, ok: Boolean(ok) });
  const zones = EDITORIAL_OVERLAY_ZONES;
  const storyA = { slug: 'memory-is-a-routing-problem', headline: 'Memory Is a Routing Problem', memeLine: { text: 'The curator feeds the guidelines.', personaId: 'rex' } };
  const storyB = { slug: 'inference-prices-quietly-stopped-falling', headline: 'Inference prices quietly stopped falling' };
  const svgA = renderFallbackArtSvg(storyA, '2026-08-21');
  const svgB = renderFallbackArtSvg(storyB, '2026-08-21');

  t('fallback is text-free (no text/tspan/foreignObject/image elements)', !/<(?:text|tspan|foreignObject|image)\b/i.test(svgA + svgB));
  t('fallback carries no headline or anchor words', !svgA.includes('Memory') && !svgA.includes('curator'));
  t('fallback is a 1200x630 panel', /width="1200" height="630"/.test(svgA));
  t('fallback is deterministic per story', svgA === renderFallbackArtSvg(storyA, '2026-08-21'));
  t('fallback differs between stories (unique pixels per article)', svgA !== svgB);
  t('renderArticleArtSvg remains a back-compat alias', renderArticleArtSvg === renderFallbackArtSvg);
  for (const [label, story] of [['A', storyA], ['B', storyB]]) {
    const g = fallbackMotifGeometry(story, '2026-08-21');
    const marksInBand = g.bounds.top >= zones.clearBand.top && g.bounds.bottom <= zones.clearBand.bottom
      && g.satellites.every((s) => s.y - s.r >= zones.clearBand.top && s.y + s.r <= zones.clearBand.bottom)
      && g.rays.every((ray) => [ray.y1, ray.y2].every((y) => y >= zones.clearBand.top && y <= zones.clearBand.bottom));
    t(`fallback ${label}: every motif mark lies inside the overlay clear band (never under the label bar or caption panel)`, marksInBand);
  }

  const fallbackA = await sharp(Buffer.from(svgA)).png({ compressionLevel: 9 }).toBuffer();
  const fallbackB = await sharp(Buffer.from(svgB)).png({ compressionLevel: 9 }).toBuffer();
  const real = await renderSyntheticRasterFixture('real-art-fixture');
  const mA = await measureArt(fallbackA);
  const mB = await measureArt(fallbackB);
  const mReal = await measureArt(real);
  t(`fallback entropy is non-blank but below the fallback ceiling (${mA.entropy})`, mA.entropy >= 1 && mA.entropy < FALLBACK_ENTROPY_CEILING);
  t('fallback hashes are unique per story', mA.sha256 !== mB.sha256);
  t(`real-art fixture entropy clears the real-art floor (${mReal.entropy})`, mReal.entropy >= REAL_ART_ENTROPY_FLOOR);
  t('classify: low-entropy raster is fallback', classifyArtKind({ entropy: mA.entropy }) === FALLBACK_KIND);
  t('classify: high-entropy raster is source art', classifyArtKind({ entropy: mReal.entropy }) === SOURCE_RASTER_KIND);
  t('classify: legacy procedural reviewer on a real painting is NOT fallback (2026-08-21 case)',
    classifyArtKind({ pixelInspection: { reviewer: LEGACY_PROCEDURAL_REVIEWER }, entropy: 6.69 }) === SOURCE_RASTER_KIND);
  t('classify: legacy procedural reviewer on the old card is fallback',
    classifyArtKind({ pixelInspection: { reviewer: LEGACY_PROCEDURAL_REVIEWER }, entropy: 2.11 }) === FALLBACK_KIND);
  t('classify: a fallback receipt that no longer binds the file is superseded',
    classifyArtKind({ pixelInspection: { kind: FALLBACK_KIND, sha256: 'a'.repeat(64) }, entropy: 7, sha256: 'b'.repeat(64) }) === SOURCE_RASTER_KIND);

  // Overlay compatibility: the fallback's low-detail regions are exactly where
  // the overlay's opaque label bar and caption panel sit, and its detail is in
  // the clear band a reader actually sees.
  const topStdev = await regionStdev(fallbackA, { left: 0, top: 0, width: 1200, height: zones.topBar.height });
  const captionStdev = await regionStdev(fallbackA, { left: zones.captionBox.x, top: zones.captionBox.y, width: zones.captionBox.width, height: zones.captionBox.height });
  const bandStdev = await regionStdev(fallbackA, { left: 0, top: zones.clearBand.top, width: 1200, height: zones.clearBand.bottom - zones.clearBand.top });
  t(`fallback top band is clean (stdev ${round(topStdev)})`, topStdev < 1);
  t(`fallback caption region is low-detail (stdev ${round(captionStdev)})`, captionStdev < 8);
  t(`fallback detail lives in the clear band (stdev ${round(bandStdev)})`, bandStdev > captionStdev * 2 && bandStdev > 10);

  const overlay = renderEditorialOverlaySvg(storyMemeOverlayOptions({
    date: '2026-08-21', text: storyA.memeLine.text, persona: { name: 'REX', bit: 'the declaration', accent: '#ff5d73' },
  }));
  for (const [label, source] of [['fallback', fallbackA], ['real-art fixture', real]]) {
    const derivatives = await renderPanelDerivatives(source, overlay);
    const png = await sharp(derivatives['.png']).metadata();
    t(`${label} renders through the overlay at 1200x630`, png.width === 1200 && png.height === 630);
    const failures = panelBudgetFailures(derivatives);
    t(`${label} panel derivatives fit PNG/WebP/AVIF budgets${failures.length ? ` (${failures.join('; ')})` : ''}`, failures.length === 0);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-art-selftest-'));
  try {
    const fallbackFile = path.join(tmp, 'fallback.png');
    const realFile = path.join(tmp, 'real.png');
    fs.writeFileSync(fallbackFile, fallbackA);
    fs.writeFileSync(realFile, real);
    const renderedReceipt = await inspect(fallbackFile, { rendered: true });
    t('rendered fallback receipt is explicit (kind procedural-fallback)', renderedReceipt.kind === FALLBACK_KIND && renderedReceipt.reviewer === FALLBACK_REVIEWER && renderedReceipt.semanticVerified === false);
    t('rendered fallback receipt does NOT claim reviewed', renderedReceipt.reviewed === false);
    const fallbackVisual = bindArtReceipt({ generatedArt: true }, renderedReceipt);
    t('bound fallback: kind procedural-fallback + reviewed false + generatedArt false (honest pair)',
      fallbackVisual.pixelInspection.kind === FALLBACK_KIND && fallbackVisual.pixelInspection.reviewed === false && fallbackVisual.generatedArt === false);
    t('bound fallback receipt passes the Desk art-kind validator (promote path)', validateArtKindReceipt(fallbackVisual, 'fallback').length === 0);
    t('the old fallback pair (true/true) is refused by the art-kind validator',
      validateArtKindReceipt({ generatedArt: true, pixelInspection: { ...renderedReceipt, reviewed: true } }, 'legacy').some((e) => /procedural fallback art cannot claim reviewed\/generated/.test(e)));
    const unrenderedFallback = await inspect(fallbackFile, { previous: null });
    t('a pre-existing fallback raster (not rendered this run) is also reviewed false', unrenderedFallback.kind === FALLBACK_KIND && unrenderedFallback.reviewed === false);
    const legacyFallback = await inspect(fallbackFile, { previous: { sha256: mA.sha256, reviewed: true, reviewer: LEGACY_PROCEDURAL_REVIEWER, semanticVerified: false } });
    t('a legacy reviewed:true receipt on fallback bytes is downgraded to reviewed false', legacyFallback.kind === FALLBACK_KIND && legacyFallback.reviewed === false);
    const preplaced = await inspect(realFile, { previous: null });
    t('pre-placed real raster is labelled source-raster (accepts >1200x630 sources)', preplaced.kind === SOURCE_RASTER_KIND && preplaced.reviewer === PREPLACED_REVIEWER && preplaced.reviewed === true);
    const kept = await inspect(realFile, { previous: { sha256: mReal.sha256, reviewed: true, reviewer: 'codex image_generation (ChatGPT plan) + operator visual review', semanticVerified: false } });
    t('an existing receipt binding the same bytes keeps its reviewer', kept.reviewer.startsWith('codex image_generation') && kept.kind === SOURCE_RASTER_KIND && kept.reviewed === true);
    const realVisual = bindArtReceipt({ generatedArt: false }, kept);
    t('bound source raster: reviewed true + generatedArt true, passes the art-kind validator',
      realVisual.generatedArt === true && validateArtKindReceipt(realVisual, 'real').length === 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  const failed = cases.filter((c) => !c.ok);
  for (const c of failed) console.error(`  ✗ ${c.name}`);
  console.log(`generate-news-art --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  if (failed.length) process.exit(1);
}

async function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  if (process.argv.includes('--preview')) {
    // Operator/agent visual check (CANON-053): write a fallback + its overlaid
    // panel for one fixture story to a directory OUTSIDE the published tree.
    const out = path.resolve(arg('--preview') || path.join(os.tmpdir(), 'desk-art-preview'));
    fs.mkdirSync(out, { recursive: true });
    const story = { slug: 'fixture-preview-story', memeLine: { text: 'Everyone is benchmarking the lobby.' } };
    const svg = renderFallbackArtSvg(story, '2026-09-14');
    const raster = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
    fs.writeFileSync(path.join(out, 'fallback.png'), raster);
    const overlay = renderEditorialOverlaySvg(storyMemeOverlayOptions({ date: '2026-09-14', text: story.memeLine.text, persona: { name: 'REX', bit: 'the declaration', accent: '#ff5d73' } }));
    const derivatives = await renderPanelDerivatives(raster, overlay);
    fs.writeFileSync(path.join(out, 'fallback--meme.png'), derivatives['.png']);
    console.log(`preview written to ${out}`);
    return undefined;
  }
  const date = arg('--date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('--date YYYY-MM-DD is required');
  // An ABSENT draft directory is the same fact as an EMPTY one — no drafts for
  // this date — and must report as that fact rather than as a crash. Until S344
  // the unguarded readdirSync died with a six-line `ENOENT ... scandir
  // .cache/news-drafts` stack on every dropped slot, which is the publisher's
  // most common non-publishing outcome. The exit code is deliberately UNCHANGED
  // (non-zero, via the same `no drafts` path): downstream promotion is gated on
  // this step succeeding, so making a draftless run exit 0 would hand `art.ok`
  // to a slot that authored nothing.
  const files = (fs.existsSync(DRAFT_DIR) ? fs.readdirSync(DRAFT_DIR) : [])
    .filter((name) => name.startsWith(`${date}--`) && name.endsWith('.json'));
  if (!files.length) {
    console.error(`no drafts for ${date} — nothing to render (dropped slot, not an art failure)`);
    process.exit(1);
  }
  for (const name of files) {
    const draftPath = path.join(DRAFT_DIR, name);
    const draft = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
    const artPath = path.join(ROOT, draft.story.visual.artSource);
    let rendered = false;
    if (!fs.existsSync(artPath)) {
      fs.mkdirSync(path.dirname(artPath), { recursive: true });
      await sharp(Buffer.from(renderFallbackArtSvg(draft.story, date))).png({ compressionLevel: 9 }).toFile(artPath);
      rendered = true;
    }
    bindArtReceipt(draft.story.visual, await inspect(artPath, { rendered, previous: draft.story.visual.pixelInspection }));
    fs.writeFileSync(draftPath, `${JSON.stringify(draft, null, 2)}\n`);
    const kind = draft.story.visual.pixelInspection.kind;
    const note = kind === FALLBACK_KIND ? ' — procedural fallback; real illustration pending (scripts/generate-news-art-codex.mjs, local)' : '';
    console.log(`✓ ${name} — art bound + pixel-inspected [${kind}] (${path.relative(ROOT, artPath)})${note}`);
  }
  return undefined;
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
  main().catch((error) => {
    console.error(`generate-news-art: ${error.message}`);
    process.exit(1);
  });
}
