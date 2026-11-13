import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { createHash } from 'node:crypto';
import { extractCaptureArchive } from '../scripts/lib/visual-capture-archive.mjs';
import { captureSource, baselineRunIssues, captureReceiptIssues, CANDIDATE_ORIGIN } from '../scripts/lib/visual-capture-source.mjs';
import { VISUAL_SCENES, visualSceneState } from '../scripts/lib/visual-scene-contract.mjs';
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

// Scene semantics complement artifact provenance. A stable screenshot alone
// cannot decide whether a redirected fragment or document top was intended.
const topObservation = pathname => ({ pathname, hash: '', scrollX: 0, scrollY: 0, maxScrollY: 10000, target: null });
const fragmentObservation = (surface, documentTop, scrollMarginTop, scrollY, maxScrollY = 30000) => ({
  pathname: VISUAL_SCENES[surface].pathname, hash: VISUAL_SCENES[surface].hash,
  scrollX: 0, scrollY, maxScrollY,
  target: { present: true, visible: true, documentTop, scrollMarginTop },
});

test('ordinary visual surfaces require document top and their exact resolved route', () => {
  for (const surface of ['home', 'membership', 'vault-member', 'games', 'tombstones']) {
    const observed = topObservation(VISUAL_SCENES[surface].pathname);
    assert.equal(visualSceneState(surface, observed).sceneReady, true, surface);
    assert.equal(visualSceneState(surface, { ...observed, scrollY: 1 }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, scrollY: 33 }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, scrollX: 2 }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, pathname: '/foreign/' }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, hash: '#main-content' }).sceneReady, false);
  }
});

test('legacy Oracle and Journal scenes match actual redirects and named targets', () => {
  const redirects = fs.readFileSync('_redirects', 'utf8');
  for (const [surface, alias, destination] of [['oracle','/oracle/','/ignis/#oracle'],['journal','/journal/','/changelog/#stories']]) {
    const line = redirects.split(/\r?\n/).find(line => line.trim().split(/\s+/)[0] === alias);
    assert.equal(line.trim().split(/\s+/)[1], destination);
    const scene = VISUAL_SCENES[surface];
    assert.equal(scene.kind, 'named-fragment');
    assert.equal(scene.pathname + scene.hash, destination);
    assert.equal(scene.anchorId, scene.hash.slice(1));
    const observed = fragmentObservation(surface, 5000, 94, 4906);
    assert.equal(visualSceneState(surface, observed).sceneReady, true);
    assert.equal(visualSceneState(surface, { ...observed, pathname: alias }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, hash: '' }).sceneReady, false);
    assert.equal(visualSceneState(surface, { ...observed, hash: '#foreign' }).sceneReady, false);
  }
});

test('Oracle geometry rejects the accidental33px offset despite a stable viewport', () => {
  // Retained Linux diagnostic: target documentTop5041.125, CSS margin94.
  const aligned = fragmentObservation('oracle', 5041.125, 94, 4947);
  assert.equal(visualSceneState('oracle', aligned).sceneReady, true);
  const displaced = visualSceneState('oracle', { ...aligned, scrollY: 4914 });
  assert.equal(displaced.pathMatches, true);
  assert.equal(displaced.hashMatches, true);
  assert.equal(displaced.targetPresent, true);
  assert.equal(displaced.scrollMatches, false);
  assert.equal(displaced.sceneReady, false);
});

test('fragment geometry follows current CSS margin and document height, with bounded rounding', () => {
  for (const surface of ['oracle', 'journal']) {
    for (const margin of [94, 131, 142.5]) {
      const observed = fragmentObservation(surface, 4000.25, margin, 4000.25 - margin);
      assert.equal(visualSceneState(surface, observed).sceneReady, true);
      assert.equal(visualSceneState(surface, { ...observed, scrollY: observed.scrollY + 1 }).sceneReady, true);
      assert.equal(visualSceneState(surface, { ...observed, scrollY: observed.scrollY + 1.2 }).sceneReady, false);
    }
    assert.equal(visualSceneState(surface, fragmentObservation(surface, 500, 94, 300, 300)).sceneReady, true);
    assert.equal(visualSceneState(surface, fragmentObservation(surface, 50, 94, 0)).sceneReady, true);
  }
});

test('absent, hidden or invalid fragment geometry cannot produce passing scene flags', () => {
  const good = fragmentObservation('oracle', 5000, 94, 4906);
  for (const patch of [{ target: null }, { target: { ...good.target, present: false } },
    { target: { ...good.target, visible: false } }, { target: { ...good.target, documentTop: NaN } },
    { target: { ...good.target, scrollMarginTop: NaN } }, { maxScrollY: -1 }, { scrollY: Infinity }]) {
    assert.equal(visualSceneState('oracle', { ...good, ...patch }).sceneReady, false);
  }
  for (const [surface, observed] of [['unknown', good], ['oracle', null], ['oracle', {}]]) {
    const flags = visualSceneState(surface, observed);
    assert.equal(flags.sceneReady, false);
    assert.ok(Object.values(flags).every(value => typeof value === 'boolean'));
    assert.equal(Object.keys(flags).length, 7);
  }
});


