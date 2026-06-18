/**
 * visual-blocks.mjs
 *
 * Shared terminal visualization primitives for the startup/closeout briefs.
 * Extracted so the renderer and any other surface draw identical glyphs.
 */

const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/**
 * Render a unicode sparkline from a numeric series.
 *
 * @param {number[]} values
 * @param {object} [opts]
 * @param {number} [opts.max]  - upper bound for scaling (default: series max)
 * @param {number} [opts.min]  - lower bound for scaling (default: series min)
 * @returns {string} one glyph per value (empty string for empty/invalid input)
 */
export function sparkline(values, opts = {}) {
  const nums = (Array.isArray(values) ? values : [])
    .map(Number)
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return '';

  const min = opts.min ?? Math.min(...nums);
  const max = opts.max ?? Math.max(...nums);
  const span = max - min;

  return nums
    .map((n) => {
      if (span <= 0) return SPARK_CHARS[0];
      const clamped = Math.max(min, Math.min(max, n));
      const idx = Math.round(((clamped - min) / span) * (SPARK_CHARS.length - 1));
      return SPARK_CHARS[Math.max(0, Math.min(SPARK_CHARS.length - 1, idx))];
    })
    .join('');
}

/**
 * Render a fixed-width bar (1 block per `perBlock` units, capped at `width`).
 * @param {number} value
 * @param {object} [opts]
 * @param {number} [opts.max=100]
 * @param {number} [opts.width=20]
 * @param {string} [opts.fill='█']
 * @param {string} [opts.empty='░']
 */
export function bar(value, { max = 100, width = 20, fill = '█', empty = '░' } = {}) {
  const v = Number.isFinite(Number(value)) ? Number(value) : 0;
  const filled = Math.max(0, Math.min(width, Math.round((v / max) * width)));
  return fill.repeat(filled) + empty.repeat(width - filled);
}

export default { sparkline, bar };
