// Load the canonical PROJECT_REGISTRY.json.
// Prefers local portfolio/ copy, falls back to sibling vaultspark-studio-ops/portfolio/.
// Returns { projects: [...] } (or a user-supplied empty shape) so callers can
// degrade gracefully instead of crashing doctor when run on a fresh checkout.
import fs from 'fs';
import path from 'path';

export function loadRegistry(root, { empty = { projects: [] } } = {}) {
  const local = path.join(root, 'portfolio', 'PROJECT_REGISTRY.json');
  const ops   = path.join(root, '..', 'vaultspark-studio-ops', 'portfolio', 'PROJECT_REGISTRY.json');
  const p = fs.existsSync(local) ? local : (fs.existsSync(ops) ? ops : null);
  if (!p) return { registry: empty, path: null };
  return { registry: JSON.parse(fs.readFileSync(p, 'utf8')), path: p };
}