function actualFailureProbeFunction(name, context = {}) {
  const source = fs.readFileSync('tests/visual-regression.spec.js', 'utf8');
  const start = source.indexOf((name.startsWith('native') || name.startsWith('capture') || name.startsWith('games') || name === 'waitForVisualReadiness' ? 'async ' : '') + 'function ' + name + '(');
  assert.ok(start >= 0);
  const end = source.indexOf('\n}\n', start); assert.ok(end > start);
  return new Function(...Object.keys(context), 'return (' + source.slice(start, end + 2) + ');')(...Object.values(context));
}

test('failure probe actual callback preserves ordinary/pass/rejection timeline and original error', async () => {
  const run = actualFailureProbeFunction('nativeWithFailureProbe'), error = new Error('native'), timeline = [];
  const reject = async () => { timeline.push('native-reject'); throw error; };
  const probe = async () => { timeline.push('probe'); throw Error('observer'); };
  assert.equal(await run(async () => 7, true, probe), 7); assert.deepEqual(timeline, []);
  await assert.rejects(run(reject, false, probe), e => e === error); assert.deepEqual(timeline, ['native-reject']);
  timeline.length = 0;
  await assert.rejects(run(reject, true, probe), e => e === error); assert.deepEqual(timeline, ['native-reject','probe']);
});

test('failure probe actual admission refuses flag overlap, generation and external origin', () => {
  const loopback = url => { const u = new URL(url); return ['http:','https:'].includes(u.protocol) && ['localhost','127.0.0.1','[::1]'].includes(u.hostname) && !u.username && !u.password; };
  const admit = actualFailureProbeFunction('admitSceneDiagnostics', { diagnosticLoopback: loopback });
  admit('', '', 'all', 'https://example.test');
  admit('false', 'true', 'none', 'http://127.0.0.1:4173/games/');
  for (const args of [['true','true','none','http://127.0.0.1'],['false','true','all','http://127.0.0.1'],['true','false','missing','http://127.0.0.1'],['','true','none','https://example.test'],['yes','','none','http://127.0.0.1']]) assert.throws(() => admit(...args));
});

