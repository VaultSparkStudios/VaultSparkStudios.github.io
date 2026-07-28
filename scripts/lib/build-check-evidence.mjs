/** Shared fail-closed contract for measured diagnostic receipts. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function fingerprintCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0 || commands.some((command) => typeof command !== 'string' || !command.trim())) {
    throw new Error('command fingerprint requires a non-empty string array');
  }
  return crypto.createHash('sha256').update(commands.join('\0')).digest('hex').slice(0, 24);
}

export function fingerprintNamedBuffers(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('source fingerprint requires named entries');
  const normalized = entries.map(([name, content]) => [String(name).replaceAll('\\', '/'), Buffer.from(content)]).sort(([a], [b]) => a.localeCompare(b));
  const hash = crypto.createHash('sha256');
  for (const [name, content] of normalized) {
    hash.update(name); hash.update('\0'); hash.update(content); hash.update('\0');
  }
  return hash.digest('hex').slice(0, 24);
}

export function verificationSurfaceFingerprint(root) {
  const entries = [];
  const excludedDirs = new Set(['.git', '.cache', '.ops-cache', 'node_modules', 'docs', 'context', 'data', 'api', 'portfolio', 'lighthouse-results', 'playwright-report', 'test-results']);
  const sourceDirs = new Set(['scripts', 'tests', 'assets', 'cloudflare', 'config', '.github']);
  const rootFiles = new Set(['package.json', 'agents.json', 'service-worker.js', 'style.css', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']);
  const explicitContextInputs = [
    'context/CANON_ADOPTION.md',
    'context/DECISIONS.md',
    'context/PHANTOM_CARRIES.json',
    'context/TASK_BOARD.md',
  ];

  function visit(dir, mode) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const absolute = path.join(dir, entry.name);
      const rel = path.relative(root, absolute).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) continue;
        visit(absolute, mode === 'all' || sourceDirs.has(rel.split('/')[0]) ? 'all' : 'html');
        continue;
      }
      const publicSourceExtension = ['.html', '.css', '.js', '.mjs', '.cjs', '.ts'].includes(path.extname(rel));
      const include = mode === 'all'
        || publicSourceExtension
        || rel.startsWith('.well-known/')
        || rootFiles.has(rel);
      if (include) entries.push([rel, fs.readFileSync(absolute)]);
    }
  }
  visit(root, 'html');
  for (const rel of explicitContextInputs) {
    const absolute = path.join(root, rel);
    if (fs.existsSync(absolute)) entries.push([rel, fs.readFileSync(absolute)]);
  }
  return fingerprintNamedBuffers(entries);
}
export function receiptIdFor(value) {
  const copy = { ...value };
  delete copy.receiptId;
  return crypto.createHash('sha256').update(JSON.stringify(copy)).digest('hex').slice(0, 24);
}

export function validateBuildCheckEvidence(value, { requireComplete = false, expectedPlanFingerprint = null, expectedSourceFingerprint = null } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('build-check evidence must be an object');
  const { commandCount, passed, failed, generatedAt } = value;
  for (const [name, candidate] of Object.entries({ commandCount, passed, failed })) {
    if (!Number.isInteger(candidate) || candidate < 0) throw new Error(`${name} must be a non-negative integer`);
  }
  if (commandCount <= 0) throw new Error('commandCount must be greater than zero');
  if (passed + failed !== commandCount) throw new Error('passed + failed must equal commandCount');
  if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) throw new Error('generatedAt must be a valid timestamp');
  if (Array.isArray(value.steps)) {
    if (value.steps.length !== commandCount) throw new Error('steps length must equal commandCount');
    const rowFailures = value.steps.filter((row) => row?.status !== 0).length;
    if (rowFailures !== failed) throw new Error('step exit codes must agree with failed');
  } else if (requireComplete) {
    throw new Error('complete build-check evidence requires steps');
  }
  if (Array.isArray(value.failures) && value.failures.length !== failed) throw new Error('failures length must equal failed');
  if (value.schemaVersion === '2.0') {
    if (!Number.isInteger(value.plannedCommandCount) || value.plannedCommandCount <= 0) throw new Error('plannedCommandCount must be positive');
    if (!Number.isInteger(value.firstStep) || value.firstStep <= 0) throw new Error('firstStep must be positive');
    if (typeof value.planFingerprint !== 'string' || !/^[a-f0-9]{24}$/.test(value.planFingerprint)) throw new Error('planFingerprint must be a 24-character hex digest');
    if (typeof value.sourceFingerprint !== 'string' || !/^[a-f0-9]{24}$/.test(value.sourceFingerprint)) throw new Error('sourceFingerprint must be a 24-character hex digest');
    const coverageComplete = value.firstStep === 1 && value.commandCount === value.plannedCommandCount;
    if (value.coverageComplete !== coverageComplete) throw new Error('coverageComplete does not match executed coverage');
    if (value.receiptId !== receiptIdFor(value)) throw new Error('receiptId does not match receipt content');
    if (expectedPlanFingerprint && value.planFingerprint !== expectedPlanFingerprint) throw new Error('receipt plan fingerprint is stale');
    if (expectedSourceFingerprint && value.sourceFingerprint !== expectedSourceFingerprint) throw new Error('receipt source fingerprint is stale');
    if (requireComplete && !coverageComplete) throw new Error('receipt covers only part of the planned suite');
  } else if (requireComplete) {
    throw new Error('complete evidence requires schemaVersion 2.0 attestation');
  }
  return value;
}

export function verifiedStatusTestEvidence(status, evidence, expectedPlanFingerprint, expectedSourceFingerprint = null, { maxAgeHours = 24, nowMs = Date.now() } = {}) {
  try {
    const valid = validateBuildCheckEvidence(evidence, { requireComplete: true, expectedPlanFingerprint, expectedSourceFingerprint });
    const fresh = Math.max(0, nowMs - Date.parse(valid.generatedAt)) / 3.6e6 <= maxAgeHours;
    const agrees = fresh
      && status?.testsPassing === valid.passed
      && status?.testsTotal === valid.commandCount
      && status?.testsFailed === valid.failed
      && status?.testsPlanFingerprint === valid.planFingerprint
      && status?.testsSourceFingerprint === valid.sourceFingerprint;
    return agrees
      ? { verified: true, label: `${valid.passed}/${valid.commandCount} measured`, receiptId: valid.receiptId }
      : { verified: false, label: fresh ? 'UNVERIFIED (status/receipt mismatch)' : 'UNVERIFIED (receipt stale)', receiptId: valid.receiptId };
  } catch (error) {
    return { verified: false, label: `UNVERIFIED (${error.message})`, receiptId: null };
  }
}
export function buildCheckEvidenceAgeHours(value, nowMs = Date.now()) {
  validateBuildCheckEvidence(value);
  return Math.max(0, nowMs - Date.parse(value.generatedAt)) / 3.6e6;
}

export function applyBuildCheckEvidence(status, evidence) {
  const valid = validateBuildCheckEvidence(evidence, { requireComplete: true });
  // Receipt IDs bind volatile timing/timestamps and must not enter durable status:
  // doing so would dirty PROJECT_STATUS after every identical suite and trigger an
  // endless closeout reconcile→rerun→new-receipt loop. Persist stable plan identity.
  const { testsEvidenceReceipt: _obsoleteVolatileReceipt, ...stableStatus } = status;
  return {
    ...stableStatus,
    testsTotal: valid.commandCount,
    testsPassing: valid.passed,
    testsFailed: valid.failed,
    testsLastRun: valid.generatedAt.slice(0, 10),
    testsLabel: 'measured build:check steps',
    testsEvidence: 'api/build-check-diagnostics.json',
    testsPlanFingerprint: valid.planFingerprint,
    testsSourceFingerprint: valid.sourceFingerprint,
  };
}

function fixture({ failed = 0, firstStep = 1, planned = 2, commands = ['node a.mjs', 'node b.mjs'] } = {}) {
  const rows = commands.slice(firstStep - 1).map((command, index, subset) => ({ command, status: failed && index === subset.length - 1 ? 1 : 0 }));
  const value = {
    schemaVersion: '2.0',
    generatedAt: '2026-07-27T00:00:00.000Z',
    commandCount: rows.length,
    plannedCommandCount: planned,
    firstStep,
    coverageComplete: firstStep === 1 && rows.length === planned,
    planFingerprint: fingerprintCommands(commands),
    sourceFingerprint: 'a'.repeat(24),
    passed: rows.filter((row) => row.status === 0).length,
    failed: rows.filter((row) => row.status !== 0).length,
    steps: rows,
    failures: rows.filter((row) => row.status !== 0),
  };
  value.receiptId = receiptIdFor(value);
  return value;
}

export function runBuildCheckEvidenceSelfTest() {
  const green = fixture();
  const red = fixture({ failed: 1 });
  const partial = fixture({ firstStep: 2 });
  const rejects = (candidate, options) => { try { validateBuildCheckEvidence(candidate, options); return false; } catch { return true; } };
  return [
    ['complete green validates', validateBuildCheckEvidence(green, { requireComplete: true }) === green],
    ['complete red remains valid evidence', validateBuildCheckEvidence(red, { requireComplete: true }) === red],
    ['partial resume is rejected as complete', rejects(partial, { requireComplete: true })],
    ['partial resume remains inspectable', validateBuildCheckEvidence(partial) === partial],
    ['count mismatch fails closed', rejects({ ...green, passed: 1 })],
    ['row mismatch fails closed', rejects({ ...green, steps: [{ status: 0 }] }, { requireComplete: true })],
    ['malformed timestamp fails closed', rejects({ ...green, generatedAt: 'not-a-date' })],
    ['stale plan fingerprint fails closed', rejects(green, { requireComplete: true, expectedPlanFingerprint: '0'.repeat(24) })],
    ['stale source fingerprint fails closed', rejects(green, { requireComplete: true, expectedSourceFingerprint: '0'.repeat(24) })],
    ['source fingerprint is order invariant', fingerprintNamedBuffers([['b', '2'], ['a', '1']]) === fingerprintNamedBuffers([['a', '1'], ['b', '2']])],
    ['source fingerprint detects byte change', fingerprintNamedBuffers([['a', '1']]) !== fingerprintNamedBuffers([['a', '2']])],
    ['receipt mutation fails integrity', rejects({ ...green, totalDurationMs: 7 })],
    ['status projection preserves red', applyBuildCheckEvidence({}, red).testsFailed === 1],
    ['status persists stable plan identity, not volatile receipt', applyBuildCheckEvidence({ testsEvidenceReceipt: 'old' }, green).testsPlanFingerprint === green.planFingerprint && !('testsEvidenceReceipt' in applyBuildCheckEvidence({ testsEvidenceReceipt: 'old' }, green))],
    ['matching status and receipt verify', verifiedStatusTestEvidence(applyBuildCheckEvidence({}, green), green, green.planFingerprint, green.sourceFingerprint, { nowMs: Date.parse(green.generatedAt) }).verified],
    ['stale hand counter is unverified', !verifiedStatusTestEvidence({ testsPassing: 99, testsTotal: 99, testsFailed: 0, testsPlanFingerprint: green.planFingerprint }, green, green.planFingerprint).verified],
    ['aged receipt is unverified on the closeout surface', !verifiedStatusTestEvidence(applyBuildCheckEvidence({}, green), green, green.planFingerprint, green.sourceFingerprint, { nowMs: Date.parse(green.generatedAt) + 25 * 3.6e6 }).verified],
  ];
}