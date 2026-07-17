/**
 * Project a closing-session context reading into the state a fresh reader will
 * inherit. STARTUP_BRIEF is a handoff artifact; rendering the writer's
 * accumulated usage is a category error.
 */
export function startupRecommendation(usedTokens, limit) {
  const ratio = limit > 0 ? usedTokens / limit : 1;
  if (ratio >= 0.9) return 'CLOSEOUT';
  if (ratio >= 0.75) return 'CONSIDER_CLOSEOUT';
  if (ratio >= 0.6) return 'WARN_COMPACT_SOON';
  return 'CONTINUE';
}

export function projectStartupMeter(liveMeter) {
  const limit = Number(liveMeter?.limit) || 200000;
  const measuredBootstrap = Number(liveMeter?.freshSessionBootstrap);
  const usedTokens = Number.isFinite(measuredBootstrap) && measuredBootstrap >= 0
    ? Math.round(measuredBootstrap)
    : Math.max(0, Math.round(Number(liveMeter?.usedTokens) || 0));
  return {
    ...liveMeter,
    live: Boolean(liveMeter?.live),
    usedTokens,
    limit,
    pctUsed: limit > 0 ? +((usedTokens / limit) * 100).toFixed(1) : 100,
    turnsToCompact: null,
    recommendation: startupRecommendation(usedTokens, limit),
    confidence: Number.isFinite(measuredBootstrap) ? 'startup-projection' : (liveMeter?.confidence || 'heuristic-stale'),
    projectedFromUsedTokens: Number(liveMeter?.usedTokens) || null,
  };
}

export function selfTestStartupProjection() {
  const exhausted = projectStartupMeter({ live: true, usedTokens: 820000, freshSessionBootstrap: 24000, limit: 1000000 });
  const oversized = projectStartupMeter({ live: true, usedTokens: 900000, freshSessionBootstrap: 780000, limit: 1000000 });
  const fallback = projectStartupMeter({ live: false, usedTokens: 130000, limit: 200000 });
  return [
    ['exhausted writer projects fresh reader', exhausted.usedTokens === 24000 && exhausted.recommendation === 'CONTINUE'],
    ['oversized bootstrap still blocks', oversized.recommendation === 'CONSIDER_CLOSEOUT'],
    ['percentage derives from projected tokens', exhausted.pctUsed === 2.4],
    ['missing bootstrap remains conservative', fallback.usedTokens === 130000 && fallback.recommendation === 'WARN_COMPACT_SOON'],
  ];
}