test('actual failure collector takes paired samples before and after geometry, no writes', async () => {
  const events = [], meta = { sha256:'a'.repeat(64), bytes:33, width:1, height:1 };
  const collect = actualFailureProbeFunction('captureFailureProbe', { Date,
    diagnosticLoopback: () => true, emitSceneDiagnostic: (_i,p) => events.push(p),
    path, ownedFailurePng: () => meta, failurePngMetadata: () => meta,
    captureSceneDiagnostic: async () => events.push('geometry') });
  await collect({ url: () => 'http://127.0.0.1', screenshot: async options => {
    assert.equal(options.scale,'css'); assert.equal(options.fullPage,false);
    assert.equal(options.animations,'disabled'); assert.equal(options.caret,'hide');
    assert.ok(options.timeout > 0 && options.timeout <= 700); events.push('screenshot'); return Buffer.alloc(33);
  } }, { timeout:30000, outputDir:'/owned', attachments:[] }, {}, 'games-pixel-5-dark.png', Date.now());
  assert.deepEqual(events.filter(e => e === 'screenshot' || e === 'geometry'), ['screenshot','screenshot','geometry','screenshot','screenshot']);
  const source = fs.readFileSync('tests/visual-regression.spec.js','utf8');
  const block = source.split('// failure-probe:start')[1].split('// failure-probe:end')[0];
  assert.doesNotMatch(block, /writeFile|snapshotPath|setTimeout\(.*(?:5000|10000)/);
  assert.match(block, /primary-native-failed-frame/); assert.match(block, /later-state-not-failed-frame-proof/);
});

test('actual workflow retains full matrix with default-off exclusive failure observation and no generation', () => {
  const workflow = fs.readFileSync('.github/workflows/visual-regression.yml','utf8');
  assert.match(workflow, /failure_scene_diagnostics:[\s\S]*?type: boolean\s+default: false/);
  assert.ok(workflow.indexOf('Admit diagnostic scope') < workflow.indexOf('npm install'));
  assert.match(workflow, /b==="true" && f==="true"/);
  assert.match(workflow, /u!=="false"/);
  const visualStep = workflow.split('- name: Run visual-regression snapshots')[1].split('- name: Stop candidate preview')[0];
  assert.match(visualStep, /npx playwright test tests\/visual-regression\.spec\.js --project=chromium --reporter=line/);
  assert.doesNotMatch(visualStep, /--grep(?:\s|=)/);
  assert.match(workflow, /--update-snapshots=none/);
  assert.match(workflow, /VS_FAILURE_SCENE_DIAGNOSTICS:/);
  assert.doesNotMatch(workflow, /--retries|--timeout|maxDiff/);
});


test('actual PNG metadata rejects corrupt or unbounded headers without decoding content', () => {
  const png = actualFailureProbeFunction('failurePngMetadata', { Buffer,
    diagnosticBinary: bytes => ({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}) });
  const valid = Buffer.alloc(33); Buffer.from([137,80,78,71,13,10,26,10]).copy(valid);
  valid.writeUInt32BE(13,8); valid.write('IHDR',12); valid.writeUInt32BE(393,16); valid.writeUInt32BE(727,20);
  assert.deepEqual(png(valid), {bytes:33,width:393,height:727,sha256:createHash('sha256').update(valid).digest('hex')});
  for (const bytes of [Buffer.alloc(33),valid.subarray(0,24),Buffer.alloc(4194305)]) assert.throws(() => png(bytes));
  const bad = Buffer.from(valid); bad.writeUInt32BE(0,16); assert.throws(() => png(bad));
});

test('missing runner clock retains safe native metadata but skips all browser observation', async () => {
  const events = [];
  const collect = actualFailureProbeFunction('captureFailureProbe', { Date, path,
    diagnosticLoopback: () => true, emitSceneDiagnostic: (_i,p,d) => events.push({p,...d}),
    ownedFailurePng: () => ({bytes:33,width:1,height:1,sha256:'a'.repeat(64)}),
    captureSceneDiagnostic: async () => { throw Error('must not observe'); },
    failurePngMetadata: () => { throw Error('must not capture'); } });
  await collect({url: () => 'http://127.0.0.1', screenshot: async () => {throw Error('must not screenshot');}},
    {timeout:30000,outputDir:'/owned',attachments:[]}, {}, 'games-pixel-5-dark.png', undefined);
  assert.equal(events[0].p,'native-attachment-actual');
  assert.equal(events[0].evidence,'primary-native-failed-frame');
  assert.equal(events.at(-1).reason,'runner-clock-unavailable-or-invalid');
  assert.equal(events.some(e => e.p.includes('before-collector') || e.p.includes('after-collector')),false);
});

test('actual workflow admission executable rejects external, overlapping and generation diagnostics', () => {
  const workflow = fs.readFileSync('.github/workflows/visual-regression.yml','utf8');
  const body = workflow.match(/node --input-type=module -e '([\s\S]*?)'\n/)[1];
  const admit = env => new Function('process','URL',body)({env},URL);
  const normal = {DIAG_BEFORE:'false',DIAG_FAILURE:'false',DIAG_UPDATE:'false',DIAG_ORIGIN:'http://127.0.0.1:4173'};
  admit(normal); admit({...normal,DIAG_FAILURE:'true'});
  for (const bad of [{DIAG_FAILURE:'true',DIAG_BEFORE:'true'}, {DIAG_FAILURE:'true',DIAG_UPDATE:'true'},
    {DIAG_FAILURE:'true',DIAG_ORIGIN:'https://vaultsparkstudios.com'}, {DIAG_BEFORE:'true',DIAG_ORIGIN:'http://user:pass@127.0.0.1'},
    {DIAG_FAILURE:'yes'}, {DIAG_BEFORE:'true',DIAG_UPDATE:'true'}]) assert.throws(() => admit({...normal,...bad}));
});


// These filesystem witnesses exercise the actual descriptor/path reader. PNGs
// are header fixtures only: no decoder/pixel-validity claim is made.
function withOwnedFailureOutput(run) {
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vs-failure-owned-')));
  const identity = fs.lstatSync(temp);
  assert.equal(identity.isSymbolicLink(), false);
  try { return run(temp); }
  finally {
    const resolved = path.resolve(temp), current = fs.lstatSync(resolved);
    assert.equal(resolved, temp);
    assert.equal(fs.realpathSync(resolved), temp);
    assert.equal(current.isDirectory(), true); assert.equal(current.isSymbolicLink(), false);
    assert.equal(current.dev, identity.dev); assert.equal(current.ino, identity.ino);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.match(path.basename(resolved), /^vs-failure-owned-[A-Za-z0-9]+$/);
    // The exact absolute directory created above is checked before recursive
    // removal. Never enumerate and interpolate deletion into another shell.
    fs.rmSync(resolved, {recursive:true,force:true,maxRetries:3,retryDelay:50});
  }
}

function headerOnlyFailurePng() {
  const bytes = Buffer.alloc(33); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13,8); bytes.write('IHDR',12); bytes.writeUInt32BE(393,16); bytes.writeUInt32BE(727,20);
  return bytes;
}

function actualOwnedFailureReader(filesystem = fs) {
  const png = actualFailureProbeFunction('failurePngMetadata', { Buffer,
    diagnosticBinary: bytes => ({bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}) });
  return actualFailureProbeFunction('ownedFailurePng', {fs:filesystem,path,Buffer,failurePngMetadata:png});
}

