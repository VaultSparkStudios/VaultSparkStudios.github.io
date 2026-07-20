/**
 * Fail-closed authorization dependency classifier.
 *
 * Task copy is not stable: an authorization boundary may be expressed as a
 * bracket tag ("FOUNDER DECISION"), a direct instruction ("requires founder
 * approval"), or a dependency ("lands with the authorized auth repair").
 * All three mean the task is not safe for unattended implementation.
 *
 * Keep this pure so the Genius List generator and its regression gate share
 * byte-identical semantics.
 */
export function authorizationGateForTask(task) {
  const text = String(task || '').trim();
  if (!text) return null;

  const explicitFounder = /\[[^\]]*founder[^\]]*\]|\bfounder\b.*\b(review|call|decision|verify|sign-off|device|approval|authorize)\b|\bfounder-device\b/i;
  const explicitAuthorization = /\b(?:requires?|awaits?|pending|needs?)\s+(?:explicit\s+)?(?:founder\s+)?authori[sz]ation\b|\bauthori[sz]ation\s+(?:is\s+)?required\b/i;
  const dependentAuthorizedRepair = /\b(?:lands?|ships?|execute[sd]?|proceeds?|only)\s+(?:only\s+)?(?:with|after|once)\s+(?:the\s+)?authori[sz]ed\s+(?:auth|identity|security|provider|migration|repair)\b/i;
  const securityDecisionDependency = /\b(?:auth|identity|security|provider)\b.*\b(?:founder\s+)?(?:approval|authori[sz]ation|decision)\b/i;

  if (explicitFounder.test(text) || explicitAuthorization.test(text)
      || dependentAuthorizedRepair.test(text) || securityDecisionDependency.test(text)) {
    return {
      kind: 'founder-gated',
      reason: 'Requires explicit founder authorization or an approved auth/security decision before implementation.',
    };
  }
  return null;
}

/**
 * True only for consolidated carry-forward meta rows, never for an ordinary
 * actionable task whose explanation happens to use the word "carry".
 */
export function isConsolidatedCarryItem(task) {
  const text = String(task || '').trim();
  if (!text) return false;

  const tags = [...text.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1].trim());
  if (tags.some((tag) => /^(?:followup\s+)?carry(?:[ -]?forward)?$/i.test(tag))) return true;

  const subject = text
    .replace(/^(?:\[[^\]]+\]\s*)+/, '')
    .split(/\s+—\s+/)[0]
    .trim();

  return /^(?:consolidated\s+carry|carry[ -]?forward)\b/i.test(subject);
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['explicit founder tag', '[AUTH/P0][FOUNDER DECISION] Authorize provider migration.', true],
    ['direct authorization', 'Requires explicit founder authorization before migration.', true],
    ['authorized auth dependency', 'Behavioral round-trip check. Lands with the authorized auth repair.', true],
    ['security decision dependency', 'Identity provider flip awaits founder approval.', true],
    ['ordinary local auth test', 'Add a pure parser test for signed-out state.', false],
    ['ordinary promotion work', 'Add a stranded deployment streak to the beacon.', false],
  ];
  let failed = 0;
  for (const [name, task, expected] of cases) {
    const actual = Boolean(authorizationGateForTask(task));
    const ok = actual === expected;
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\ngenius-task-classifier self-test: ${cases.length - failed}/${cases.length} passing`);
  process.exit(failed ? 1 : 0);
}
