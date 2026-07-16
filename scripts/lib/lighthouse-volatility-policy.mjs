export const LIGHTHOUSE_VOLATILITY_POLICY = Object.freeze({
  trendWindow: 5,
  minRuns: 3,
  maxSubfloor: 2,
});

export function summarizeLighthouseTrend(values, floor) {
  const clean = (Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .slice(-LIGHTHOUSE_VOLATILITY_POLICY.trendWindow);
  const sorted = [...clean].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length
    ? (sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2)
    : null;
  return {
    values: clean,
    count: clean.length,
    median,
    subFloor: clean.filter((value) => value < floor).length,
  };
}

/**
 * One fail-closed decision for both the absolute route-tier gate and the
 * rolling trend gate. Floors are never lowered. Only a lab-volatile, fresh
 * single-run breach with an independent healthy history can become advisory.
 */
export function decideLighthouseVolatility({
  score,
  floor,
  labVolatile = false,
  corroborable = false,
  trend = null,
}) {
  if (score >= floor) return { classification: 'pass', reason: 'at-or-above-floor' };
  if (!labVolatile) return { classification: 'hard-fail', reason: 'route-not-lab-volatile' };
  if (!corroborable) return { classification: 'hard-fail', reason: 'corroborator-not-independent' };

  const summary = trend?.values
    ? summarizeLighthouseTrend(trend.values, floor)
    : {
        values: [],
        count: Number(trend?.count || 0),
        median: typeof trend?.median === 'number' ? trend.median : null,
        subFloor: Number(trend?.subFloor || 0),
      };
  if (summary.count < LIGHTHOUSE_VOLATILITY_POLICY.minRuns) {
    return { classification: 'hard-fail', reason: 'thin-history', trend: summary };
  }
  if (summary.median === null || summary.median < floor) {
    return { classification: 'hard-fail', reason: 'trend-below-floor', trend: summary };
  }
  if (summary.subFloor >= LIGHTHOUSE_VOLATILITY_POLICY.maxSubfloor) {
    return { classification: 'hard-fail', reason: 'recurring-sub-floor', trend: summary };
  }
  return { classification: 'advisory', reason: 'single-run-lab-dip', trend: summary };
}