test('actual owned PNG reader handles valid/outside/hardlink/oversize and linked ancestors', t => {
  withOwnedFailureOutput(temp => {
    const output = path.join(temp,'output'); fs.mkdirSync(output);
    const bytes = headerOnlyFailurePng(), valid = path.join(output,'valid.png'); fs.writeFileSync(valid,bytes);
    const read = actualOwnedFailureReader();
    assert.equal(read(output,valid).sha256,createHash('sha256').update(bytes).digest('hex'));
    const outside = path.join(temp,'outside.png'); fs.writeFileSync(outside,bytes);
    assert.throws(() => read(output,outside),/Owned output/);
    const hard = path.join(output,'hard.png'); fs.linkSync(valid,hard);
    assert.throws(() => read(output,hard),/Output file bound/); fs.unlinkSync(hard);
    const huge = path.join(output,'huge.png'); fs.writeFileSync(huge,Buffer.alloc(4194305));
    assert.throws(() => read(output,huge),/Output file bound/);
    const target = path.join(temp,'target'); fs.mkdirSync(target); fs.writeFileSync(path.join(target,'valid.png'),bytes);
    const linked = path.join(output,'linked-dir');
    let linkAvailable = false;
    try { fs.symlinkSync(target,linked,process.platform === 'win32' ? 'junction' : 'dir'); linkAvailable = true; }
    catch (error) {
      if (!['EPERM','EACCES','ENOSYS','ENOTSUP'].includes(error.code)) throw error;
      t.diagnostic('Native directory-link creation unavailable; explicit simulated lstat symbolic-link branch follows.');
    }
    if (linkAvailable) {
      assert.throws(() => read(output,path.join(linked,'valid.png')),/Linked output/);
      t.diagnostic('Native directory symlink/junction branch verified.');
    } else {
      let simulatedBranch = false;
      const fakeFs = new Proxy(fs,{get(target,key) {
        if (key === 'lstatSync') return candidate => {
          if (candidate === linked) { simulatedBranch = true; return {isSymbolicLink:()=>true}; }
          return target.lstatSync(candidate);
        };
        return target[key];
      }});
      assert.throws(() => actualOwnedFailureReader(fakeFs)(output,path.join(linked,'valid.png')),/Linked output/);
      assert.equal(simulatedBranch,true);
    }
  });
});

test('actual failure metadata uses owned legacy expected copy and never outside baseline attachment', async () => {
  // The actual collector is awaited before cleanup; withOwnedFailureOutput is
  // synchronous, so create/validate/cleanup explicitly for this async witness.
  const temp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'vs-failure-owned-'))), initial = fs.lstatSync(temp);
  try {
    const output = path.join(temp,'output'); fs.mkdirSync(output);
    const name = 'games-pixel-5-dark.png', bytes = headerOnlyFailurePng(), expectedCopy = path.join(output,'games-pixel-5-dark-expected.png');
    for (const role of ['actual','expected','diff']) fs.writeFileSync(path.join(output,'games-pixel-5-dark-'+role+'.png'),bytes);
    const outside = path.join(temp,'baseline-sentinel.png'); fs.writeFileSync(outside,Buffer.from('NEVER READ THIS BASELINE'));
    const reads = [], events = [], read = actualOwnedFailureReader();
    const collect = actualFailureProbeFunction('captureFailureProbe',{ Date,path,
      diagnosticLoopback:()=>true,emitSceneDiagnostic:(_i,p,d)=>events.push({p,...d}),
      ownedFailurePng:(dir,candidate)=>{reads.push(candidate);return read(dir,candidate);},
      failurePngMetadata:()=>({bytes:33,width:393,height:727,sha256:'b'.repeat(64)}),
      captureSceneDiagnostic:async()=>{} });
    await collect({url:()=> 'http://127.0.0.1',screenshot:async()=>bytes},
      {timeout:30000,outputDir:output,attachments:[{name:'games-pixel-5-dark-expected.png',contentType:'image/png',path:outside}]}, {},name,Date.now());
    assert.equal(reads.includes(outside),false); assert.ok(reads.includes(expectedCopy));
    const observed = events.find(e=>e.p==='native-attachment-expected');
    assert.equal(observed.available,true); assert.equal(observed.sha256,createHash('sha256').update(bytes).digest('hex'));
  } finally {
    const resolved = path.resolve(temp), current = fs.lstatSync(resolved);
    assert.equal(resolved,temp); assert.equal(fs.realpathSync(resolved),temp);
    assert.equal(current.isDirectory(),true);assert.equal(current.isSymbolicLink(),false);
    assert.equal(current.dev,initial.dev);assert.equal(current.ino,initial.ino);
    assert.equal(path.dirname(resolved),fs.realpathSync(os.tmpdir()));assert.match(path.basename(resolved),/^vs-failure-owned-[A-Za-z0-9]+$/);
    fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:50});
  }
});

test('actual failure probe stops every later screenshot/geometry phase after clock expiry', async () => {
  let now = 1000, screenshots = 0, geometry = 0;
  const collect = actualFailureProbeFunction('captureFailureProbe',{Date:{now:()=>now},path,
    diagnosticLoopback:()=>true,emitSceneDiagnostic:()=>{},ownedFailurePng:()=>({}),failurePngMetadata:()=>({}),
    captureSceneDiagnostic:async()=>{geometry++;} });
  await collect({url:()=> 'http://127.0.0.1',screenshot:async()=>{screenshots++;now=7000;return Buffer.alloc(33);}},
    {timeout:30000,outputDir:'/owned',attachments:[]},{},'games-pixel-5-dark.png',1000);
  assert.equal(screenshots,1);assert.equal(geometry,0);
});

