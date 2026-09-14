// One inventory per repair, including directory membership. Git failures stay
// failures: an unreadable index must not classify every source as untracked.
import { performance } from 'node:perf_hooks';
const normalize = value => String(value).replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
export function trackedInventory(runGit) {
  const started = performance.now();
  const raw = runGit(['ls-files', '-z']);
  const files = new Set(String(raw).split('\0').filter(Boolean).map(normalize));
  const directories = new Set();
  for (const file of files) {
    const parts = file.split('/');
    for (let count = 1; count < parts.length; count++) directories.add(parts.slice(0, count).join('/'));
  }
  return {
    trackedFiles: files.size, commands: 1, durationMs: Number((performance.now() - started).toFixed(1)),
    has: source => files.has(normalize(source)) || directories.has(normalize(source)),
  };
}
// `external:` sources (founder brand masters, live production probes) are not
// repo paths git fails to see; they are outside the repo entirely. A rebase
// cannot change them and a CI runner cannot rebuild from them, so they must not
// make a node always-dirty. S353: they did, and every rebased publisher then ran
// build-brand-assets, which refuses without the masters, so the Desk edition,
// uptime and narrative publishers each refused to push.
export const isExternalSource = source => /^external:/.test(String(source));
export function untrackedSourceNodes(graph, inventory) {
  return graph.nodes.filter(node => node.sources.some(source => !isExternalSource(source) && !source.includes('*') && !inventory.has(source)));
}
