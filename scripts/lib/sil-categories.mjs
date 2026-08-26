// sil-categories.mjs — canonical SIL v3.0 category list (CANON-009, 10×100=1000).
//
// S156 #21: lint-policy-drift found this array independently defined in FIVE
// files (check-sil-category-ranges · write-project-status · reconcile-sil-math
// · resync-sil-score · sil-ingest-guard) — the exact divergent-policy class
// S153 debugged three times. One definition, everyone imports.
//
// Changing the rubric is a CANON change (DECISIONS.md) — never edit this list
// for a local convenience.

export const V3_CATS = [
  'devHealth', 'creativeAlignment', 'momentum', 'engagement', 'processQuality',
  'crossRepoCoherence', 'securityPosture', 'ecosystemIntegration', 'capitalEfficiency', 'automationCoverage',
];

export const V3_MAX_PER_CATEGORY = 100;
export const V3_MAX_TOTAL = 1000;

export function pickV3Categories(categories = {}) {
  return Object.fromEntries(V3_CATS.map((key) => [key, categories?.[key]]));
}

export function sumV3Categories(categories = {}) {
  return V3_CATS.reduce((sum, key) => sum + (Number(categories?.[key]) || 0), 0);
}

export function validateV3Categories(categories) {
  const errors = [];
  if (!categories || typeof categories !== 'object' || Array.isArray(categories)) {
    return ['silCategoriesV3 must be an object'];
  }
  const unknown = Object.keys(categories).filter((key) => !V3_CATS.includes(key));
  if (unknown.length) errors.push(`silCategoriesV3 has unknown key(s): ${unknown.join(', ')}`);
  for (const key of V3_CATS) {
    const value = categories[key];
    if (typeof value !== 'number' || Number.isNaN(value)) errors.push(`silCategoriesV3.${key} must be numeric`);
    else if (value < 0 || value > V3_MAX_PER_CATEGORY) errors.push(`silCategoriesV3.${key}=${value} out of range 0..${V3_MAX_PER_CATEGORY}`);
  }
  return errors;
}
