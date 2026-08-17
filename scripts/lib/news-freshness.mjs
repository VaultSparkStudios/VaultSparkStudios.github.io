const DAY_MS = 86_400_000;

export function deriveDeskFreshness(days, { now = new Date(), dailyWindowDays = 1, pauseAfterDays = 7 } = {}) {
  const publicDays = (days || []).filter((day) => day?.simulated !== true && /^\d{4}-\d{2}-\d{2}$/.test(day?.date || ''));
  const latestDate = publicDays.map((day) => day.date).sort().at(-1) || null;
  const today = new Date(now).toISOString().slice(0, 10);
  const ageDays = latestDate === null ? null : Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${latestDate}T00:00:00Z`)) / DAY_MS));
  const state = ageDays === null ? 'paused' : ageDays <= dailyWindowDays ? 'daily' : ageDays < pauseAfterDays ? 'periodic' : 'paused';
  const labels = { daily: 'Daily', periodic: 'Periodic', paused: 'Paused' };
  return {
    schemaVersion: '1.0',
    generatedAt: today,
    generatedBy: 'scripts/build-news-freshness.mjs',
    publicSafe: true,
    state,
    cadenceLabel: labels[state],
    latestEditionDate: latestDate,
    observedThrough: latestDate,
    ageDays,
    dailyEvidenceWindowDays: dailyWindowDays,
    pauseAfterDays,
    overdue: state !== 'daily',
    recoveryRequired: state !== 'daily',
    recoveryCommand: 'node scripts/recover-news-desk.mjs --prepare',
    publicationPolicy: 'Recovery packets are review-held. No commentary is published until an editor explicitly promotes a validated edition.',
  };
}
