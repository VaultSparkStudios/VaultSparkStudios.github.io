/**
 * decisions-corpus.mjs — single source of truth for "which decision ids exist".
 *
 * WHY THIS EXISTS (S276): the phantom-carry suppressor is only safe while its
 * `supersededBy` decision id is present in DECISIONS.md. rotate-ledger shards old
 * decisions into context/archive/DECISIONS_<quarter>.md, so the lookup corpus must
 * be the live file PLUS every archive shard — an archived decision still exists.
 *
 * That rule was independently re-implemented in check-phantom-carries.mjs (the
 * validator) and generate-genius-list.mjs (the actual suppressor). They drifted:
 * the validator scanned archives and reported "healthy" while the suppressor read
 * only the live file, silently went inert, and leaked the rejected Forge-Window
 * item back into the genius list every session. One shared reader means the
 * validator and the suppressor can never again disagree about what's decision-backed.
 *
 * Pure I/O — no side effects beyond reads. Missing archive dir is not an error
 * (a fresh repo's live DECISIONS.md is the whole corpus).
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Read the full decisions corpus: live context/DECISIONS.md concatenated with
 * every context/archive/DECISIONS_<YYYY>Q<N>.md shard.
 * @param {string} root - repo root (absolute path)
 * @returns {string} concatenated decisions text
 */
export function readDecisionsCorpus(root) {
  const readText = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
  let corpus = readText(path.join(root, 'context', 'DECISIONS.md'));
  try {
    const archiveDir = path.join(root, 'context', 'archive');
    for (const f of fs.readdirSync(archiveDir)) {
      if (/^DECISIONS_\d{4}Q\d\.md$/.test(f)) corpus += '\n' + readText(path.join(archiveDir, f));
    }
  } catch { /* no archive dir yet — live file is the whole corpus */ }
  return corpus;
}
