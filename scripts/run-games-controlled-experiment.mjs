// Fixed Games experiment coordinator. No browser/native work on import/default.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnExact} from './lib/safe-spawn.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const KNOWN=new Set(['fe14e5457a95b3d2d873fd9cc0aa6cc30757341fa496761ac0e4c63fd21332fe','d7fe3e709a7f5cf5f4e1fc7e29c2e668c2a064c6ed6c9c4ec160517a428b62d1']);
const need=(v,code)=>{if(!v)throw Error(code);};

export function targetControl(rows) {
  const target=r=>r?.identity?.surface==='games'&&r.identity.viewport==='pixel-5'&&r.identity.theme==='dark'&&r.identity.experimentArm==='ordinary'&&r.identity.updateSnapshots==='none'&&[0,1].includes(r.identity.retry);
  const attempts=[];
  for(const retry of [0,1]) {
    const verdicts=rows.filter(r=>target(r)&&r.identity.retry===retry&&r.phase==='experiment-native-result');
    const actuals=rows.filter(r=>target(r)&&r.identity.retry===retry&&r.phase==='native-attachment-actual'&&r.role==='actual'&&r.evidence==='primary-native-failed-frame'&&r.available===true);
    if(!verdicts.length&&!actuals.length)continue;
    if(verdicts.length!==1||typeof verdicts[0].nativeFailed!=='boolean'||verdicts[0].nativeAcceptance!==false||actuals.length>1||(!verdicts[0].nativeFailed&&actuals.length))return {kind:'unknown',attempts};
    const knownPrimary=actuals.length===1&&KNOWN.has(actuals[0].sha256)&&actuals[0].width===393&&actuals[0].height===727&&Number.isSafeInteger(actuals[0].bytes)&&actuals[0].bytes>0&&actuals[0].bytes<=4194304;
    attempts.push({retry,nativeFailed:verdicts[0].nativeFailed,knownPrimary,sha256:actuals[0]?.sha256||null});
  }
  const first=attempts.find(a=>a.retry===0),second=attempts.find(a=>a.retry===1);
  if(first?.nativeFailed&&first.knownPrimary&&second?.nativeFailed&&second.knownPrimary)return {kind:'persistent',attempts};
  if(first?.nativeFailed&&first.knownPrimary&&second?.nativeFailed===false)return {kind:'weak-flaky',attempts};
  if(first?.nativeFailed===false&&!second)return {kind:'absent',attempts};
  return {kind:'unknown',attempts};
}

export function diagnosticRows(output) {
  need(typeof output==='string'&&Buffer.byteLength(output)<=8388608,'bounded-arm-log');
  const rows=[];
  for(const line of output.split('\n')) {
    const marker='[vs-scene-diagnostic] ',at=line.indexOf(marker);if(at<0)continue;
    const text=line.slice(at+marker.length).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').trim();
    need(Buffer.byteLength(text)<=65536&&rows.length<128,'bounded-target-rows');
    const row=JSON.parse(text);need(row&&typeof row==='object'&&!Array.isArray(row),'target-row-object');rows.push(row);
  }
  return rows;
}

export function resolveHeadlessRuntime(coreRoot, config, loadRegistry) {
  const valid = use => use && use.channel === undefined && use.executablePath === undefined &&
    use.launchOptions?.channel === undefined && use.launchOptions?.executablePath === undefined &&
    (use.headless === undefined || use.headless === true) &&
    (use.launchOptions?.headless === undefined || use.launchOptions.headless === true);
  const projects = config?.projects?.filter(p => p.name === 'chromium');
  need(config?.use?.headless === true && valid(config.use) && projects?.length === 1 &&
    projects[0].use?.browserName === 'chromium' && valid(projects[0].use),'default-headless-config-unverified');
  const registryModule = path.join(coreRoot,'lib/server/registry/index.js');
  const entry = loadRegistry(registryModule).registry.findExecutable('chromium-headless-shell');
  const executablePath = entry?.executablePath();
  need(typeof executablePath === 'string' && path.isAbsolute(executablePath),'installed-headless-shell-unavailable');
  return {executablePath,resolutionBasis:{registryName:'chromium-headless-shell',headless:true,channel:null,executablePathOverride:false,
    selection:'installed-registry-default-headless-no-channel',configSource:'playwright.config.js'}};
}

