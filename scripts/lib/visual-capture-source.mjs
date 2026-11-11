// Candidate baselines must describe the checked-out preview, never an older deployment.
export const CANDIDATE_ORIGIN = 'http://127.0.0.1:4173';

export function captureSource({ origin = CANDIDATE_ORIGIN, update = 'false', sha } = {}) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Capture requires an exact checkout SHA.');
  if (!['true', 'false'].includes(update)) throw new Error('Capture update mode must be true or false.');
  let url;
  try { url = new URL(origin); } catch { throw new Error('Capture origin must be an HTTP(S) origin.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Capture origin must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  if (update === 'true' && url.origin !== CANDIDATE_ORIGIN) {
    throw new Error('Baseline generation requires the checked-out candidate preview. External captures are comparisons only.');
  }
  return { schemaVersion: '1.0', sourceCommit: sha, origin: url.origin, mode: update === 'true' ? 'provisional-generation' : 'comparison', reviewed: false };
}

export function baselineRunIssues(run, expectedSha) {
  const issues = [];
  if (run?.status !== 'completed' || run?.conclusion !== 'success') issues.push('Baseline run must be completed and successful.');
  if (!/^[a-f0-9]{40}$/.test(expectedSha || '') || run?.headSha !== expectedSha) issues.push('Baseline run must match the current checkout SHA.');
  if (run?.event !== 'workflow_dispatch') issues.push('Baseline run must be an explicit capture dispatch.');
  if (run?.path !== '.github/workflows/visual-regression.yml'
    || run?.repository?.full_name !== 'VaultSparkStudios/VaultSparkStudios.github.io') issues.push('Baseline run must belong to this repository and the visual capture workflow.');
  return issues;
}

export function captureReceiptIssues(receipt, expectedSha) {
  return receipt?.schemaVersion === '1.0' && receipt.sourceCommit === expectedSha
    && /^[a-f0-9]{40}$/.test(expectedSha || '') && receipt.origin === CANDIDATE_ORIGIN
    && receipt.mode === 'provisional-generation' && receipt.reviewed === false
    ? [] : ['Artifact lacks matching provisional candidate capture provenance.'];
}
