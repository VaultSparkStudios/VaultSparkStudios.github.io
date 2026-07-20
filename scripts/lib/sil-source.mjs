/** Canonical parser for the latest scored SIL ledger entry. */

export const SIL_CATEGORY_LABELS = Object.freeze({
  'Dev Health': 'devHealth',
  'Creative Alignment': 'creativeAlignment',
  Momentum: 'momentum',
  Engagement: 'engagement',
  'Process Quality': 'processQuality',
  'Cross-Repo Coherence': 'crossRepoCoherence',
  'Security Posture': 'securityPosture',
  'Ecosystem Integration': 'ecosystemIntegration',
  'Capital Efficiency': 'capitalEfficiency',
  'Automation Coverage': 'automationCoverage',
});

export function parseSilEntries(text) {
  return [...String(text).matchAll(/##[^\n]*?\bSession\s+(\d+)\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/g)]
    .map((match) => ({ session: Number(match[1]), header: match[0].split('\n')[0], body: match[2] ?? '' }))
    .sort((a, b) => b.session - a.session);
}

export function snapshotFromEntry(entry) {
  if (!entry) return null;
  const totalMatch = entry.header.match(/Total:\s*(\d+)\s*\/\s*(\d+)/)
    ?? entry.body.match(/(?:\*\*)?Total(?:\*\*)?[^\d]*(\d+)\s*\/\s*(\d+)/i);
  if (!totalMatch) return null;
  const categories = {};
  for (const [label, key] of Object.entries(SIL_CATEGORY_LABELS)) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = entry.body.match(new RegExp(`\\|\\s*${escaped}(?:\\s*\\([^)]*\\))?\\s*\\|\\s*(\\d+)`, 'i'));
    if (match) categories[key] = Number(match[1]);
  }
  const values = Object.values(categories);
  const velocityMatch = `${entry.header}\n${entry.body}`.match(/Velocity:\s*(\d+)/i);
  return {
    session: entry.session,
    total: Number(totalMatch[1]),
    max: Number(totalMatch[2]),
    velocity: velocityMatch ? Number(velocityMatch[1]) : null,
    categories,
    categoryCount: values.length,
    categorySum: values.reduce((sum, value) => sum + value, 0),
  };
}

export function latestSilSnapshot(text) {
  for (const entry of parseSilEntries(text)) {
    const snapshot = snapshotFromEntry(entry);
    if (snapshot) return snapshot;
  }
  return null;
}

export default { latestSilSnapshot, parseSilEntries, snapshotFromEntry, SIL_CATEGORY_LABELS };