export function matrixSummary(output) {
  const counts={passed:0,failed:0,flaky:0,skipped:0,interrupted:0},seen=new Set();
  if(typeof output!=='string'||Buffer.byteLength(output)>8388608)return {counts,total:0,complete:false,reason:'bounded-summary-unavailable'};
  const plain=output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
  for(const line of plain.split('\n')) {
    if(/^\s*\d+\s+did not run\s*$/.test(line))return {counts,total:0,complete:false,reason:'unexecuted-tests'};
    const match=line.match(/^\s*(\d+)\s+(passed|failed|flaky|skipped|interrupted)(?:\s+\([^\r\n()]{1,80}\))?\s*$/);
    if(!match)continue;
    const value=Number(match[1]),label=match[2];
    if(seen.has(label)||!Number.isSafeInteger(value)||value>70)return {counts,total:0,complete:false,reason:'ambiguous-summary'};
    seen.add(label);counts[label]=value;
  }
  const total=Object.values(counts).reduce((a,b)=>a+b,0),complete=seen.size>0&&total===70&&counts.skipped===0&&counts.interrupted===0;
  return {counts,total,complete,reason:complete?null:'missing-or-incomplete-matrix-summary'};
}

function fileHash(file,limit=536870912) {
  const actual=fs.realpathSync(file),s=fs.statSync(actual);need(s.isFile()&&s.size>0&&s.size<=limit,'bounded-pinned-file');
  const fd=fs.openSync(actual,'r'),hash=crypto.createHash('sha256'),buffer=Buffer.alloc(1048576);let total=0;
  try {let n;while((n=fs.readSync(fd,buffer,0,buffer.length,null))){total+=n;need(total<=limit,'bounded-pinned-file');hash.update(buffer.subarray(0,n));}
    const after=fs.fstatSync(fd);need(after.dev===s.dev&&after.ino===s.ino&&after.size===s.size&&after.mtimeMs===s.mtimeMs&&total===s.size,'pinned-file-drift');return hash.digest('hex');
  }finally{fs.closeSync(fd);}
}

function pins(cli,browser) {
  const sources={};for(const rel of ['tests/visual-regression.spec.js','playwright.config.js','.github/workflows/visual-regression.yml','scripts/run-games-controlled-experiment.mjs','scripts/lib/safe-spawn.mjs'])sources[rel]=fileHash(path.join(ROOT,rel),2097152);
  const runtimeFiles={};
  for(const pkg of ['@playwright/test','playwright','playwright-core'])runtimeFiles[pkg+'/package.json']=fileHash(require.resolve(pkg+'/package.json'),2097152);
  const core=path.dirname(require.resolve('playwright-core/package.json')),pw=path.dirname(require.resolve('playwright/package.json'));
  for(const [key,file] of [['serverPage',path.join(core,'lib/server/page.js')],['screenshotter',path.join(core,'lib/server/screenshotter.js')],['matcher',path.join(pw,'lib/matchers/toMatchSnapshot.js')]])runtimeFiles[key]=fs.existsSync(file)?fileHash(file,4194304):null;
  for(const [key,rel] of [['browserTypeSelection','lib/server/browserType.js'],['chromiumSelection','lib/server/chromium/chromium.js'],['registrySelection','lib/server/registry/index.js']])runtimeFiles[key]=fileHash(path.join(core,rel),4194304);
  const base=path.join(ROOT,'tests/__snapshots__/visual-regression.spec.js-snapshots');
  const names=fs.readdirSync(base).filter(n=>/^(home|membership|vault-member|games|tombstones|journal|oracle)-(iphone-se|iphone-13|pixel-5|ipad-mini|desktop-1280)-(dark|light)-chromium-linux\.png$/.test(n)).sort();
  need(names.length===70,'exact-linux-baseline-set');const baselines=Object.fromEntries(names.map(n=>[n,fileHash(path.join(base,n),8388608)]));
  return {sources,baselines,runtimeFiles,node:fileHash(process.execPath),cli:fileHash(cli,2097152),browser:fileHash(browser)};
}

