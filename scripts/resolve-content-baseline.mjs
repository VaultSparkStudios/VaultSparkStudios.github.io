#!/usr/bin/env node
// Content overlays retain the artifact's executable baseline. Deployment source
// metadata describes the overlay's checkout and must never select that baseline.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { printHelpIfRequested } from './lib/cli-contract.mjs';

export const CONTENT_BASELINE_URL = 'https://vaultsparkstudios-website.pages.dev/api/build-sha.json';
const SHA = /^[a-f0-9]{40}$/;
const MAX_STAMP_BYTES = 16 * 1024;
const usage = 'Usage: node scripts/resolve-content-baseline.mjs [--emit-github-output]\nReads the live production artifact baseline; BASELINE_INPUT may only confirm that exact SHA.';

export function artifactBaseline(stamp, requested = '') {
  if (!stamp || typeof stamp !== 'object' || Array.isArray(stamp)
    || !['1.0', '1.1'].includes(stamp.schemaVersion) || !SHA.test(stamp.sha || '')) {
    throw new Error('Production artifact has no valid baseline stamp');
  }
  if ((stamp.buildSha != null && stamp.buildSha !== stamp.sha)
    || (stamp.baselineSha != null && stamp.baselineSha !== stamp.sha)
    || (stamp.contentLaneHead != null && !SHA.test(stamp.contentLaneHead))) {
    throw new Error('Production artifact baseline provenance conflicts');
  }
  if (stamp.contentLaneHead != null && stamp.baselineSha !== stamp.sha) {
    throw new Error('Production content overlay has no matching baseline provenance');
  }
  if (requested !== '' && (!SHA.test(requested) || requested !== stamp.sha)) {
    throw new Error('Requested baseline differs from the live production artifact');
  }
  return stamp.sha;
}

export async function resolveContentBaseline({ requested = '', fetchImpl = globalThis.fetch } = {}) {
  if (requested !== '' && !SHA.test(requested)) throw new Error('Requested baseline must be an exact commit SHA');
  const response = await fetchImpl(CONTENT_BASELINE_URL, {
    headers: { accept: 'application/json', 'cache-control': 'no-cache' },
    cache: 'no-store', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(8000),
  });
  if (response.status !== 200 || response.redirected
    || !/^application\/json\b/i.test(response.headers.get('content-type') || '')) {
    throw new Error('Live production baseline observation is nonpassing');
  }
  if (Number(response.headers.get('content-length')) > MAX_STAMP_BYTES) throw new Error('Production baseline stamp exceeds its size limit');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Production baseline stamp is unreadable');
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_STAMP_BYTES) throw new Error('Production baseline stamp exceeds its size limit');
      chunks.push(Buffer.from(part.value));
    }
    let stamp;
    try { stamp = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new Error('Production baseline stamp is malformed'); }
    return artifactBaseline(stamp, requested);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function main(args = process.argv.slice(2), { requested = process.env.BASELINE_INPUT || '', fetchImpl = globalThis.fetch, write = console.log } = {}) {
  if (printHelpIfRequested(args, usage, write)) return 0;
  if (args.length > 1 || args.some((arg) => arg !== '--emit-github-output')) {
    console.error(usage); return 2;
  }
  const baseline = await resolveContentBaseline({ requested, fetchImpl });
  write(args.includes('--emit-github-output') ? `baseline=${baseline}` : baseline);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await main(); }
  catch (error) { console.error(`resolve-content-baseline: ${error.message}`); process.exitCode = 1; }
}
