import { receiptIdFor } from './build-check-evidence.mjs';

export function summarizeProofRows(inputRows) {
  if (!Array.isArray(inputRows)) throw new Error('steps must be an array');
  const failures = inputRows.filter((row) => row?.status !== 0);
  const blocking = inputRows.filter((row) => row?.enforcement === 'blocking');
  const advisory = inputRows.filter((row) => row?.enforcement === 'advisory');
  const blockingFailed = blocking.filter((row) => row.status !== 0).length;
  const advisoryFailed = advisory.filter((row) => row.status !== 0).length;
  return {
    commandCount: inputRows.length,
    passed: inputRows.length - failures.length,
    failed: failures.length,
    blockingCount: blocking.length,
    advisoryCount: advisory.length,
    blockingFailed,
    advisoryFailed,
    overallPass: blockingFailed === 0,
    totalDurationMs: inputRows.reduce((sum, row) => sum + row.durationMs, 0),
  };
}

export function validateProofDiagnostics(value, { expectedBlockingCount = null, expectedAdvisoryCount = null, requireComplete = false } = {}) {
  if (!value || value.schemaVersion !== '2.0' || !Array.isArray(value.steps)) {
    throw new Error('schema 2.0 steps are required');
  }
  if (typeof value.generatedAt !== 'string' || Number.isNaN(Date.parse(value.generatedAt))) {
    throw new Error('generatedAt must be a valid timestamp');
  }
  if (value.publicSafe !== true) throw new Error('publicSafe must be true');
  const calculated = summarizeProofRows(value.steps);
  for (const key of ['commandCount', 'passed', 'failed', 'blockingCount', 'advisoryCount', 'blockingFailed', 'advisoryFailed', 'overallPass', 'totalDurationMs']) {
    if (value[key] !== calculated[key]) throw new Error(`${key} does not match executed rows`);
  }
  if (!Number.isInteger(value.plannedBlockingCount) || value.plannedBlockingCount < 0
    || !Number.isInteger(value.plannedAdvisoryCount) || value.plannedAdvisoryCount < 0) {
    throw new Error('planned enforcement counts are required');
  }
  if (expectedBlockingCount != null && value.plannedBlockingCount !== expectedBlockingCount) {
    throw new Error('blocking plan is stale relative to current proof steps');
  }
  if (expectedAdvisoryCount != null && value.plannedAdvisoryCount !== expectedAdvisoryCount) {
    throw new Error('advisory plan is stale relative to current proof steps');
  }
  const coverageComplete = value.blockingCount === value.plannedBlockingCount
    && value.advisoryCount === value.plannedAdvisoryCount;
  if (value.coverageComplete !== coverageComplete) {
    throw new Error('coverageComplete does not match planned enforcement coverage');
  }
  if (requireComplete && !coverageComplete) throw new Error('proof receipt covers only part of the planned enforcement surface');
  if (!Array.isArray(value.failures) || value.failures.length !== calculated.failed) {
    throw new Error('failures must match failed rows');
  }
  if (value.steps.some((row) => !row
    || !Number.isInteger(row.status)
    || !Number.isFinite(row.durationMs)
    || row.durationMs < 0
    || !['blocking', 'advisory'].includes(row.enforcement))) {
    throw new Error('every row requires valid status, duration, and enforcement');
  }
  if (value.execution != null) {
    const moduleCommands = value.steps.filter((row) => row.executor === 'module').length;
    const processCommands = value.steps.filter((row) => row.executor === 'process').length;
    if (value.execution.moduleCommands !== moduleCommands
      || value.execution.processCommands !== processCommands
      || moduleCommands + processCommands !== value.commandCount) {
      throw new Error('execution counts must match every logical command row');
    }
    if (value.execution.quietOnSuccess !== true || value.execution.fullOutputOnFailure !== true) {
      throw new Error('execution output policy must remain quiet-on-success and full-on-failure');
    }
    if (value.steps.some((row) => !Number.isInteger(row.outputBytes)
      || row.outputBytes < 0
      || !/^[a-f0-9]{16}$/.test(row.outputDigest || ''))) {
      throw new Error('every optimized row requires an output byte count and digest');
    }
  }
  if (value.receiptId !== receiptIdFor(value)) throw new Error('receiptId does not match receipt content');
  return value;
}

export function runProofDiagnosticsSelfTest() {
  const steps = [
    { step: 1, command: 'node a.mjs', enforcement: 'blocking', status: 0, durationMs: 3, executor: 'module', outputBytes: 2, outputDigest: '0123456789abcdef' },
    { step: 2, command: 'node b.mjs', enforcement: 'advisory', status: 1, durationMs: 4, executor: 'process', outputBytes: 3, outputDigest: 'fedcba9876543210' },
  ];
  const counts = summarizeProofRows(steps);
  const good = {
    schemaVersion: '2.0',
    generatedAt: '2026-07-28T00:00:00.000Z',
    publicSafe: true,
    ...counts,
    plannedBlockingCount: 1,
    plannedAdvisoryCount: 1,
    coverageComplete: true,
    execution: { moduleCommands: 1, processCommands: 1, quietOnSuccess: true, fullOutputOnFailure: true },
    failures: [steps[1]],
    steps,
  };
  good.receiptId = receiptIdFor(good);
  const rejects = (candidate, options = {}) => {
    try { validateProofDiagnostics(candidate, options); return false; } catch { return true; }
  };
  return [
    ['complete typed receipt validates', validateProofDiagnostics(good, { requireComplete: true }) === good],
    ['advisory red remains valid evidence', good.overallPass && good.advisoryFailed === 1],
    ['integrity mutation fails closed', rejects({ ...good, totalDurationMs: 99 }, { requireComplete: true })],
    ['partial enforcement coverage fails closed', rejects({ ...good, plannedBlockingCount: 2, coverageComplete: false }, { requireComplete: true })],
    ['invalid enforcement fails closed', rejects({ ...good, steps: [{ ...steps[0], enforcement: 'optional' }, steps[1]] })],
    ['executor count mutation fails closed', rejects({ ...good, execution: { ...good.execution, moduleCommands: 2 } })],
    ['output digest mutation fails closed', rejects({ ...good, steps: [{ ...steps[0], outputDigest: 'tampered' }, steps[1]] })],
    ['invalid timestamp fails closed', rejects({ ...good, generatedAt: 'later' })],
  ];
}
