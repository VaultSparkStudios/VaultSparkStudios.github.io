import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../assets/ambient-loader.js', import.meta.url), 'utf8');
function actualFunction(name) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('\n  }\n', start);
  assert.ok(start >= 0 && end > start, 'actual loader function exists');
  return source.slice(start, end + 4);
}
function scheduler({ eligible = true } = {}) {
  let clock = 0;
  const tasks = [], listeners = {}, loaded = [];
  const modules = Array.from({ length: 38 }, (_, index) => ({
    src: index === 3 ? '/assets/desk-wire.js' : index === 20 ? '/assets/rank-orb.js' : '/assets/optional-' + index + '.js',
    idle: true, when: () => eligible,
  }));
  const setTimeout = (callback, delay) => tasks.push({ at: clock + delay, callback });
  const requestIdleCallback = (callback, options) => { assert.equal(options.timeout, 1500); setTimeout(callback, 1500); };
  const window = { requestIdleCallback, addEventListener(type, callback, options) {
    assert.equal(options.once, true); listeners[type] = callback;
  } };
  const maybeLoad = definition => { if (definition.when()) loaded.push({ src: definition.src, at: clock }); };
  new Function('modules', 'maybeLoad', 'window', 'requestIdleCallback', 'setTimeout',
    actualFunction('runIdleQueue') + '\n' + actualFunction('run') + '\nrun();')(
    modules, maybeLoad, window, requestIdleCallback, setTimeout);
  function until(time) {
    for (;;) { tasks.sort((a, b) => a.at - b.at); if (!tasks.length || tasks[0].at > time) break;
      const task = tasks.shift(); clock = task.at; task.callback(); }
    clock = time;
  }
  return { loaded, until, engage: () => listeners.keydown(), pointer: () => listeners.pointerdown() };
}

test('actual loader dispatches only the eligible header pair after the unchanged engagement delay', () => {
  const f = scheduler(); f.engage(); f.until(1199); assert.deepEqual(f.loaded, []);
  f.until(1200); assert.deepEqual(f.loaded, [
    { src: '/assets/desk-wire.js', at: 1200 }, { src: '/assets/rank-orb.js', at: 1200 },
  ]);
  f.until(5000); assert.deepEqual(f.loaded.slice(2).map(row => row.at), [2700, 4200]);
  assert.deepEqual(f.loaded.slice(2).map(row => row.src), ['/assets/optional-0.js', '/assets/optional-1.js']);
});
test('actual loader retains predicates and one-shot engagement scheduling', () => {
  const f = scheduler({ eligible: false }); f.engage(); f.pointer(); f.until(35000); assert.deepEqual(f.loaded, []);
  const g = scheduler(); g.engage(); g.pointer(); g.until(14000);
  for (const src of ['/assets/desk-wire.js', '/assets/rank-orb.js']) assert.equal(g.loaded.filter(row => row.src === src).length, 1);
});
test('actual loader retains the quiet-visit 12000ms fallback plus 1200ms delay', () => {
  const f = scheduler(); f.until(13199); assert.deepEqual(f.loaded, []); f.until(13200);
  assert.deepEqual(f.loaded.map(row => row.src), ['/assets/desk-wire.js', '/assets/rank-orb.js']);
});
test('actual header predicates retain desktop, mobile, excluded-route and no-strip eligibility', () => {
  const start = source.indexOf('const modules = ['), end = source.indexOf('\n  ];', start);
  const definitions = source.slice(start + 'const modules = '.length, end + 5);
  for (const [pathname, mobile, noStrip, expected] of [
    ['/games/', false, false, [true, true]], ['/changelog/', true, false, [false, true]],
    ['/api/', false, false, [false, false]], ['/vault-member/', false, false, [false, false]],
    ['/investor-portal/', false, false, [false, false]], ['/admin/', false, false, [false, false]],
    ['/games/', false, true, [false, true]], ['/news/2026-11-10/story/', false, false, [false, true]],
  ]) {
    const document = { documentElement: { hasAttribute: () => noStrip }, body: { hasAttribute: () => false }, querySelector: () => ({}) };
    const modules = new Function('window', 'document', 'location', 'return ' + definitions)(
      { matchMedia: () => ({ matches: mobile }) }, document, { pathname });
    const results = ['/assets/desk-wire.js', '/assets/rank-orb.js'].map(src => modules.find(row => row.src === src).when());
    assert.deepEqual(results, expected, pathname);
  }
});
