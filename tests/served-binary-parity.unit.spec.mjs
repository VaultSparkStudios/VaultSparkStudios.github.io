import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from '../scripts/lib/safe-spawn.mjs';
import { selectServedFiles, parseBlobInventory, compareBlobBytes, TEXT_EXT, parseArgs } from '../scripts/check-served-parity.mjs';

test('Git inventory framing and binary blob hashing preserve exact bytes',()=>{
  const bytes=Buffer.from([0,255,128,13,10]);
  for(const algorithm of ['sha1','sha256']){
    const objectId=crypto.createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    const file='assets/tab\tand\nnewline.png';
    const map=parseBlobInventory(`100644 blob ${objectId}       ${bytes.length}\t${file}\0`);
    assert.equal(map.size,1);assert.equal(compareBlobBytes(bytes,map.get(file)).state,'identical');
    assert.equal(compareBlobBytes(Buffer.from([0,255,128,13,11]),map.get(file)).state,'differ');
    assert.equal(compareBlobBytes(Buffer.concat([bytes,Buffer.from([0])]),map.get(file)).state,'differ');
  }
  for(const invalid of ['bad\0',`160000 commit ${'a'.repeat(40)}       -\tsubmodule\0`,`100644 blob ${'a'.repeat(40)} 1\tx\0`.repeat(2)])assert.throws(()=>parseBlobInventory(invalid));
});

function run(args, root) {
  const script=pathToFileURL(path.resolve('scripts/check-served-parity.mjs')).href;
  const entry=`import {main} from ${JSON.stringify(script)};main(process.argv.slice(1),{root:${JSON.stringify(root)}}).then(c=>{process.exitCode=c}).catch(e=>{console.error(e.message);process.exitCode=1});`;
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--input-type=module','-e',entry,'--',...args],{windowsHide:true,timeout:60000});
    let out='',err='';child.stdout.on('data',d=>{out+=d});child.stderr.on('data',d=>{err+=d});
    child.on('error',reject);child.on('close',code=>resolve({code,out,err}));
  });
}

test('complete inventory follows positive manifest without an extension allowlist',()=>{
  const manifest={exact:['index.html','favicon.ico','CNAME','_headers','_redirects','.nojekyll'],prefixes:['assets/','data/','api/','portfolio/'],excludedPrefixes:['data/news-desk/art/'],keptInternalPrefixes:['docs/visual-proof/']};
  const publicFiles=['index.html','favicon.ico','assets/image.png','assets/font.woff2','assets/custom.unknown','data/public.bin','portfolio/public.json','docs/visual-proof/proof.png','CNAME','.nojekyll'];
  const files=[...publicFiles,'scripts/x.js','data/news-desk/art/master.png','context/private.json','_headers','_redirects','api/build-sha.json'];
  assert.deepEqual(selectServedFiles(files,'all-served',manifest),publicFiles);
  assert.ok(!selectServedFiles(files,'text').includes('assets/font.woff2'));
  for(const invalid of [null,{}, {...manifest,exact:'index.html'}, {...manifest,prefixes:['../']}, {...manifest,prefixes:[42]}, {...manifest,prefixes:['/assets/']}, {exact:[],prefixes:[],excludedPrefixes:[],keptInternalPrefixes:[]}]) assert.throws(()=>selectServedFiles(files,'all-served',invalid));
});

