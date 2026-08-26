#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'performance', 'style-usage.json');
const SELF_TEST = process.argv.includes('--self-test');
const CHECK = process.argv.includes('--check');

const walk = (dir, ext, out = []) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.cache', 'docs'].includes(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(abs, ext, out);
    else if (ext.some((x) => ent.name.endsWith(x))) out.push(abs);
  }
  return out;
};
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');

export function analyze(cssText, corpus) {
  const selectors = [...cssText.matchAll(/(?:^|\})([^@{}][^{}]*)\{/gm)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const tokens = new Set();
  for (const selector of selectors) {
    for (const m of selector.matchAll(/[.#]([a-zA-Z_][\w-]*)/g)) tokens.add(m[1]);
  }
  const used = [...tokens].filter((token) => corpus.includes(token));
  const unusedCandidates = [...tokens].filter((token) => !corpus.includes(token));
  return { selectorCount: selectors.length, tokenCount: tokens.size, usedCount: used.length, unusedCandidateCount: unusedCandidates.length, unusedCandidates };
}

function build() {
  const cssPath = path.join(ROOT, 'assets', 'style.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  const sources = walk(ROOT, ['.html', '.js', '.mjs', '.cjs']);
  const corpus = sources.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
  const inventory = analyze(css, corpus);
  return {
    schemaVersion: 1,
    generatedBy: 'scripts/analyze-style-usage.mjs',
    methodology: 'Conservative class/id token inventory. Candidates are evidence for review, never auto-deleted.',
    source: { path: 'assets/style.css', bytes: Buffer.byteLength(css), sha256: sha(css) },
    corpusFiles: sources.length,
    ...inventory,
  };
}

if (SELF_TEST) {
  const got = analyze('.used,.gone:hover{color:red}#present{display:block}', '<div class="used" id="present">');
  if (got.usedCount !== 2 || !got.unusedCandidates.includes('gone')) process.exit(1);
  console.log('analyze-style-usage --self-test: all passed');
} else {
  const next = build();
  if (CHECK) {
    const prior = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    if (prior.source.sha256 !== next.source.sha256 || prior.corpusFiles !== next.corpusFiles) {
      console.error('analyze-style-usage --check: inventory stale; run without --check');
      process.exit(1);
    }
    console.log('analyze-style-usage --check: ok');
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(next, null, 2) + '\n');
    console.log('analyze-style-usage: wrote conservative inventory (' + next.source.bytes + ' bytes, ' + next.unusedCandidateCount + ' review candidates)');
  }
}
