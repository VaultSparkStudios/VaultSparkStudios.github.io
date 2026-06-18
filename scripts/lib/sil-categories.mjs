/**
 * sil-categories.mjs
 *
 * Canonical SIL v3.0 category vocabulary (CANON-009 — 10 × 100 = 1000).
 * Extracted to a single source so writers/validators/renderers can't drift
 * (S156 #21 policy-drift extraction). Keys MUST match the property names in
 * context/PROJECT_STATUS.json → silCategoriesV3.
 */

/** Ordered category keys — the order the SIL total sums them in. */
export const V3_CATS = [
  'devHealth',
  'creativeAlignment',
  'momentum',
  'engagement',
  'processQuality',
  'crossRepoCoherence',
  'securityPosture',
  'ecosystemIntegration',
  'capitalEfficiency',
  'automationCoverage',
];

/** Human-readable labels, keyed by category key (for briefs/boards). */
export const V3_CAT_LABELS = {
  devHealth: 'Dev Health',
  creativeAlignment: 'Creative Alignment',
  momentum: 'Momentum',
  engagement: 'Engagement',
  processQuality: 'Process Quality',
  crossRepoCoherence: 'Cross-Repo Coherence',
  securityPosture: 'Security Posture',
  ecosystemIntegration: 'Ecosystem Integration',
  capitalEfficiency: 'Capital Efficiency',
  automationCoverage: 'Automation Coverage',
};

/** Per-category max (SIL v3.0 rubric). */
export const V3_CAT_MAX = 100;
/** Total SIL max — sum of all categories (CANON-009). */
export const V3_TOTAL_MAX = V3_CATS.length * V3_CAT_MAX; // 1000

export default { V3_CATS, V3_CAT_LABELS, V3_CAT_MAX, V3_TOTAL_MAX };
