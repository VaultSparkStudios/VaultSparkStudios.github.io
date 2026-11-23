import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import * as proposed from '../scripts/derive-registry-surfaces.mjs';
const repo=path.resolve(import.meta.dirname,'..'),inputs=proposed.loadInputs(repo),surfaces=proposed.SURFACES.filter(s=>s.file==='press/index.html'),opts={surfaces,catalogExtras:[]};
const tempParent=path.resolve(os.tmpdir()),dir=fs.mkdtempSync(path.join(tempParent,'vs-registry-style-roundtrip-'));
after(()=>{const resolved=path.resolve(dir);if(!resolved.startsWith(tempParent+path.sep)||!path.basename(resolved).startsWith('vs-registry-style-roundtrip-'))throw Error('Refuse cleanup outside owned temporary fixture');fs.rmSync(resolved,{recursive:true,force:true});});
const canonical=fs.readFileSync(path.join(repo,'press/index.html'),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');let serial=0;
function copy(root,rel){const source=path.join(repo,rel);if(!fs.existsSync(source))return;fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(source,path.join(root,rel));}
function fixture(){const root=path.join(dir,String(++serial));fs.mkdirSync(root,{recursive:true});for(const rel of ['press/index.html','assets/style.css','data/game-registry.json','api/public-intelligence.json'])copy(root,rel);for(const id of Object.keys(inputs.registry.games))copy(root,`games/${id}/index.html`);for(const item of inputs.pi.catalog)copy(root,`projects/${item.id}/index.html`);return root;}
function extract(root){copy(root,'scripts/extract-inline-styles.mjs');copy(root,'scripts/lib/inline-style-extraction.mjs');const r=spawnSync(process.execPath,[root+'/scripts/extract-inline-styles.mjs','--targets=press/index.html'],{cwd:root,encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stdout+r.stderr);return r.stdout;}
function check(root,options=opts){return proposed.runCheck(root,inputs,options);}
test('actual raw owner WRITE then unmodified normal postbuild extractor then strict CHECK roundtrips current Press byteexact',()=>{
 const root=fixture();proposed.applyAll(root,inputs,{surfaces});const raw=fs.readFileSync(root+'/press/index.html','utf8');assert.match(proposed.readBlock(raw,'press-catalog'),/style="/);assert.equal(check(root).ok,true);
 const log=extract(root);const after=fs.readFileSync(root+'/press/index.html','utf8');assert.equal(after,canonical);assert.equal(check(root).ok,true);for(const b of surfaces[0].blocks)assert.equal(proposed.readBlock(after,b.name),proposed.readBlock(canonical,b.name));
});

test('strict comparison rejects actual catalog fact, link, style-class or raw declaration edits instead of normalizing actual HTML',()=>{
 for(const [from,to]of [['🔥 Sparked — Live Now (3)','🔥 Sparked — Live Now (99)'],['href="https://veilos.io"','href="https://example.invalid"'],['game-press-thumb vsx-5469cd65aa','game-press-thumb vsx-0000000000']]){
  const root=fixture(),file=root+'/press/index.html',text=fs.readFileSync(file,'utf8');assert.ok(text.includes(from));fs.writeFileSync(file,text.replace(from,to));assert.equal(check(root).ok,false);
 }
 const root=fixture();proposed.applyAll(root,inputs,{surfaces});const file=root+'/press/index.html',text=fs.readFileSync(file,'utf8');assert.ok(text.includes('style="padding:1.25rem;"'));fs.writeFileSync(file,text.replace('style="padding:1.25rem;"','style="padding:1.37rem;"'));assert.equal(check(root).ok,false);
});

test('missing or tampered expected shared/page declarations fail even when the normalized HTML classes still match',()=>{
 const rule='.vsx-1e7e77ec1e{padding:1.25rem;}';
 for(const rel of ['assets/style.css','press/index.html'])for(const replacement of ['',rule.replace('1.25rem','1.37rem')]){
  const root=fixture(),file=root+'/'+rel,text=fs.readFileSync(file,'utf8');assert.ok(text.includes(rule));fs.writeFileSync(file,text.replace(rule,replacement));const r=check(root);assert.equal(r.ok,false);assert.ok(r.problems.some(p=>p.includes('extracted style: vsx-1e7e77ec1e')));
 }
});

test('future owner style changes retain raw WRITE declarations so the normal postbuild registers new exact CSS classes',()=>{
 const changed=[{...surfaces[0],blocks:surfaces[0].blocks.map(b=>b.name==='press-catalog'?{...b,render:m=>b.render(m).replaceAll('padding:1.25rem;','padding:1.37rem;')}:b)}],root=fixture(),options={surfaces:changed,catalogExtras:[]};
 proposed.applyAll(root,inputs,{surfaces:changed});assert.equal(check(root,options).ok,true);assert.match(fs.readFileSync(root+'/press/index.html','utf8'),/style="padding:1\.37rem;"/);extract(root);assert.equal(check(root,options).ok,true);assert.equal(check(root).ok,false);assert.ok(fs.readFileSync(root+'/assets/style.css','utf8').includes('{padding:1.37rem;}'));
});
