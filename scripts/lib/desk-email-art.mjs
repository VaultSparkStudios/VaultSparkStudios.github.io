/** Desk email preparation uses reviewed article art, never the website fallback. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateArticleArtProof } from './desk-art-provenance.mjs';
import { validateArtKindReceipt, validateSatireCartoon } from './news-desk.mjs';
import { EDITORIAL_PANEL_BUDGETS, SATIRE_CARTOON_BUDGETS, satireCartoonAssetBase } from './news-memes.mjs';

export const DESK_ART_SITE = 'https://vaultsparkstudios.com';
export const imageHash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export function validDeskDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date)) && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
}
export function deskStoryId(date, slug) {
  if (!validDeskDate(date) || !/^[a-z0-9][a-z0-9-]*$/.test(String(slug))) throw new Error('Invalid Desk date/story identifier');
  return `${date}--${slug}`;
}
function readOwned(root, relative) {
  const base = fs.realpathSync(root), absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep) || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('image path escapes project');
  const real = fs.realpathSync(absolute);
  if (!real.startsWith(base + path.sep) || !fs.lstatSync(absolute).isFile()) throw new Error('image must be an owned regular file');
  return fs.readFileSync(real);
}

/** No network, generation or credentials. Only selected stories are inspected. */
export function inspectDeskEmailArt({ root, day, stories = day?.stories || [] }) {
  if (!validDeskDate(day?.date)) throw new Error('Desk art preparation requires a valid day date');
  const rows = [], files = [], targets = [];
  const inspect = (story, kind, receipt, source, assets, errors) => {
    const id = deskStoryId(day.date, story.slug), reasons = [...errors];
    let sourceHash = null;
    try {
      const bytes = readOwned(root, source);sourceHash = imageHash(bytes);
      if (!bytes.length) reasons.push('source-empty');
      if (sourceHash !== receipt?.sha256) reasons.push('source-hash-mismatch');
      files.push({ file: source, sha256: sourceHash, role: 'reviewed-source', id, kind });
    } catch { reasons.push('source-missing-or-unsafe'); }
    const sourceReady = reasons.length === 0;
    reasons.push(...validateArticleArtProof(root, day, story, kind));
    const assetRows = [];
    for (const [file, maxBytes, live] of assets) {
      try {
        const bytes = readOwned(root, file);
        if (!bytes.length || bytes.length > maxBytes) reasons.push(`derivative-size:${file}`);
        const row = { file, sha256: imageHash(bytes), bytes: bytes.length, id, kind, role: 'derivative', live };
        files.push(row);assetRows.push(row);
      } catch { reasons.push(`derivative-missing-or-unsafe:${file}`); }
    }
    rows.push({ id, slug: story.slug, kind, ready: reasons.length === 0, reasons, source, sourceSha256: sourceHash, assets: assetRows });
    if (reasons.length) targets.push({ id, story: `${day.date}/${story.slug}`, kind, action: sourceReady ? 'rebuild' : 'generate', reasons });
  };
  for (const story of stories) {
    const id = deskStoryId(day.date, story.slug), visual = story.visual;
    const expected = `data/news-desk/art/${id}.png`;
    const errors = validateArtKindReceipt(visual, id);
    if (visual?.generatedArt !== true || visual?.pixelInspection?.reviewed !== true || visual?.pixelInspection?.kind === 'procedural-fallback') errors.push('reviewed-real-banner-required');
    if (!String(visual?.pixelInspection?.reviewer || '').trim()) errors.push('banner-reviewer-missing');
    if (!/^[a-f0-9]{64}$/.test(visual?.pixelInspection?.sha256 || '')) errors.push('banner-review-hash-missing');
    if (visual?.artSource !== expected) errors.push('banner-source-contract');
    const base = `assets/og/news/${id}--meme`;
    inspect(story, 'banner', visual?.pixelInspection, expected, [
      [`assets/og/news/${id}.png`, 4_000_000, true],
      ...Object.entries(EDITORIAL_PANEL_BUDGETS).map(([suffix, max]) => [base + suffix, max, true]),
      ...['--640.webp', '--640.avif', '--128.avif'].map(suffix => [base + suffix, 4_000_000, true]),
    ], errors);
    // Existing article contract: cartoons are optional, but declared images must work.
    if (visual?.satireCartoon !== undefined) {
      const cartoon = visual.satireCartoon, source = `data/news-desk/art/${id}--satire.png`;
      const cartoonErrors = validateSatireCartoon(cartoon, { story, date: day.date });
      if (cartoon?.artSource !== source) cartoonErrors.push('satire-source-contract');
      const satireBase = `assets/og/news/${satireCartoonAssetBase(day.date, story.slug)}`;
      inspect(story, 'satire', cartoon, source, Object.entries(SATIRE_CARTOON_BUDGETS).map(([suffix, max]) => [satireBase + suffix, max, true]), cartoonErrors);
    }
  }
  const snapshot = imageHash(JSON.stringify({ day, selected: stories.map(s => s.slug), rows, files }));
  return { ready: rows.length > 0 && rows.every(row => row.ready), date: day.date, selectedStories: stories.map(s => s.slug), rows, files, targets, snapshot, scope: 'Reviewed sources and local derivatives; no live or semantic-image verification implied.' };
}

/** Exact first-party image bytes, not HEAD reachability, gate an outgoing issue. */
export async function verifyDeskEmailArt(local, { fetchImpl = fetch } = {}) {
  const failures = [], verified = [];
  if (!local.ready) return { ready: false, failures: ['local-art-not-ready'], verified, snapshot: local.snapshot };
  for (const asset of local.files.filter(row => row.live)) {
    const url = `${DESK_ART_SITE}/${asset.file}`;
    try {
      const response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(15_000) });
      if (!response.ok || !/^image\//i.test(response.headers?.get('content-type') || '')) throw new Error('image-response-unverified');
      if (Number(response.headers.get('content-length')) > 4_000_000) throw new Error('image-size-unverified');
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 4_000_000 || imageHash(bytes) !== asset.sha256) throw new Error('image-bytes-mismatch');
      verified.push({ file: asset.file, sha256: asset.sha256 });
    } catch { failures.push({ file: asset.file, reason: 'live-image-unverified-or-mismatched' }); }
  }
  return { ready: failures.length === 0 && verified.length > 0, failures, verified, snapshot: local.snapshot };
}

export function deskArtGenerationCommands(local, { kind = 'required', stories = [] } = {}) {
  if (!['required', 'banner', 'satire', 'all'].includes(kind)) throw new Error('Art kind must be required, banner, satire or all');
  const targets = local.targets.filter(t => kind === 'required' || kind === 'all' || t.kind === kind);
  if (kind === 'all' || kind === 'satire') {
    for (const story of stories) if (story.visual?.satireCartoon === undefined) {
      const id = deskStoryId(local.date, story.slug);
      if (!targets.some(t => t.id === id && t.kind === 'satire')) targets.push({ id, story: `${local.date}/${story.slug}`, kind: 'satire' });
    }
  }
  return ['banner', 'satire'].flatMap(artKind => ['generate', 'rebuild'].flatMap(action => {
    const ids = [...new Set(targets.filter(t => t.kind === artKind && (t.action || 'generate') === action).map(t => t.story))];
    return ids.length ? [{ kind: artKind, action, stories: ids, args: ['scripts/desk-art-autopilot.mjs', ...(action === 'rebuild' ? ['--prepare-only'] : []), '--kind', artKind, '--story', ids.join(',')] }] : [];
  }));
}
