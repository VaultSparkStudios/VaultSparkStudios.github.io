import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from '../scripts/lib/safe-spawn.mjs';
const ROOT=process.cwd();
const proposed=fs.readFileSync(new URL('../scripts/generate-pathways.mjs',import.meta.url));
const data=JSON.parse(fs.readFileSync(path.join(ROOT,'data/pathways.json')));
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/shell-manifest.json')));
const files=['data/pathways.json','assets/shell-manifest.json','devlog/index.html','pathways/index.html',...data.pathways.map(p=>`pathways/${p.slug}/index.html`),...['themeToggle','navToggle'].map(k=>manifest.assets[k].path)];
const tempBase=path.join(ROOT,'.cache/pathways-footer-tests');
fs.mkdirSync(tempBase,{recursive:true});
const tmp=fs.mkdtempSync(path.join(tempBase,'run-'));
function fixture(name,source=proposed){const root=path.join(tmp,name);for(const f of files){const to=path.join(root,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(ROOT,f),to);}fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.writeFileSync(path.join(root,'scripts/generate-pathways.mjs'),source);return root;}
const run=(root,flag)=>spawnSync(process.execPath,[path.join(root,'scripts/generate-pathways.mjs'),flag],{encoding:'utf8',windowsHide:true});
const pages=root=>data.pathways.map(p=>fs.readFileSync(path.join(root,`pathways/${p.slug}/index.html`),'utf8'));
test('generator agrees with actual postbuild outputs and remains idempotent',()=>{
 const root=fixture('current');const before=pages(root);
 assert.equal(run(root,'--check').status,0);assert.equal(run(root,'--apply').status,0);assert.deepEqual(pages(root),before);assert.equal(run(root,'--check').status,0);
});
test('Devlog-only extracted footer variation cannot rewrite pathway shared footer',()=>{
 const root=fixture('devlog');const f=path.join(root,'devlog/index.html');const s=fs.readFileSync(f,'utf8');assert.ok(s.includes('footer-dispatch-bot vsx-'));
 fs.writeFileSync(f,s.replace(/footer-dispatch-bot vsx-[a-f0-9]+/,'footer-dispatch-bot vsx-deadbeef00'));
 assert.equal(run(root,'--check').status,0);
});
test('real canonical hub footer change fails check, propagates to every page, then stabilizes',()=>{
 const root=fixture('new-footer');const f=path.join(root,'pathways/index.html');const s=fs.readFileSync(f,'utf8');assert.ok(s.includes('Join the dispatch'));
 fs.writeFileSync(f,s.replace('Join the dispatch','Dispatch fixture label'));
 assert.equal(run(root,'--check').status,1);assert.equal(run(root,'--apply').status,0);
 for(const html of pages(root))assert.ok(html.includes('Dispatch fixture label'));
 assert.equal(run(root,'--check').status,0);
});
test('missing hub footer refuses before any generated page changes',()=>{
 const root=fixture('invalid');const before=pages(root);fs.writeFileSync(path.join(root,'pathways/index.html'),'<main>no footer</main>');
 const result=run(root,'--apply');assert.equal(result.status,1);assert.match(result.stderr,/hub footer harvest failed/);assert.deepEqual(pages(root),before);
});