function optionalNative(command,args) {
  try {const r=spawnExact(command,args,{encoding:'utf8',windowsHide:true,timeout:3000,maxBuffer:65536,stdio:['ignore','pipe','pipe']});
    if(r.status!==0||r.error)return null;return String(r.stdout).trim();
  }catch{return null;}
}

function runnerMetadata() {
  // Fixed binaries/arguments only. Missing metadata is UNKNOWN, not a gate.
  const candidate=optionalNative('/usr/bin/fc-match',['-f','%{file}','DejaVu Sans']);let font=null;
  try {if(candidate&&candidate.length<1024&&!candidate.includes('\n')){
    const real=fs.realpathSync(candidate);if(['/usr/share/fonts/','/usr/local/share/fonts/'].some(p=>real.startsWith(p)))font={filePathSha256:digest(real),sha256:fileHash(real,33554432)};
  }}catch{font=null;}
  const packages=optionalNative('/usr/bin/dpkg-query',['-W','-f=${Package}=${Version}\n','fontconfig','libfreetype6','fonts-dejavu-core']);
  return {node:process.version,playwright:require('@playwright/test/package.json').version,platform:os.platform(),release:os.release(),arch:os.arch(),cpuModel:String(os.cpus()[0]?.model||'unknown').slice(0,128),cpuCount:os.cpus().length,font,fontPackages:packages&&packages.length<4096?packages:null};
}

function checkoutWitness(expected) {
  const head=optionalNative('/usr/bin/git',['rev-parse','--verify','HEAD']);
  const status=optionalNative('/usr/bin/git',['-c','core.fsmonitor=false','--no-optional-locks','status','--porcelain=v1','--untracked-files=no']);
  need(head===expected&&status==='','candidate-checkout-or-tracked-drift');
  return {head,trackedClean:true};
}

function emitArm(record) {
  console.log('[games-controlled-arm] '+JSON.stringify({arm:record.arm,nativeExitCode:record.nativeExitCode,nativeSignal:record.nativeSignal,spawnError:record.spawnError,control:record.control,matrix:record.matrix,armComplete:record.armComplete,stdoutSha256:record.stdoutSha256,stderrSha256:record.stderrSha256}));
  let bytes=0;
  for(const row of record.targetRows){const text=JSON.stringify(row);bytes+=Buffer.byteLength(text);
    if(bytes>262144){console.log('[games-controlled-arm] '+JSON.stringify({arm:record.arm,targetConsoleTruncated:true}));break;}
    console.log('[vs-scene-diagnostic] '+text);
  }
}