test('actual CLI verifies binary corruption, missing assets, and committed inventory',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vss-served-binary-'));
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const binary=Buffer.from([0,255,128,13,10,0,42]);
  let mode='good';const hits=[];
  const server=http.createServer((req,res)=>{
    hits.push(req.url);
    if(req.url==='/')return res.end('home');
    if(req.url==='/CNAME'||req.url==='/.nojekyll')return res.end('control');
    if(mode==='missing'){res.writeHead(404);return res.end();}
    if(mode==='redirect'){res.writeHead(302,{location:'/'});return res.end();}
    res.end(mode==='corrupt'?Buffer.from([0,255,128,13,10,0,43]):binary);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const reportFile=path.join(root,'report.json');
  const args=[`--origin=http://127.0.0.1:${server.address().port}`,'--against=HEAD','--scope=all-served','--require=tree-current',`--json-out=${reportFile}`];
  try{
    git('init','--quiet');git('config','user.name','Parity fixture');git('config','user.email','parity@example.test');git('config','core.autocrlf','false');
    for(const d of ['config','assets','docs/visual-proof'])fs.mkdirSync(path.join(root,d),{recursive:true});
    fs.writeFileSync(path.join(root,'index.html'),'home');
    for(const f of ['assets/picture.png','assets/font.woff2','assets/unknown.custom','docs/visual-proof/proof.png'])fs.writeFileSync(path.join(root,f),binary);
    const manifest={exact:['index.html','CNAME','_headers','.nojekyll'],prefixes:['assets/'],excludedPrefixes:[],keptInternalPrefixes:['docs/visual-proof/']};
    fs.writeFileSync(path.join(root,'config/served-surface.json'),JSON.stringify(manifest));
    for(const f of ['CNAME','_headers','.nojekyll'])fs.writeFileSync(path.join(root,f),'control');
    git('add','.');git('commit','--quiet','-m','binary fixture');
    fs.writeFileSync(path.join(root,'config/served-surface.json'),'{broken');
    let result=await run(args,root);assert.equal(result.code,0,result.err);
    let report=JSON.parse(fs.readFileSync(reportFile));
    assert.equal(report.scope,'all-served');assert.equal(report.expected,7);assert.equal(report.identical,7);assert.equal(report.coverageComplete,true);
    assert.match(report.inventory.sha256,/^[a-f0-9]{64}$/);
    assert.equal(report.results.find(r=>r.file==='assets/picture.png').expectedBytes,binary.length);
    assert.deepEqual(hits.slice().sort(),['/','/.nojekyll','/CNAME','/assets/font.woff2','/assets/picture.png','/assets/unknown.custom','/docs/visual-proof/proof.png']);
    for(mode of ['corrupt','missing','redirect']){
      result=await run(args,root);assert.equal(result.code,1,result.err);report=JSON.parse(fs.readFileSync(reportFile));assert.notEqual(report.verdict,'tree-current');
      if(mode==='corrupt')assert.equal(report.differ,4);else assert.equal(report.unread,4);
    }
    hits.length=0;result=await run(args.filter(a=>a!=='--scope=all-served'),root);assert.equal(result.code,0,result.err);
    report=JSON.parse(fs.readFileSync(reportFile));assert.equal(report.scope,'text');assert.equal(report.expected,1);assert.deepEqual(hits,['/']);
    for(const contents of ['{broken',JSON.stringify({...manifest,prefixes:[42]})]){
      fs.writeFileSync(path.join(root,'config/served-surface.json'),contents);git('add','config/served-surface.json');git('commit','--quiet','-m','invalid manifest');
      hits.length=0;result=await run(args,root);assert.equal(result.code,1);assert.deepEqual(hits,[]);
    }
    git('rm','config/served-surface.json');git('commit','--quiet','-m','missing manifest');
    hits.length=0;result=await run(args,root);assert.equal(result.code,1);assert.deepEqual(hits,[]);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
});

test('manifest text CLI measures deployed proof JSON while preserving legacy scope', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-served-text-'));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const contents = new Map([
    ['index.html', 'home'], ['portfolio/public.json', '{"project":1}'],
    ['audits/public.json', '{"pass":true}'], ['docs/visual-proof/receipt.JSON', '{"proof":true}'],
    ['assets/site.js', '/* script */'], ['assets/font.woff2', 'binary'],
    ['data/news-desk/art/private.json', 'excluded'], ['config/private.json', 'private'],
    ['api/build-sha.json', 'stamped'], ['_headers', 'provider'], ['_redirects', ''],
  ]);
  const manifest = { exact: ['index.html', '_headers', '_redirects'], prefixes: ['assets/', 'portfolio/', 'audits/', 'api/', 'data/'], excludedPrefixes: ['data/news-desk/art/'], keptInternalPrefixes: ['docs/visual-proof/'] };
  const hits = [];
  let corrupt = '';
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    const file = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (!contents.has(file)) { res.writeHead(404); res.end(); return; }
    res.end(file === corrupt ? 'corrupt' : contents.get(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    git('init', '--quiet'); git('config', 'user.name', 'Parity fixture'); git('config', 'user.email', 'parity@example.test'); git('config', 'core.autocrlf', 'false');
    for (const [file, body] of contents) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), body);
    }
    fs.writeFileSync(path.join(root, 'config/served-surface.json'), JSON.stringify(manifest));
    git('add', '.'); git('commit', '--quiet', '-m', 'text fixture');
    const expected = ['index.html', 'portfolio/public.json', 'audits/public.json', 'docs/visual-proof/receipt.JSON', 'assets/site.js'];
    assert.deepEqual(selectServedFiles([...contents.keys()], 'served-text', manifest), expected);
    assert.equal(parseArgs(['--scope=served-text']).scope, 'served-text');
    const out = path.join(root, 'report.json');
    const args = [`--origin=http://127.0.0.1:${server.address().port}`, '--against=HEAD', '--scope=served-text', '--require=tree-current', `--json-out=${out}`];
    // A dirty local configuration must not alter the compared commit's selection.
    fs.writeFileSync(path.join(root, 'config/served-surface.json'), '{broken');
    let result = await run(args, root);
    assert.equal(result.code, 0, result.err);
    let report = JSON.parse(fs.readFileSync(out));
    assert.equal(report.scope, 'served-text'); assert.equal(report.expected, 5); assert.equal(report.identical, 5);
    assert.equal(report.inventory.source, 'config/served-surface.json');
    assert.match(report.inventory.sha256, /^[a-f0-9]{64}$/); assert.deepEqual(report.inventory.extensions, TEXT_EXT);
    assert.deepEqual(hits.slice().sort(), ['/', '/portfolio/public.json', '/audits/public.json', '/docs/visual-proof/receipt.JSON', '/assets/site.js'].sort());
    for (corrupt of ['portfolio/public.json', 'audits/public.json', 'docs/visual-proof/receipt.JSON']) {
      result = await run(args, root); assert.equal(result.code, 1, result.err);
      report = JSON.parse(fs.readFileSync(out)); assert.equal(report.differ, 1);
      assert.equal(report.results.find(row => row.state === 'differ').file, corrupt);
    }
    corrupt = ''; hits.length = 0;
    result = await run(args.filter(arg => arg !== '--scope=served-text'), root); assert.equal(result.code, 0, result.err);
    assert.deepEqual(hits.slice().sort(), ['/', '/assets/site.js'].sort());
    for (const bad of ['{broken', JSON.stringify({ ...manifest, prefixes: [42] })]) {
      fs.writeFileSync(path.join(root, 'config/served-surface.json'), bad); git('add', 'config/served-surface.json'); git('commit', '--quiet', '-m', 'invalid fixture');
      hits.length = 0; result = await run(args, root); assert.equal(result.code, 1); assert.deepEqual(hits, []);
    }
    git('rm', 'config/served-surface.json'); git('commit', '--quiet', '-m', 'missing fixture');
    hits.length = 0; result = await run(args, root); assert.equal(result.code, 1); assert.deepEqual(hits, []);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
