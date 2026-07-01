/**
 * insight-voice-linter.mjs
 *
 * Mechanical checks for founder-facing skill brief insight text. The rules are
 * intentionally narrow: catch the recurring buzzwords and abstract opener class
 * without trying to become a style judge.
 */

const FORBIDDEN_WORDS = [
  'leveraged',
  'leverages',
  'leverage',
  'best-in-class',
  'stakeholder',
  'stakeholders',
  'synergies',
  'synergy',
  'ecosystem-wide',
  'robust',
  'seamless',
  'seamlessly',
];

const FORBIDDEN_OPENER = /^\s*this\s+(implementation|feature|change|refactor|update|fix|pr|commit)\b/i;

export function lintInsight(text) {
  const violations = [];
  const s = String(text ?? '');

  for (const word of FORBIDDEN_WORDS) {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^\\w-])${esc}(?![\\w-])`, 'i');
    if (re.test(s)) violations.push(`forbidden word: "${word}"`);
  }

  if (FORBIDDEN_OPENER.test(s)) {
    violations.push('forbidden opener: "This implementation/feature/change/..."');
  }

  const sentences = s.split(/[.!?]+(?:\s|$)/).filter((x) => x.trim().length > 0);
  if (sentences.length > 4) violations.push(`too long: ${sentences.length} sentences (max 3)`);

  return { ok: violations.length === 0, violations };
}

export function assertInsightVoice(text, label = 'insight') {
  const result = lintInsight(text);
  if (!result.ok) {
    throw new Error(`${label} violates SKILL_BRIEF_SPEC voice rules: ${result.violations.join('; ')}`);
  }
}

export { FORBIDDEN_WORDS };
