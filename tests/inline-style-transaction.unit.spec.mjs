import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';

const source = fs.readFileSync(new URL('../scripts/extract-inline-styles.mjs', import.meta.url));
const parserSource = fs.readFileSync(new URL('../scripts/lib/inline-style-extraction.mjs', import.meta.url));
const declarations = 'color:var(--gold); padding: 1rem;';
const className = `vsx-${crypto.createHash('sha1').update(declarations).digest('hex').slice(0, 10)}`;
const html = `<html><head></head><body><p class="existing" style="${declarations}">Visible content</p></body></html>\n`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-inline-style-transaction-'));
  t.after(() => {
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved).toLowerCase(), fs.realpathSync(os.tmpdir()).toLowerCase());
    assert.ok(path.basename(resolved).startsWith('vs-inline-style-transaction-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'scripts/lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/lib/inline-style-extraction.mjs'), parserSource);
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'scripts/extract-inline-styles.mjs'), source);
  fs.writeFileSync(path.join(root, 'assets/style.css'), 'body{color:inherit;}\n');
  fs.writeFileSync(path.join(root, 'index.html'), html);
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const run = (...flags) => spawnSync(process.execPath, [path.join(root, 'scripts/extract-inline-styles.mjs'), '--targets=index.html,trust/index.html', ...flags], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000,
  });
  return { root, read, run };
}

test('missing later canonical target leaves earlier HTML and shared CSS byte-for-byte unchanged', t => {
  const f = fixture(t);
  const beforeHtml = f.read('index.html'), beforeCss = f.read('assets/style.css');
  const result = f.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /ENOENT/);
  assert.match(result.stderr, /trust/);
  assert.equal(f.read('index.html'), beforeHtml);
  assert.equal(f.read('assets/style.css'), beforeCss);
  assert.ok(!f.read('index.html').includes(className));
});

test('successful canonical extraction preserves declarations and first-paint rules, then remains stable', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'trust'));
  fs.writeFileSync(path.join(f.root, 'trust/index.html'), '<html><head></head><body>Trust</body></html>\n');
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!f.read('index.html').includes(' style='));
  assert.ok(f.read('index.html').includes(`class="existing ${className}"`));
  assert.ok(f.read('index.html').includes(`<style data-vs-page-styles>.${className}{${declarations}}</style>`));
  assert.ok(f.read('assets/style.css').includes(`.${className}{${declarations}}`));
  const before = ['index.html', 'trust/index.html', 'assets/style.css'].map(f.read);
  const check = f.run('--check');
  assert.equal(check.status, 0, check.stderr);
  assert.deepEqual(['index.html', 'trust/index.html', 'assets/style.css'].map(f.read), before);
  const second = f.run();
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual(['index.html', 'trust/index.html', 'assets/style.css'].map(f.read), before);
});

test('raw script/style/comment/template source is byte-preserved while actual HTML attributes extract', t => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'trust'));
  fs.writeFileSync(path.join(f.root, 'trust/index.html'), '<html><head></head><body>Trust</body></html>');
  const sources = [
    '<script>const hex = "#FFC400"; const markup = `<div style="background:${hex}">${hex}</div>`; const quoted = "<b style=\'color:red\'>";</script>',
    '<SCRIPT type="text/template"><article style="background:${hex}">source</article></SCRIPT>',
    '<style>.sample::after { content: "<span style=\'color:red\'>"; }</style>',
    '<!-- <aside style="color:orange">comment source</aside> -->',
    '<template id="source"><div style="color:blue"><template><p style="color:red">nested</p></template><script>const x = "<i style=\'color:lime\'>";</script></div></template>',
    '<textarea><div style="color:orange">literal textarea content</div></textarea>',
    '<title><b style="color:pink">literal title content</b></title>',
  ];
  fs.writeFileSync(path.join(f.root, 'index.html'), '<html><head>' + sources.join('\n') + '</head><body><section data-note="1 > 0 and apostrophe\'s" style = "padding: 2rem; color: #fff;" class=existing>Real</section><img alt="a > b" style="width: 2rem;" /></body></html>');
  const run = f.run(); assert.equal(run.status, 0, run.stderr);
  const result = f.read('index.html'), css = f.read('assets/style.css');
  for (const source of sources) assert.ok(result.includes(source), source);
  assert.ok(result.includes('data-note="1 > 0 and apostrophe\'s"'));
  assert.match(result, /class="existing vsx-[a-f0-9]{10}"/);
  assert.match(result, /<img alt="a > b"\s+class="vsx-[a-f0-9]{10}"\/>/);
  assert.ok(css.includes('padding: 2rem; color: #fff;'));
  assert.ok(css.includes('width: 2rem;'));
  assert.doesNotMatch(css, /\$\{hex\}|color:(?:red|blue|lime|orange|pink)/);
  const check = f.run('--check'); assert.equal(check.status, 0, check.stderr);
});

test('cumulative prune removes only an unreferenced interpolation rule while preserving a referenced historical rule', t => {
  const f = fixture(t), historical = 'vsx-0123456789';
  fs.mkdirSync(path.join(f.root, 'trust'));
  fs.writeFileSync(path.join(f.root, 'trust/index.html'), `<html><head></head><body class="${historical}">Historical</body></html>`);
  fs.writeFileSync(path.join(f.root, 'assets/style.css'), `body{color:inherit;}\n/* extracted intelligence surface inline styles: start */\n.${historical}{display:none !important;}\n.vsx-dc3e1f028a{background:\${hex}\n/* extracted intelligence surface inline styles: end */\n`);
  const run = f.run(); assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /pruned 1 unreferenced/);
  const css = f.read('assets/style.css'); assert.ok(css.includes(`.${historical}{display:none !important;}`));assert.ok(!css.includes('vsx-dc3e1f028a'));assert.ok(css.includes(`.${className}{${declarations}}`));
});
