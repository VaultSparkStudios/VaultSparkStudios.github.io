/**
 * news-satire-raster.mjs — the ONE derivative pipeline for Desk satire cartoons
 * (D-S368.7). Shared by ingest-news-art.mjs (budget preflight before a cartoon
 * is accepted) and build-news-desk.mjs (writes assets/og/news/<id>--satire*),
 * so a preflight can never pass a cartoon the real build would then reject —
 * the same contract renderPanelDerivatives keeps for the banner panels.
 *
 * Unlike the banner panel there is no overlay: the caption, byline and the
 * "Satire · AI-generated cartoon" label are HTML on the page, so the image is
 * the cartoon alone, resized to a square and re-encoded.
 */
import { EDITORIAL_PANEL_ENCODINGS, SATIRE_CARTOON_BUDGETS, SATIRE_CARTOON_DERIVATIVES } from './news-memes.mjs';

/**
 * S368 — a fixed quality ladder per format. Dense line work (NIB's engraved
 * register above all) overran the budgets at the panel encoding, so good art
 * was rejected on bytes. Each derivative now takes the FIRST rung that fits its
 * budget. Rung 0 is the original encoding, so every cartoon that already fit
 * re-encodes byte-identically; the ladder is fixed, so output stays
 * deterministic for build-news-desk's hash checks.
 */
export const SATIRE_QUALITY_LADDER = Object.freeze({
  png: Object.freeze([{}, { quality: 75, colours: 128 }, { quality: 60, colours: 96 }, { quality: 50, colours: 64 }]),
  webp: Object.freeze([{}, { quality: 72 }, { quality: 64 }, { quality: 56 }, { quality: 48 }]),
  avif: Object.freeze([{}, { quality: 50 }, { quality: 44 }, { quality: 38 }]),
});

export async function renderSatireDerivatives(source) {
  // Lazy, like build-news-desk.mjs's own rasterizers: --check and --self-test
  // paths that never encode an image must not pay for (or require) sharp.
  const { default: sharp } = await import('sharp');
  const out = {};
  await Promise.all(Object.entries(SATIRE_CARTOON_DERIVATIVES).map(async ([suffix, { width, format }]) => {
    const budget = SATIRE_CARTOON_BUDGETS[suffix] ?? Infinity;
    for (const rung of SATIRE_QUALITY_LADDER[format] || [{}]) {
      const base = sharp(source).resize(width, width, { fit: 'cover', position: 'centre' });
      out[suffix] = await base[format]({ ...EDITORIAL_PANEL_ENCODINGS[format], ...rung }).toBuffer();
      if (out[suffix].length <= budget) break;
    }
  }));
  return out;
}

export function satireBudgetFailures(derivatives) {
  return Object.entries(SATIRE_CARTOON_BUDGETS)
    .filter(([suffix, max]) => (derivatives[suffix]?.length ?? Infinity) > max)
    .map(([suffix, max]) => `${suffix} satire cartoon is ${derivatives[suffix]?.length ?? 'missing'} bytes (budget ${max})`);
}