async function execute() {
  need(process.argv.length===3&&process.argv[2]==='--run-controlled-games','fixed-command-only');
  need(path.resolve(process.cwd())===ROOT&&process.platform==='linux'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch','manual-linux-owning-workflow-only');
  need(!process.env.NODE_OPTIONS&&!process.env.NODE_PATH,'unreviewed-node-override');
  const started=Number(process.env.VS_GAMES_EXPERIMENT_STARTED_AT);need(Number.isSafeInteger(started)&&started<=Date.now()&&Date.now()-started<1500000,'existing-job-budget');
  need(process.env.BASE_URL==='http://127.0.0.1:4173'&&(!process.env.VR_BASE_URL||process.env.VR_BASE_URL==='http://127.0.0.1:4173'),'fixed-candidate-origin');
  const sha=process.env.GITHUB_SHA;need(/^[a-f0-9]{40}$/.test(sha||''),'candidate-source-sha');
  const cli=require.resolve('@playwright/test/cli'),coreRoot=path.dirname(require.resolve('playwright-core/package.json'));
  const selected=resolveHeadlessRuntime(coreRoot,require(path.join(ROOT,'playwright.config.js')),file=>require(file)),browser=selected.executablePath;
  const checkout=checkoutWitness(sha),before=pins(cli,browser),metadata=runnerMetadata(),run=path.join(ROOT,'.cache/games-controlled-experiment',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(6).toString('hex'));
  fs.mkdirSync(run,{recursive:true,mode:0o700});
  const receipt={scope:'controlled-games-experiment-only',nativeAcceptance:false,experimentalNonAcceptance:true,sourceCommit:sha,checkout,startedAt:new Date().toISOString(),pins:before,browserResolution:selected.resolutionBasis,runner:metadata,arms:[],disposition:'incomplete'};
  console.log('[games-controlled-runner] '+JSON.stringify({sourceCommit:sha,checkout,browserResolution:selected.resolutionBasis,pinsSha256:digest(JSON.stringify(before)),runner:metadata,runnerMetadataSha256:digest(JSON.stringify(metadata)),nativeAcceptance:false}));
  try {
    for(const arm of ['ordinary','noop','range']) {
      // Leave job teardown margin. Never change native test timeouts/retries.
      const remaining=started+1500000-Date.now()-60000;
      if(remaining<240000){receipt.disposition='remaining-budget-unmeasured';break;}
      checkoutWitness(sha);
      need(JSON.stringify(pins(cli,browser))===JSON.stringify(before),'source-baseline-runtime-drift');
      const output='test-results/games-controlled-'+path.basename(run)+'-'+arm;
      const args=[cli,'test','tests/visual-regression.spec.js','--project=chromium','--reporter=line','--update-snapshots=none','--output='+output];
      const r=spawnExact(process.execPath,args,{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:remaining,maxBuffer:8388608,env:{...process.env,VS_GAMES_EXPERIMENT_ARM:arm,VS_FAILURE_SCENE_DIAGNOSTICS:'true',VS_SCENE_DIAGNOSTICS:'',VR_BASE_URL:'http://127.0.0.1:4173'},stdio:['ignore','pipe','pipe']});
      const out=String(r.stdout||''),err=String(r.stderr||'');
      fs.writeFileSync(path.join(run,arm+'.stdout.log'),out,{flag:'wx',mode:0o600});fs.writeFileSync(path.join(run,arm+'.stderr.log'),err,{flag:'wx',mode:0o600});
      const record={arm,nativeExitCode:r.status,nativeSignal:r.signal||null,spawnError:r.error?.code||null,stdoutSha256:digest(out),stderrSha256:digest(err),targetRows:[],control:null,matrix:matrixSummary(out),armComplete:false};receipt.arms.push(record);
      // Preserve native exit even when target telemetry is incomplete/malformed.
      try{const rows=diagnosticRows(out);record.targetRows=rows;record.control=arm==='ordinary'?targetControl(rows):null;}
      catch{record.telemetryIncomplete=true;emitArm(record);throw Error('bounded-target-telemetry-incomplete');}
      record.armComplete=!r.error&&[0,1].includes(r.status)&&record.matrix.complete;
      const control=record.control;emitArm(record);
      checkoutWitness(sha);
      need(JSON.stringify(pins(cli,browser))===JSON.stringify(before),'source-baseline-runtime-drift');
      if(r.error||r.status===null||!record.armComplete){receipt.disposition='native-process-or-matrix-incomplete';break;}
      if(arm==='ordinary'&&(r.status!==1||control.kind!=='persistent')){receipt.disposition='ordinary-control-'+control.kind;break;}
      receipt.disposition=arm==='range'?'three-arms-observed-nonacceptance':'partial';
    }
  }catch{receipt.disposition='bounded-experiment-incomplete';}
  finally{receipt.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(run,'EXPERIMENT.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});}
  console.log(JSON.stringify({receipt:path.relative(ROOT,path.join(run,'EXPERIMENT.json')),disposition:receipt.disposition,nativeAcceptance:false}));
  // A's native failure remains nonpassing. Never emit green required evidence.
  process.exitCode=1;
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.length===2)console.log(JSON.stringify({mode:'plan-only',arms:['ordinary','noop','range'],executed:false,nativeAcceptance:false}));
  else execute().catch(()=>{console.error('controlled-games-experiment-refused');process.exitCode=1;});
}
