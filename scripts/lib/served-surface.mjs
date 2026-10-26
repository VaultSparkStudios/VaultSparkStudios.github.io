/** Positive deployment classification shared by packaging and remote readback. */
export function isServed(rel, manifest) {
  const p = String(rel).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!p) return false;
  if ((manifest.excludedPrefixes || []).some((prefix) => p.startsWith(prefix))) return false;
  if ((manifest.exact || []).includes(p)) return true;
  if ((manifest.prefixes || []).some((prefix) => p.startsWith(prefix))) return true;
  return (manifest.keptInternalPrefixes || []).some((prefix) => p.startsWith(prefix));
}
