import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../supabase/functions/', import.meta.url));
const policy = JSON.parse(fs.readFileSync(new URL('../config/edge-remote-imports.json', import.meta.url), 'utf8'));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);

test('every existing edge remote dependency uses an exact approved package version', () => {
  const versions = new Map(policy.packages.map((p) => [p.name, p.version]));
  for (const file of walk(root).filter((name) => /\.ts$/.test(name))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/from\s+['"](https:\/\/[^'"]+)['"]/g)) {
      const url = match[1];
      if (url.startsWith('https://esm.sh/@supabase/supabase-js@')) assert.match(url, new RegExp(`^https://esm\\.sh/@supabase/supabase-js@${versions.get('@supabase/supabase-js').replaceAll('.', '\\.')}[/?]?$`), file);
      else if (url.startsWith('https://esm.sh/stripe@')) assert.match(url, new RegExp(`^https://esm\\.sh/stripe@${versions.get('stripe').replaceAll('.', '\\.')}\\?target=deno$`), file);
      else if (url.startsWith('https://deno.land/std@')) assert.match(url, /^https:\/\/deno\.land\/std@\d+\.\d+\.\d+\//, file);
      else assert.fail(`Unreviewed edge import in ${file}`);
    }
  }
});

test('pin provenance names primary sources and registry integrity without inventing downloaded-byte proof', () => {
  for (const entry of policy.packages) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.source, /^https:\/\/github.com\/(?:supabase\/supabase-js|stripe\/stripe-node)\/releases\/tag\//);
    assert.match(entry.registry, /^https:\/\/registry.npmjs.org\//);
    assert.match(entry.registryIntegrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
    assert.equal(entry.license, 'MIT');
  }
  assert.match(policy.limits, /not a claim/);
});
