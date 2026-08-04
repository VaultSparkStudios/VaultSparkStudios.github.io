#!/usr/bin/env node
/**
 * inject-speakable-jsonld.mjs — S303 AEO depth.
 *
 * Adds a SpeakableSpecification to the primary JSON-LD block of pages whose
 * content answer engines quote aloud: journal posts (BlogPosting) and the FAQ
 * (FAQPage). Speakable tells assistants WHICH part of the page is the answer —
 * the headline and the summary — instead of letting them guess.
 *
 * Idempotent: pages already carrying "speakable" are untouched. The selector
 * list is intentionally tiny and stable (h1 + meta description) so the markup
 * never drifts from what the page actually renders.
 *
 * Usage:
 *   node scripts/inject-speakable-jsonld.mjs            # inject where missing
 *   node scripts/inject-speakable-jsonld.mjs --check    # gate: fail on gaps
 *   node scripts/inject-speakable-jsonld.mjs --self-test
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

const SPEAKABLE = { '@type': 'SpeakableSpecification', cssSelector: ['h1', "meta[name='description']"] };
const TARGET_TYPES = new Set(['BlogPosting', 'FAQPage', 'Article', 'NewsArticle']);

/** Pages that should carry speakable: tracked journal posts + the FAQ. */
function targetPages() {
  const tracked = execFileSync('git', ['ls-files', 'journal/*/index.html', 'faq/index.html', 'news/*/*/index.html'], {
    cwd: ROOT, encoding: 'utf8',
  }).split('\n').filter(Boolean);
  // Journal index/archive/dispatch listings are lists, not spoken answers.
  return tracked.filter((rel) => !/journal\/(archive|dispatches)\//.test(rel));
}

/** Inject speakable into the first top-level JSON-LD block of a target type. */
export function injectSpeakable(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const match of blocks) {
    let parsed;
    try { parsed = JSON.parse(match[1]); } catch { continue; }
    const nodes = Array.isArray(parsed) ? parsed : [parsed];
    const target = nodes.find((node) => TARGET_TYPES.has(node?.['@type']));
    if (!target) continue;
    if (target.speakable) return { html, changed: false, covered: true };
    target.speakable = SPEAKABLE;
    const nextJson = JSON.stringify(Array.isArray(parsed) ? nodes : nodes[0]);
    const nextBlock = match[0].replace(match[1], nextJson);
    return { html: html.replace(match[0], nextBlock), changed: true, covered: true };
  }
  return { html, changed: false, covered: false };
}

function selfTest() {
  const mk = (json) => `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script></head></html>`;
  const cases = [
    ['injects into a BlogPosting', () => {
      const r = injectSpeakable(mk({ '@type': 'BlogPosting', headline: 'x' }));
      return r.changed && r.html.includes('SpeakableSpecification');
    }],
    ['idempotent on a covered page', () => {
      const once = injectSpeakable(mk({ '@type': 'BlogPosting', headline: 'x' })).html;
      const twice = injectSpeakable(once);
      return twice.changed === false && twice.covered === true && twice.html === once;
    }],
    ['skips non-target types untouched', () => {
      const r = injectSpeakable(mk({ '@type': 'Organization' }));
      return !r.changed && !r.covered;
    }],
    ['FAQPage is a target', () => injectSpeakable(mk({ '@type': 'FAQPage' })).changed],
    ['invalid JSON-LD never throws', () => {
      const r = injectSpeakable('<script type="application/ld+json">{nope</script>');
      return !r.changed && !r.covered;
    }],
    ['selector list names the rendered answer surfaces', () => {
      const r = injectSpeakable(mk({ '@type': 'BlogPosting' }));
      return r.html.includes('"h1"') && r.html.includes("meta[name='description']");
    }],
  ];
  let pass = 0;
  for (const [name, fn] of cases) { const ok = fn(); console.log(`  ${ok ? '✓' : '✗'} ${name}`); if (ok) pass++; }
  console.log(`inject-speakable-jsonld --self-test: ${pass}/${cases.length}`);
  process.exit(pass === cases.length ? 0 : 1);
}

if (SELF_TEST) selfTest();

let injected = 0, covered = 0, gaps = [];
for (const rel of targetPages()) {
  const abs = path.join(ROOT, rel);
  const html = readFileSync(abs, 'utf8');
  const result = injectSpeakable(html);
  if (!result.covered) { gaps.push(rel); continue; }
  covered++;
  if (result.changed) {
    if (!CHECK) writeFileSync(abs, result.html);
    injected++;
  }
}
if (CHECK) {
  if (injected > 0 || gaps.length) {
    if (injected > 0) console.error(`inject-speakable-jsonld --check: ${injected} page(s) missing speakable; run node scripts/inject-speakable-jsonld.mjs`);
    for (const rel of gaps) console.error(`  ⚠ ${rel}: no target JSON-LD block found (add BlogPosting/FAQPage schema first)`);
    process.exit(injected > 0 ? 1 : 0);
  }
  console.log(`inject-speakable-jsonld --check: ok (${covered} page(s) covered)`);
} else {
  console.log(`✓ speakable: ${injected} injected · ${covered} covered · ${gaps.length} without target schema${gaps.length ? ' (' + gaps.join(', ') + ')' : ''}`);
}
