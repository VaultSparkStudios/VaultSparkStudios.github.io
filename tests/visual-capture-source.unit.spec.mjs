import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { createHash } from 'node:crypto';
import { extractCaptureArchive } from '../scripts/lib/visual-capture-archive.mjs';
import { captureSource, baselineRunIssues, captureReceiptIssues, CANDIDATE_ORIGIN } from '../scripts/lib/visual-capture-source.mjs';
const sha = 'a'.repeat(40);
test('generation binds only the exact candidate origin and remains provisional', () => {
  const receipt = captureSource({ update: 'true', sha });
  assert.equal(receipt.origin, CANDIDATE_ORIGIN);
  assert.equal(receipt.sourceCommit, sha);
  assert.equal(receipt.reviewed, false);
  assert.equal(receipt.mode, 'provisional-generation');
  for (const origin of ['https://vaultsparkstudios.com', 'http://localhost:4173', 'http://127.0.0.1:4174']) {
    assert.throws(() => captureSource({ origin, update: 'true', sha }), /candidate preview/);
  }
});
test('external comparisons stay explicit and unsafe URL decoration is rejected', () => {
  assert.equal(captureSource({ origin: 'https://vaultsparkstudios.com', sha }).mode, 'comparison');
  for (const origin of ['file:///tmp/site', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?q=1', 'https://example.test/#x']) {
    assert.throws(() => captureSource({ origin, sha }));
  }
  assert.throws(() => captureSource({ sha: 'HEAD' }));
  assert.throws(() => captureSource({ sha, update: 'yes' }));
});
test('failed, pending, foreign-SHA and non-dispatched baseline runs cannot be imported', () => {
  const good = { status:'completed', conclusion:'success', headSha:sha, event:'workflow_dispatch',path:'.github/workflows/visual-regression.yml',repository:{full_name:'VaultSparkStudios/VaultSparkStudios.github.io'} };
  assert.deepEqual(baselineRunIssues(good, sha), []);
  for (const bad of [{conclusion:'failure'},{status:'in_progress'},{headSha:'b'.repeat(40)},{event:'push'},{path:'.github/workflows/other.yml'},{repository:{full_name:'other/repository'}}]) {
    assert.ok(baselineRunIssues({...good,...bad},sha).length);
  }
  assert.ok(baselineRunIssues(good, '').length);
});
test('actual workflow admits source before installs and archives provisional source identity', () => {
  const workflow = fs.readFileSync('.github/workflows/visual-regression.yml','utf8');
  assert.ok(workflow.indexOf('node scripts/admit-visual-capture.mjs') < workflow.indexOf('npm install'));
  assert.match(workflow, /default: 'http:\/\/127\.0\.0\.1:4173'/);
  assert.match(workflow, /CAPTURE_SHA: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /\.cache\/visual-capture-source.json/);
  assert.match(workflow, /include-hidden-files: true/);
});
test('successful runs cannot substitute production, stale or absent artifact provenance', () => {
  const good=captureSource({sha,update:'true'});
  assert.deepEqual(captureReceiptIssues(good,sha),[]);
  for(const bad of [null,{}, {...good,origin:'https://vaultsparkstudios.com'}, {...good,sourceCommit:'b'.repeat(40)}, {...good,mode:'comparison'}, {...good,reviewed:true}]) {
    assert.ok(captureReceiptIssues(bad,sha).length);
  }
});
test('real capture CLI rejects external generation before writes and binds valid candidate receipt', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vs-capture-source-'));
  try {
    fs.mkdirSync(path.join(temp,'scripts/lib'),{recursive:true});
    for(const file of ['scripts/admit-visual-capture.mjs','scripts/lib/visual-capture-source.mjs'])fs.copyFileSync(file,path.join(temp,file));
    const run=(args=[],env={})=>spawnSync(process.execPath,[path.join(temp,'scripts/admit-visual-capture.mjs'),...args],{
      cwd:temp,encoding:'utf8',windowsHide:true,env:{...process.env,CAPTURE_SHA:sha,CAPTURE_UPDATE:'true',CAPTURE_ORIGIN:CANDIDATE_ORIGIN,...env},timeout:15000,
    });
    const receipt=path.join(temp,'.cache/visual-capture-source.json');
    assert.equal(run([],{CAPTURE_ORIGIN:'https://vaultsparkstudios.com'}).status,1);
    assert.equal(fs.existsSync(receipt),false);
    assert.equal(run(['--unknown']).status,1);
    assert.equal(fs.existsSync(receipt),false);
    assert.equal(run(['--help']).status,0);
    assert.equal(fs.existsSync(receipt),false);
    const result=run();assert.equal(result.status,0,result.stderr);
    assert.deepEqual(captureReceiptIssues(JSON.parse(fs.readFileSync(receipt,'utf8')),sha),[]);
    const before=fs.readFileSync(receipt);
    assert.equal(run([],{CAPTURE_SHA:'HEAD'}).status,1);
    assert.deepEqual(fs.readFileSync(receipt),before);
  } finally { fs.rmSync(temp,{recursive:true,force:true,maxRetries:3,retryDelay:50}); }
});
test('exact archive bytes are verified before safe PNG/provenance-only extraction', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'vs-capture-archive-'));
  const python=process.platform==='win32'?'python':'python3';
  const make=(name,extra='pass')=>{
    const archive=path.join(temp,name+'.zip');
    const code="import zipfile,sys; z=zipfile.ZipFile(sys.argv[1],'w'); z.writestr('.cache/visual-capture-source.json','{}'); z.writestr('tests/__snapshots__/visual-regression.spec.js-snapshots/games-dark-chromium-linux.png',bytes([137,80,78,71,13,10,26,10])); "+extra+"; z.close()";
    const r=spawnSync(python,['-c',code,archive],{encoding:'utf8',windowsHide:true,timeout:15000});assert.equal(r.status,0,r.stderr);
    const bytes=fs.readFileSync(archive);return{bytes,artifact:{size_in_bytes:bytes.length,digest:'sha256:'+createHash('sha256').update(bytes).digest('hex')}};
  };
  try {
    const valid=make('valid');const target=path.join(temp,'valid-output');
    extractCaptureArchive(valid.bytes,valid.artifact,target);
    assert.equal(fs.readFileSync(path.join(target,'.cache/visual-capture-source.json'),'utf8'),'{}');
    const wrong=path.join(temp,'wrong-digest');assert.throws(()=>extractCaptureArchive(valid.bytes,{...valid.artifact,digest:'sha256:'+'0'.repeat(64)},wrong),/SHA-256/);
    assert.equal(fs.existsSync(wrong),false);
    for(const [name,member] of [['escape','../escaped.png'],['unexpected','scripts/run.py'],['duplicate','.cache/visual-capture-source.json']]){
      const a=make(name,`z.writestr('${member}','bad')`);const out=path.join(temp,name+'-output');
      assert.throws(()=>extractCaptureArchive(a.bytes,a.artifact,out),/extraction refused/);
      assert.equal(fs.existsSync(path.join(out,'.cache/visual-capture-source.json')),false,'all entries validated before extracting any');
    }
    assert.equal(fs.existsSync(path.join(temp,'escaped.png')),false);
  } finally { fs.rmSync(temp,{recursive:true,force:true,maxRetries:3,retryDelay:50}); }
});