test('actual scene collector checks deadline after evaluate before any CDP dispatch', async () => {
  let now = 1000, cdpDispatches = 0, emitted = 0;
  const collect = actualFailureProbeFunction('captureSceneDiagnostic',{Date:{now:()=>now},
    diagnosticLoopback:()=>true,emitSceneDiagnostic:()=>{emitted++;},
    createRequire:()=>()=>({version:'offline-fake'}),process:{cwd:()=>'/offline',version:'offline-fake'},
    os:{platform:()=> 'offline',arch:()=> 'offline',cpus:()=>[]} });
  const page={url:()=> 'http://127.0.0.1',evaluate:async()=>{now=1200;return {};},
    context:()=>({newCDPSession:async()=>{cdpDispatches++;throw Error('must not dispatch');},browser:()=>({version:()=> 'offline-fake'})})};
  await collect(page,{},'offline-after-failure',1100);
  assert.equal(cdpDispatches,0);assert.equal(emitted,1);
});

test('failure diagnostic workflow preserves existing desktop-header precondition', () => {
  const workflow = fs.readFileSync('.github/workflows/visual-regression.yml','utf8');
  const step = workflow.split('- name: Verify desktop header fit in every theme')[1].split('- name: Run visual-regression snapshots')[0];
  assert.doesNotMatch(step,/\bif:/);
  assert.match(step,/run: npx playwright test tests\/navigation\.spec\.js --grep "Desktop header keeps every control"/);
});


