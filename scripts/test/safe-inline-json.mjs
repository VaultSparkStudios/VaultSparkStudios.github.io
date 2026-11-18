#!/usr/bin/env node
/**
 * safe-inline-json — proves JSON placed in an inline <script> cannot close it.
 * Run: node scripts/test/safe-inline-json.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeInlineJson, stringifyForScript, isInlineSafe } from '../lib/safe-inline-json.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);
let failed = 0;
const check = (name, pass, detail = '') => {
  console.log(`${pass ? '✓' : '✗'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
  if (!pass) failed += 1;
};

const hostile = {
  headline: 'Model says </script><script>alert(1)</script> & more',
  comment: '<!-- <script',
  separators: 'a' + LINE_SEP + 'b' + PARA_SEP + 'c',
};

const out = stringifyForScript(hostile);
check('no "<" survives', !out.includes('<'));
check('no ">" survives', !out.includes('>'));
check('no raw "&" survives', !out.includes('&'));
check('no raw line separators survive', !out.includes(LINE_SEP) && !out.includes(PARA_SEP));
check('output is inline safe', isInlineSafe(out));
check('round-trips to the same value', JSON.stringify(JSON.parse(out)) === JSON.stringify(hostile));
check('already-serialised JSON is escaped the same way', safeInlineJson(JSON.stringify(hostile)) === out);
check('plain JSON is unchanged', safeInlineJson('{"a":"b c"}') === '{"a":"b c"}');
check('null input yields empty text', safeInlineJson(null) === '');

// The helper and this test must not carry invisible characters themselves.
for (const rel of ['scripts/lib/safe-inline-json.mjs', 'scripts/test/safe-inline-json.mjs']) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  check(`${rel} has no invisible separators in source`, !src.includes(LINE_SEP) && !src.includes(PARA_SEP));
}

// Generators that serialise model-written or member-written text must use the helper.
const mustUse = [
  'scripts/generate-news-pages.mjs',
  'scripts/generate-member-seo.mjs',
  'scripts/build-leaderboard-subpages.mjs',
  'scripts/build-ai-canonical-pages.mjs',
];
for (const rel of mustUse) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  check(`${rel} imports the helper`, src.includes('lib/safe-inline-json.mjs'));
  const lines = src.split('\n').filter((l) => l.includes('application/ld+json">${') || l.includes('data-vs-breadcrumb>${'));
  const raw = lines.filter((l) => !l.includes('safeInlineJson(') && !l.includes('stringifyForScript('));
  check(`${rel} emits no unescaped structured data`, raw.length === 0, raw[0]?.trim().slice(0, 120));
}

// Second layer: model-written article bodies are marked, and the edge removes
// any active element found inside a marked container.
const newsSrc = fs.readFileSync(path.join(ROOT, 'scripts/generate-news-pages.mjs'), 'utf8');
check('article body is marked data-untrusted-content', newsSrc.includes('class="desk-body" id="story" aria-label="The story" data-untrusted-content'));
const workerSrc = fs.readFileSync(path.join(ROOT, 'cloudflare/security-headers-worker.js'), 'utf8');
const removerAt = workerSrc.indexOf('.on(UNTRUSTED_ACTIVE_SELECTOR, new UntrustedActiveContentRemover())');
const nonceAt = workerSrc.indexOf(".on('script,style', new NonceInjector(nonce))");
check('edge removes active elements in untrusted containers', removerAt > 0);
check('removal is registered before nonce stamping', removerAt > 0 && nonceAt > removerAt);

console.log(`safe-inline-json: ${failed === 0 ? 'all passed' : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
