// Runs the exact pre-push coherence set for origin/main..HEAD + staged files,
// rebuilding (builder) and staging (output + alsoStage) any node whose check fails.
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { coherenceChecksForFiles } = await import(pathToFileURL(path.join(root, 'scripts/pre-push-scan.mjs')).href);
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).split('\n').filter(Boolean);
const graph = JSON.parse((await import('node:fs')).readFileSync('config/evidence-graph.json', 'utf8'));
const nodes = new Map((graph.nodes || graph).map((n) => [n.id, n]));
for (let pass = 1; pass <= 3; pass++) {
  const files = [...new Set([...git('diff', '--name-only', 'origin/main...HEAD'), ...git('diff', '--name-only', '--cached'), ...git('diff', '--name-only')])];
  let failed = 0;
  for (const check of coherenceChecksForFiles(files, root)) {
    const r = spawnSync(check.command[0], check.command.slice(1), { cwd: root, encoding: 'utf8', windowsHide: true });
    if (r.status === 0) continue;
    failed++;
    const node = nodes.get(check.id);
    if (!node?.builder) { console.log(`✗ ${check.id}: no builder`); continue; }
    spawnSync('node', [node.builder], { cwd: root, stdio: 'ignore', windowsHide: true });
    const stage = [node.output, ...(node.alsoStage || [])].flat().filter(Boolean);
    spawnSync('git', ['add', '--', ...stage], { cwd: root, stdio: 'ignore' });
    console.log(`↻ pass ${pass}: rebuilt ${check.id}`);
  }
  if (!failed) { console.log(`evidence graph coherent (pass ${pass})`); process.exit(0); }
}
console.log('evidence graph still incoherent after 3 passes'); process.exit(1);
