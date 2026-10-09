import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// S372: two Worker legacy 301s landed on routes that a later IA consolidation had
// itself retired, so visitors and crawlers took two hops (/signal-log -> /journal/
// -> /changelog/#stories). Every redirect must land on a served destination.
const ROOT = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const slashed = (route) => (route.endsWith('/') ? route : `${route}/`);
const pathOf = (target) => target.split('#')[0].split('?')[0];

export function redirectRules(text) {
  const rules = [];
  for (const line of String(text).split(/\r?\n/)) {
    const [source, target, status] = line.trim().split(/\s+/);
    if (!source || source.startsWith('#') || !/^30[1278]!?$/.test(status || '')) continue;
    rules.push([source, target]);
  }
  return rules;
}

export function retiredSources(rules) {
  return new Map(rules.filter(([source]) => !source.includes('*')).map(([source, target]) => [slashed(source), target]));
}

export function workerLegacyPairs(source) {
  return [...source.matchAll(/^\s*'(\/[^']*)':\s*'(\/[^']*)'/gm)].map((match) => [match[1], match[2]]);
}

export function chains(pairs, retired) {
  return pairs
    .filter(([, target]) => !/^https?:/.test(target) && retired.has(slashed(pathOf(target))))
    .map(([source, target]) => `${source} -> ${target} -> ${retired.get(slashed(pathOf(target)))}`);
}

test('chain detection sees a hop onto a retired route and ignores served targets', () => {
  const retired = retiredSources(redirectRules('/journal/  /changelog/#stories  301\n/tree/*  /x/  301\n'));
  assert.deepEqual(chains([['/signal-log', '/journal/'], ['/a', '/changelog/#stories'], ['/b', '/tree/']], retired),
    ['/signal-log -> /journal/ -> /changelog/#stories']);
});

test('no Worker legacy redirect lands on a route _redirects retires', () => {
  const retired = retiredSources(redirectRules(read('_redirects')));
  const pairs = workerLegacyPairs(read('cloudflare/security-headers-worker.js'));
  assert.ok(pairs.length >= 40, `expected the Worker legacy maps, parsed ${pairs.length} pairs`);
  assert.deepEqual(chains(pairs, retired), []);
});

test('no _redirects rule lands on a route _redirects retires', () => {
  const rules = redirectRules(read('_redirects'));
  assert.ok(rules.length >= 40, `expected the _redirects table, parsed ${rules.length} rules`);
  assert.deepEqual(chains(rules, retiredSources(rules)), []);
});
