// Pure evidence adapters for the startup brief. Keep last-closeout claims
// distinct from live verification and classify doctor warnings from the same
// provenance map used by the doctor surface.

export function closeoutTestEvidence(status = {}) {
  const passing = Number.isFinite(status.testsPassing) ? status.testsPassing : null;
  const total = Number.isFinite(status.testsTotal) ? status.testsTotal : null;
  return {
    kind: 'last-closeout',
    passing,
    total,
    label: passing !== null ? `${passing}/${total ?? '?'} passing` : `${total ?? '?'} recorded`,
    date: status.testsLastRun || null,
  };
}

export function currentTestEvidence(diagnostics = null) {
  if (!diagnostics || !Number.isFinite(diagnostics.commandCount) || !Number.isFinite(diagnostics.passed)) {
    return { kind: 'current-verification', measured: false, passing: null, total: null, label: 'unverified' };
  }
  const total = diagnostics.commandCount;
  const passing = diagnostics.passed;
  return {
    kind: 'current-verification',
    measured: true,
    passing,
    total,
    failed: Number.isFinite(diagnostics.failed) ? diagnostics.failed : Math.max(0, total - passing),
    generatedAt: diagnostics.generatedAt || null,
    label: `${passing}/${total} passing`,
  };
}

export function doctorWarningOwnership(checks = [], provenance = {}, isWarning = () => false) {
  const counts = { self: 0, sibling: 0, chronic: 0 };
  for (const check of checks) {
    if (!isWarning(check)) continue;
    const owner = provenance[check.id]?.owner || 'self';
    counts[owner] = (counts[owner] || 0) + 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return { counts, total };
}

export function selfTestStartupEvidence() {
  const closeout = closeoutTestEvidence({ testsPassing: 220, testsTotal: 220, testsLastRun: '2026-07-25' });
  const live = currentTestEvidence({ commandCount: 2, passed: 1, failed: 1, generatedAt: '2026-07-25T20:00:00Z' });
  const warnings = doctorWarningOwnership(
    [{ id: 'local', status: 'warn' }, { id: 'sibling-locks', status: 'warn' }, { id: 'ok', status: 'pass' }],
    { 'sibling-locks': { owner: 'sibling' } },
    (check) => check.status === 'warn',
  );
  return [
    ['last closeout stays immutable', closeout.label === '220/220 passing'],
    ['current verification derives from live diagnostics', live.label === '1/2 passing' && live.failed === 1],
    ['doctor ownership sums warning set', warnings.total === 2 && warnings.counts.self === 1 && warnings.counts.sibling === 1],
  ];
}

if (process.argv[1]?.endsWith('startup-evidence.mjs') && process.argv.includes('--self-test')) {
  const results = selfTestStartupEvidence();
  for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (results.some(([, ok]) => !ok)) process.exit(1);
  console.log(`startup-evidence self-test: ${results.length}/${results.length}`);
}
