import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {extractFirstParagraph,walk} from '../scripts/backfill-meta-descriptions.mjs';
test('empty and short paragraphs return no prose instead of crashing',()=>{
  for(const html of ['<p></p>','<p>Short text.</p>','<p><span></span></p>','<picture>Not a paragraph</picture>'])assert.equal(extractFirstParagraph(html),null);
});
test('first meaningful paragraph is selected without joining later paragraphs',()=>{
  const first='The first meaningful paragraph explains this public page clearly.';
  assert.equal(extractFirstParagraph(`<p></p><p>Short.</p><p>${first}</p><p>A later paragraph must not leak into the metadata description.</p>`),first);
});
test('header prose is skipped and paragraph markup is stripped',()=>{
  const first='This meaningful public body copy uses clear and readable text.';
  assert.equal(extractFirstParagraph(`<header><p>Header prose should never become the public page description.</p></header><p>This meaningful <strong>public body copy</strong> uses clear and readable text.</p>`),first);
});
test('internal HTML fixtures and caches are outside the public backfill walk',()=>{
  const base=path.resolve(os.tmpdir()),root=fs.mkdtempSync(path.join(base,'vs-meta-s400-'));
  try{for(const dir of ['.cache','docs','tests','context','lighthouse-results','games/demo']){fs.mkdirSync(path.join(root,dir),{recursive:true});fs.writeFileSync(path.join(root,dir,'index.html'),'<p></p>');}fs.writeFileSync(path.join(root,'index.html'),'<title>Public home</title>');
    assert.deepEqual(walk(root).map(x=>x.rel).sort(),['games/demo/index.html','index.html']);
  }finally{assert.ok(path.resolve(root).startsWith(base+path.sep));fs.rmSync(root,{recursive:true,force:true});}
});