test('actual pure failure target selects exactly one of the existing70 matrix cases', () => {
  const target = actualFailureProbeFunction('failureProbeTarget');
  const source = fs.readFileSync('tests/visual-regression.spec.js','utf8');
  const names = constant => Array.from(source.split('const '+constant+' = [')[1].split('\n];')[0].matchAll(/name: '([^']+)'/g),m=>m[1]);
  const surfaces = names('SURFACES'), viewports = names('VIEWPORTS');
  const themes = Array.from(source.match(/const THEMES = \[([^\]]+)\];/)[1].matchAll(/'([^']+)'/g),m=>m[1]);
  assert.equal(surfaces.length,7);assert.equal(viewports.length,5);assert.equal(themes.length,2);
  let combinations = 0; const selected = [];
  for (const surface of surfaces) for (const viewport of viewports) for (const theme of themes) {
    combinations++; if (target(surface,viewport,theme)) selected.push([surface,viewport,theme]);
  }
  assert.equal(combinations,70);assert.deepEqual(selected,[['games','pixel-5','dark']]);
  for (const invalid of [undefined,null,0,1,true,false,{},[],new String('games'),Symbol('games')]) {
    assert.equal(target(invalid,'pixel-5','dark'),false);
    assert.equal(target('games',invalid,'dark'),false);
    assert.equal(target('games','pixel-5',invalid),false);
  }
  assert.match(source,/const probeForThisCase = failureSceneDiagnostics && failureProbeTarget\(surface\.name, vp\.name, theme\);/);
  assert.match(source,/const startedAt = probeForThisCase \? testInfo\._startWallTime : null;/);
  assert.match(source,/if \(probeForThisCase\) \{[\s\S]*?await nativeWithFailureProbe\([\s\S]*?\} else \{\s+await expect\(page\)\.toHaveScreenshot/);
});


test('actual experiment admission rejects foreign arms, missing failure flag and generation', () => {
  const admit = actualFailureProbeFunction('admitGamesExperiment',{diagnosticLoopback:u=>u==='http://127.0.0.1:4173'});
  for(const arm of ['ordinary','noop','range']) admit(arm,'true','','none','http://127.0.0.1:4173');
  admit('','','','all','https://example.test');
  for(const args of [['foreign','true','','none','http://127.0.0.1:4173'],['range','','','none','http://127.0.0.1:4173'],['noop','true','true','none','http://127.0.0.1:4173'],['ordinary','true','','all','http://127.0.0.1:4173'],['range','true','','none','https://example.test']]) assert.throws(()=>admit(...args));
});

test('actual post-result helper observes passes/rejections once and preserves exact native error', async () => {
  const run = actualFailureProbeFunction('nativeWithResultProbe'), events=[], native=Error('native');
  assert.equal(await run(async()=>{events.push('pass');return 3;},async failed=>{events.push(failed);throw Error('observer');}),3);
  assert.deepEqual(events,['pass',false]);events.length=0;
  await assert.rejects(run(async()=>{events.push('reject');throw native;},async failed=>{events.push(failed);throw Error('observer');}),e=>e===native);
  assert.deepEqual(events,['reject',true]);
});

function actualCoordinatorFunction(name, context={}) {
  const source=fs.readFileSync('scripts/run-games-controlled-experiment.mjs','utf8');
  const start=source.indexOf('export function '+name+'('),end=source.indexOf('\n}\n',start);
  assert.ok(start>=0&&end>start);
  return new Function(...Object.keys(context),'return ('+source.slice(start,end+2).replace(/^export /,'')+');')(...Object.values(context));
}

test('actual coordinator binds target rejection/role/known frame per retry, not job exit or expected frame', () => {
  const known='fe14e5457a95b3d2d873fd9cc0aa6cc30757341fa496761ac0e4c63fd21332fe';
  const control=actualCoordinatorFunction('targetControl',{KNOWN:new Set([known])});
  const id=retry=>({surface:'games',viewport:'pixel-5',theme:'dark',experimentArm:'ordinary',updateSnapshots:'none',retry});
  const verdict=(retry,nativeFailed)=>({identity:id(retry),phase:'experiment-native-result',nativeFailed,nativeAcceptance:false});
  const frame=retry=>({identity:id(retry),phase:'native-attachment-actual',role:'actual',evidence:'primary-native-failed-frame',available:true,sha256:known,width:393,height:727,bytes:185026});
  const rows=[verdict(0,true),frame(0),verdict(1,true),frame(1)];
  assert.equal(control(rows).kind,'persistent');assert.equal(control([]).kind,'unknown');
  assert.equal(control([verdict(0,false)]).kind,'absent');
  assert.equal(control([verdict(0,true),frame(0),verdict(1,false)]).kind,'weak-flaky');
  for(const change of [{role:'expected'},{phase:'after-failure-before-collector-1'},{evidence:'later-state-not-failed-frame-proof'},{sha256:'a'.repeat(64)},{identity:{...id(0),surface:'home'}}]) {
    const bad=structuredClone(rows);bad[1]={...bad[1],...change};assert.notEqual(control(bad).kind,'persistent');
  }
  assert.notEqual(control([...rows,frame(0)]).kind,'persistent');
});

test('actual experiment PASS collector never reads any native failed-frame file', async () => {
  let reads=0;
  const actualRead=actualFailureProbeFunction('captureFailureProbe',{Date,path,
    diagnosticLoopback:()=>true,emitSceneDiagnostic:()=>{},ownedFailurePng:()=>{reads++;throw Error('must not read');},
    failurePngMetadata:()=>({}),captureSceneDiagnostic:async()=>{}});
  await actualRead({url:()=> 'http://127.0.0.1',screenshot:async()=>Buffer.alloc(33)},
    {timeout:30000,outputDir:'/owned',attachments:[]},{},'games-pixel-5-dark.png',Date.now(),false);
  assert.equal(reads,0);
});

test('actual target intervention performs zero ordinary or exactly one no-op/Range RPC', async () => {
  let calls=0,queries=0,ranges=0,selected=0,rects=0;const paragraph={};
  const intervene=actualFailureProbeFunction('gamesIntervention',{document:{
    querySelector:selector=>{queries++;assert.equal(selector,'.page-hero p');return paragraph;},
    createRange:()=>{ranges++;return {selectNodeContents:p=>{assert.equal(p,paragraph);selected++;},getClientRects:()=>{rects++;return [];}};}
  }});
  const page={evaluate:async(fn,arg)=>{calls++;return fn(arg);}};
  await intervene(page,'ordinary');assert.equal(calls,0);
  await intervene(page,'noop');assert.equal(calls,1);assert.equal(queries,0);
  await intervene(page,'range');assert.deepEqual([calls,queries,ranges,selected,rects],[2,1,1,1,1]);
});

test('actual coordinator parser bounds rows and workflow exposes only fixed manual coordinator', () => {
  const parse=actualCoordinatorFunction('diagnosticRows',{Buffer,need:(v,code)=>{if(!v)throw Error(code);}});
  assert.deepEqual(parse('unrelated output\n[vs-scene-diagnostic] {"phase":"example"}\n'),[{phase:'example'}]);
  assert.throws(()=>parse('[vs-scene-diagnostic] not-json\n'));
  assert.throws(()=>parse('[vs-scene-diagnostic] '+JSON.stringify({value:'x'.repeat(65537)})));
  const workflow=fs.readFileSync('.github/workflows/visual-regression.yml','utf8');
  assert.match(workflow,/games_controlled_experiment:[\s\S]*?type: boolean\s+default: false/);
  assert.match(workflow,/if: github.event_name == 'workflow_dispatch' && github.event.inputs.games_controlled_experiment == 'true'/);
  assert.match(workflow,/run: node scripts\/run-games-controlled-experiment\.mjs --run-controlled-games/);
  assert.match(workflow,/name: visual-regression-diffs\s+include-hidden-files: true/);
  assert.match(workflow,/\.cache\/games-controlled-experiment\//);
  const source=fs.readFileSync('scripts/run-games-controlled-experiment.mjs','utf8');
  assert.match(source,/process\.exitCode=1;/);assert.doesNotMatch(source,/--grep|--retries|--workers|--timeout|shell:\s*true/);
});


test('actual runtime resolver pins registry headless-shell under source-verified default config', () => {
  const need=(v,code)=>{if(!v)throw Error(code);};
  const resolve=actualCoordinatorFunction('resolveHeadlessRuntime',{need,path});
  const core=path.resolve('/installed-core'),exe=path.resolve('/installed-headless-shell');
  const config={use:{headless:true},projects:[{name:'chromium',use:{browserName:'chromium',launchOptions:{args:[]}}}]};
  let registryLoads=0;
  const load=absolute=>{registryLoads++;assert.equal(absolute,path.join(core,'lib/server/registry/index.js'));return {registry:{findExecutable:name=>{assert.equal(name,'chromium-headless-shell');return {executablePath:()=>exe};}}};};
  const selected=resolve(core,config,load);assert.equal(selected.executablePath,exe);
  assert.equal(selected.resolutionBasis.registryName,'chromium-headless-shell');assert.equal(selected.resolutionBasis.headless,true);
  for(const mutate of [c=>{c.use.headless=false;},c=>{c.use.channel='chrome';},c=>{c.projects[0].use.channel='chrome';},c=>{c.projects[0].use.launchOptions.executablePath='/foreign';},c=>{c.projects[0].use.launchOptions.headless=false;}]) {
    const changed=structuredClone(config);mutate(changed);assert.throws(()=>resolve(core,changed,load));
  }
  assert.equal(registryLoads,1);
  const source=fs.readFileSync('scripts/run-games-controlled-experiment.mjs','utf8');
  assert.doesNotMatch(source,/chromium\.executablePath\(/);
  for(const file of ['lib/server/browserType.js','lib/server/chromium/chromium.js','lib/server/registry/index.js'])assert.ok(source.includes(file));
});

test('actual line-summary parser distinguishes full70 from missing, truncated and wrong totals', () => {
  const parse=actualCoordinatorFunction('matrixSummary',{Buffer});
  const actual=parse('\u001b[32m  2 failed\u001b[0m\n  1 flaky\n  67 passed (2.1m)\n');
  assert.equal(actual.complete,true);assert.equal(actual.total,70);
  assert.deepEqual(actual.counts,{passed:67,failed:2,flaky:1,skipped:0,interrupted:0});
  assert.equal(parse('  70 passed (1.0m)\n').complete,true);
  for(const bad of ['', '  2 failed\n', '  67 passed\n  2 failed\n', '  69 passed\n', '  69 passed\n  1 skipped\n', '  69 passed\n  1 interrupted\n', '  70 passed\n  70 passed\n'])assert.equal(parse(bad).complete,false);
  const source=fs.readFileSync('scripts/run-games-controlled-experiment.mjs','utf8');
  assert.match(source,/record\.matrix\.complete/);assert.match(source,/native-process-or-matrix-incomplete/);
});

test('actual coordinator refusal exposes only reviewed codes and phases', () => {
  const classify=actualCoordinatorFunction('safeRefusal');
  assert.deepEqual(classify(Error('candidate-checkout-or-tracked-drift'),'checkout'),{
    scope:'controlled-games-diagnostic-refusal',phase:'checkout',reason:'candidate-checkout-or-tracked-drift',nativeCode:null,
  });
  const unknown=classify({message:'private-secret-value',code:'private-native-value'},'private-path');
  assert.deepEqual(unknown,{scope:'controlled-games-diagnostic-refusal',phase:'unknown',reason:'unrecognized-withheld',nativeCode:null});
  assert.equal(classify({message:'private-path',code:'MODULE_NOT_FOUND'},'runtime-resolution').nativeCode,'MODULE_NOT_FOUND');
});

test('actual runtime resolver supports the published bundled registry namespace without falling back', () => {
  const need=(v,code)=>{if(!v)throw Error(code);};
  const resolve=actualCoordinatorFunction('resolveHeadlessRuntime',{need,path});
  const core=path.resolve('/installed-core'),shell=path.resolve('/selected-shell');
  const config={use:{headless:true},projects:[{name:'chromium',use:{browserName:'chromium'}}]};
  const load=file=>{assert.equal(file,path.join(core,'lib/coreBundle.js'));return {registry:{registry:{findExecutable:name=>{assert.equal(name,'chromium-headless-shell');return {executablePath:()=>shell};}}}};};
  const selected=resolve(core,config,load,'core-bundle');
  assert.equal(selected.executablePath,shell);assert.equal(selected.resolutionBasis.layout,'core-bundle');
  assert.throws(()=>resolve(core,config,()=>({registry:{findExecutable:()=>{throw Error('unused legacy namespace');}}}),'core-bundle'),/installed-headless-registry-unavailable/);
  assert.throws(()=>resolve(core,config,load,'unknown-layout'),/installed-registry-layout-unverified/);
});


test('actual visual worker claim allows one scene and rejects cross-scene reuse before mutation', () => {
  const claim = actualFailureProbeFunction('claimVisualScene'), state = {key:null};
  const first = JSON.stringify(['games','pixel-5','dark']), other = JSON.stringify(['home','pixel-5','dark']);
  claim(state,first);claim(state,first);assert.equal(state.key,first);
  assert.throws(()=>claim(state,other),/reused across different scenes/);assert.equal(state.key,first);
  for(const key of [undefined,null,0,{},[],false,'','x'.repeat(257)])assert.throws(()=>claim({key:null},key),/Invalid visual scene key/);
});

test('actual visual registration has70 unique literal worker keys with inherited parent context', () => {
  const source=fs.readFileSync('tests/visual-regression.spec.js','utf8');
  const names=constant=>Array.from(source.split('const '+constant+' = [')[1].split('\n];')[0].matchAll(/name: '([^']+)'/g),m=>m[1]);
  const surfaces=names('SURFACES'),viewports=names('VIEWPORTS'),themes=Array.from(source.match(/const THEMES = \[([^\]]+)\];/)[1].matchAll(/'([^']+)'/g),m=>m[1]);
  const expression=source.match(/const sceneKey = ([^;]+);/)[1];
  const actualKey=new Function('surface','vp','theme','return '+expression+';'),keys=[];
  for(const surface of surfaces)for(const viewport of viewports)for(const theme of themes)keys.push(actualKey({name:surface},{name:viewport},theme));
  assert.equal(keys.length,70);assert.equal(new Set(keys).size,70);
  assert.ok(keys.includes(JSON.stringify(['games','pixel-5','dark'])));
  assert.match(source,/const workerSceneClaim = \{ key: null \};/);
  assert.match(source,/const scenario = test\.extend\(\{\s+visualCaseKey: \[sceneKey, \{ scope: 'worker', option: true \}\],\s+\}\);/);
  assert.match(source,/scenario\(`\$\{surface.name\} · \$\{vp.name\} · \$\{theme\}`, async/);
  assert.match(source,/test\.use\(\{ \.\.\.emulationOnly\(vp.config\), reducedMotion: 'reduce' \}\);/);
  const body=source.slice(source.indexOf('scenario(`${surface.name}'));
  assert.ok(body.indexOf('claimVisualScene(workerSceneClaim, sceneKey);')<body.indexOf('await page.goto('));
});

async function actualReadinessGeometryWitness({ moving = false } = {}) {
  const reads = { skipped: 0, visible: 0, fallback: 0, offscreen: 0, collapsed: 0 };
  const visibility = [], samples = [], states = [], styles = [], keys = [];
  let now = 0, sampleIndex = 0;
  const element = (id, top, width = 80) => ({
    id, tagName: 'P', childElementCount: 0, textContent: id,
    checkVisibility(options) { visibility.push({ id, options }); return id !== 'skipped'; },
    getBoundingClientRect() {
      reads[id]++;
      if (id === 'skipped') throw Error('Readiness forced a skipped subtree into layout');
      const y = id === 'visible' && moving && sampleIndex > 1 ? top + 10 : top;
      return { x: 0, y, width, height: 20, top: y, bottom: y + 20 };
    },
  });
  const elements = [element('skipped', 10000), element('visible', 10), element('fallback', 50),
    element('offscreen', 10000), element('collapsed', 20, 0)];
  delete elements[2].checkVisibility; // Older engines keep the geometry fallback.
  const document = {
    fonts: { status: 'loaded' }, body: { dataset: { theme: 'dark' } },
    documentElement: { hasAttribute: () => false },
    scrollingElement: { scrollHeight: 2000, clientHeight: 600 },
    querySelector: () => null,
    querySelectorAll(selector) {
      if (selector === 'body *') return elements;
      assert.equal(selector, 'link[rel="stylesheet"]'); return [];
    },
  };
  const expect = {
    poll(callback, options) {
      assert.equal(options.timeout, 5000);
      assert.deepEqual(options.intervals, [100, 250, 500]);
      return { async toMatchObject(expected) {
        assert.deepEqual(expected, { ready: true, layoutStable: true });
        for (let i = 0; i < (moving ? 3 : 2); i++) {
          now = i * 600;
          states.push(await callback());
        }
        assert.equal(states.at(-1).ready, true);
        assert.equal(states.at(-1).layoutStable, true);
      } };
    },
  };
  const readiness = actualFailureProbeFunction('waitForVisualReadiness', {
    document, expect, Date: { now: () => now }, innerHeight: 600, scrollX: 0, scrollY: 0,
    location: { pathname: '/', hash: '' }, window: { VSAfterPaint: { started: true, done: true } },
    VISUAL_SCENES, visualSceneState,
    getComputedStyle(el) { styles.push(el.id); return { opacity: '1', visibility: 'visible', transform: 'none' }; },
  });
  await readiness({ keyboard: { async press(key) { keys.push(key); } }, async evaluate(callback, args) {
    sampleIndex++;
    const sample = callback(args); samples.push(sample); return sample;
  } }, { name: 'home' });
  return { reads, visibility, samples, states, styles, keys };
}

test('actual readiness sampler skips unrendered subtrees before measuring and reuses visible rectangles', async () => {
  const witness = await actualReadinessGeometryWitness();
  assert.deepEqual(witness.keys, ['Shift']);
  assert.deepEqual(witness.reads, { skipped: 0, visible: 2, fallback: 2, offscreen: 2, collapsed: 2 });
  assert.deepEqual(witness.styles, ['visible', 'fallback', 'visible', 'fallback']);
  assert.ok(witness.visibility.every(({ options }) => options.contentVisibilityAuto === true));
  for (const sample of witness.samples) {
    const visibleRows = JSON.parse(sample.fingerprint)[3];
    assert.deepEqual(visibleRows.map(row => row[1]), ['visible', 'fallback']);
    assert.equal(visibleRows[0][3], 10);
  }
  assert.deepEqual(witness.states.map(state => state.layoutStable), [false, true]);
});

test('actual readiness still resets its stability window for visible geometry changes', async () => {
  const witness = await actualReadinessGeometryWitness({ moving: true });
  assert.deepEqual(witness.states.map(state => state.layoutStable), [false, false, true]);
  assert.deepEqual(witness.samples.map(sample => JSON.parse(sample.fingerprint)[3][0][3]), [10, 20, 20]);
  assert.equal(witness.reads.skipped, 0);
  assert.equal(witness.reads.visible, 3);
});
