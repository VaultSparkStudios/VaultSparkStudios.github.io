import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { chromium } from '@playwright/test';
import { compactCssTransport } from '../scripts/lib/css-transport.mjs';

test('CSS transport preserves parsed selectors, declarations, strings and custom-property tokens', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const fixture = '/* source notes */\n.a :hover {\n color: red; content: "a  b /*literal*/";\n --value: 1/**/px; --label: "two  spaces"; background: url("https://example.invalid/a  b");\n }';
    for (const source of [fixture, fs.readFileSync(new URL('../assets/style.css', import.meta.url), 'utf8'), fs.readFileSync(new URL('../assets/spark-compass.css', import.meta.url), 'utf8')]) {
      const compact = compactCssTransport(source);
      const result = await page.evaluate(({source, compact}) => {
        // Whitespace tokens outside quoted strings are interchangeable; literal
        // string whitespace remains significant and must compare byte-for-byte.
        const canonical = (text) => text.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|,\s*|\s+/g, (token) => /^\s/.test(token) ? ' ' : token.startsWith(',') ? ',' : token);
        const rules = (css) => { const sheet = new CSSStyleSheet(); sheet.replaceSync(css); return Array.from(sheet.cssRules, (rule) => canonical(rule.cssText)); };
        return { before: rules(source), after: rules(compact) };
      }, {source, compact});
      assert.deepEqual(result.after, result.before);
    }
  } finally { await browser.close(); }
});

test('main shell CSS transfers materially fewer compressed bytes', () => {
  const source = fs.readFileSync(new URL('../assets/style.css', import.meta.url), 'utf8');
  const compact = compactCssTransport(source);
  const originalBytes = zlib.gzipSync(source).length;
  const compactBytes = zlib.gzipSync(compact).length;
  assert.ok(compactBytes <= originalBytes * 0.8, `${compactBytes} must be at least 20% below ${originalBytes}`);
});
