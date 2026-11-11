import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { parseDeployArgv } from '../scripts/lib/deploy-argv.mjs';
import { handoffDigest, measureOmissions } from '../scripts/lib/handoff-digest.mjs';
import { trimHandoffText } from '../scripts/lib/handoff-trim.mjs';
import { main as dispatch } from '../scripts/deploy-desk-dispatch.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scripts = ['deploy-staging','deploy-worker','deploy-staging-content','deploy-staging-desk-content','deploy-member-newsletter','deploy-desk-dispatch'];
const config = {name:'fixture',boolFlags:['--deploy','--self-test'],valueFlags:['--env'],modes:['--deploy','--self-test']};
test('strict grammar rejects ambiguous tokens and preserves actual values', () => {
  for (const argv of [['--typo'],['oops'],['--deploy=false'],['--env'],['--env','--oops'],['--env='],['--env=a','--env=b'],['--deploy','--self-test'],['--env','staging','oops']]) assert.throws(()=>parseDeployArgv(argv,config),undefined,argv.join(' '));
  assert.equal(parseDeployArgv(['--env=production','--deploy'],config).values['--env'],'production');
  assert.equal(parseDeployArgv(['--env','staging'],config).values['--env'],'staging');
});

test('actual deployment CLIs reject input and keep help/preview inert under IO tripwires', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'vss-admission-'));
  const preload = path.join(dir,'tripwire.mjs');
  fs.writeFileSync(preload, `import {registerHooks, syncBuiltinESMExports} from 'node:module';
import fs from 'node:fs'; import cp from 'node:child_process'; import https from 'node:https'; import http from 'node:http';
const trap=()=>{throw Error('OPERATIONAL_IO_TRIPWIRE');};
const read=fs.readFileSync; fs.readFileSync=(file,...args)=>{if(String(file).replaceAll('\\\\','/').includes('config/desk-content-paths.json'))trap();return read(file,...args);};
registerHooks({resolve(spec,context,next){if(/(?:secrets|model-router)[.]mjs$/.test(spec))trap(); return next(spec,context);}});
for(const key of ['writeFileSync','appendFileSync','mkdirSync','rmSync','unlinkSync','renameSync'])fs[key]=trap;
for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[key]=trap;
https.request=trap; https.get=trap; http.request=trap; http.get=trap; globalThis.fetch=trap; syncBuiltinESMExports();`);
  try {
    for (const script of scripts) {
      for (const argv of [['--help'],['-h'],['--dry-run'],['--dry'],['-n'],['--check'],['--typo'],['oops'],['--help=false']]) {
        const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,`scripts/${script}.mjs`,...argv],{cwd:root,encoding:'utf8',timeout:15000});
        const invalid=argv[0]==='--typo'||argv[0]==='oops'||argv[0]==='--help=false';
        assert.equal(run.status,invalid?(script==='deploy-desk-dispatch'?1:2):0,`${script} ${argv}: ${run.stderr}`);
        assert.doesNotMatch(run.stderr||'',/OPERATIONAL_IO_TRIPWIRE/);
      }
    }
    for(const [script,argv] of [['deploy-worker',['--env','production','--confirm-production','--dry']],['deploy-staging-content',['--repair-permissions','--check']],['deploy-staging-desk-content',['--deploy','--dry-run']],['deploy-member-newsletter',['--deploy','--dry']],['deploy-desk-dispatch',['--all','--dry-run']]]){
      const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,`scripts/${script}.mjs`,...argv],{cwd:root,encoding:'utf8',timeout:15000});
      assert.equal(run.status,0,`${script}: ${run.stderr}`);
    }
    for(const script of ['deploy-worker','deploy-staging-content','deploy-staging-desk-content','deploy-member-newsletter']){
      const flag={'deploy-worker':'--env','deploy-staging-content':'--baseline','deploy-staging-desk-content':'--production-baseline','deploy-member-newsletter':'--only'}[script];
      for(const argv of [[flag],[`${flag}=a`,`${flag}=b`],[flag,'--typo']]){
        const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,`scripts/${script}.mjs`,...argv],{cwd:root,encoding:'utf8',timeout:15000});
        assert.equal(run.status,2,`${script}: ${run.stderr}`);
        assert.doesNotMatch(run.stderr||'',/OPERATIONAL_IO_TRIPWIRE/);
      }
    }
    // S390: commands that send to people refuse ambiguous input before any IO.
    for(const script of ['notify-subscribers','notify-changelog-subscribers','push-dispatch','send-regression-alert']){
      for(const argv of [['--dryrun'],['--typo'],['oops'],['--help=false'],['--help']]){
        const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,`scripts/${script}.mjs`,...argv],{cwd:root,encoding:'utf8',timeout:15000});
        assert.equal(run.status,argv[0]==='--help'?0:2,`${script} ${argv}: ${run.stderr}`);
        assert.doesNotMatch(run.stderr||'',/OPERATIONAL_IO_TRIPWIRE/);
      }
    }
    for(const argv of [['--dry'],['-n'],['--check'],['--dry-run'],['--endpoint','https://push.example/x','--dry']]){
      const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'scripts/push-dispatch.mjs',...argv],{cwd:root,encoding:'utf8',timeout:15000});
      assert.equal(run.status,0,`push-dispatch ${argv}: ${run.stderr}`);
      assert.doesNotMatch(run.stderr||'',/OPERATIONAL_IO_TRIPWIRE/);
    }
    for(const argv of [['--title'],['--title','a','--title','b'],['--game','cod','--count','--typo']]){
      const run=spawnSync(process.execPath,['--import',pathToFileURL(preload).href,'scripts/notify-subscribers.mjs',...argv],{cwd:root,encoding:'utf8',timeout:15000});
      assert.equal(run.status,2,`notify-subscribers ${argv}: ${run.stderr}`);
    }
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('omission measurement separates a cut newest session from trimmed older history', () => {
  const session = (n, size) => `## Where We Left Off (Session ${n})\n\n${'x'.repeat(size)}\n`;
  const fits = session(2, 100) + session(1, 100);
  const olderCut = session(2, 400) + '\n' + session(1, 4000);
  const newestCut = session(2, 4000) + '\n' + session(1, 100);
  const report = measureOmissions([fits, olderCut, newestCut], { maxChars: 2000 });
  assert.equal(report.versions, 3);
  assert.equal(report.omitted, 2);
  assert.equal(report.newestCut, 1);
  assert.ok(report.omittedChars.max > 0 && report.omittedChars.median <= report.omittedChars.max);
  assert.equal(measureOmissions([fits]).omitted, 0);
});

test('every dry alias reaches outward commands as a preview', () => {
  const config={name:'fixture',boolFlags:['--force'],valueFlags:['--title']};
  for(const alias of ['--dry-run','--dry','-n','--check'])assert.equal(parseDeployArgv([alias,'--title','x'],config).dry,true,alias);
  assert.equal(parseDeployArgv(['--force'],config).dry,false);
});

test('Desk Dispatch preview never invokes injected operations',async()=>{
  const trap=()=>{throw Error('unexpected operation');};
  for(const argv of [['--help'],['--all','--dry-run'],['--deploy','--check']])assert.equal(await dispatch(argv,{assertProject:trap,setSecrets:trap,deploy:trap,verify:trap}),true);
});

test('deterministic handoff preserves source, omission lookup, and hash identity',()=>{
  const small='## Where We Left Off (Session 389)\nKeep exact pending evidence.\n';
  const a=handoffDigest(small);
  assert.equal(a.omitted,false); assert.ok(a.digest.endsWith(small));
  assert.deepEqual(handoffDigest(small),a);
  assert.notEqual(handoffDigest(small+'Changed').hash,a.hash);
  const large=small+'Detail\n'.repeat(2000)+'## Blockers\nApproval required.\n';
  const b=handoffDigest(large);
  assert.equal(b.omitted,true);assert.ok(b.digest.length<=6000);assert.match(b.digest,/Extract is incomplete/);assert.match(b.digest,/L\d+: Blockers/);
});

test('handoff trimming preserves section boundaries for LF and CRLF',()=>{
  for(const nl of ['\n','\r\n']){
    const source=['# Handoff','## Where We Left Off (Session 389)','Current','## Where We Left Off (Session 388)','Previous','## Where We Left Off (Session 387)','Archive',''].join(nl);
    const result=trimHandoffText(source);
    assert.equal(result.trimmed,true);assert.match(result.text,/# Handoff\n## Where/);assert.match(result.text,/Current\n## Where/);
    assert.doesNotMatch(result.text,/Session 387/);assert.match(result.archiveText,/Session 387/);
    assert.equal(trimHandoffText(result.text).trimmed,false);
  }
});

test('isolated compactor rejects old cache, stays deterministic, and invalidates changed source without credentials',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vss-handoff-'));
  try{
    fs.mkdirSync(path.join(dir,'scripts/lib'),{recursive:true});fs.mkdirSync(path.join(dir,'context'));fs.mkdirSync(path.join(dir,'.ops-cache'));
    for(const file of ['compact-handoff.mjs','lib/archive-then-compact.mjs','lib/handoff-digest.mjs','lib/handoff-blocks.mjs','lib/handoff-trim.mjs','lib/deploy-argv.mjs','lib/argv-guard.mjs'])fs.copyFileSync(path.join(root,'scripts',file),path.join(dir,'scripts',file));
    const source='## Where We Left Off (Session 389)\nPending stays pending.\n';
    fs.writeFileSync(path.join(dir,'context/LATEST_HANDOFF.md'),source);
    fs.writeFileSync(path.join(dir,'.ops-cache/handoff-digest.json'),JSON.stringify({hash:handoffDigest(source).hash,digest:'stale paid summary',ts:Date.now()}));
    const run=(...args)=>{const r=spawnSync(process.execPath,[path.join(dir,'scripts/compact-handoff.mjs'),...args],{cwd:root,encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);};
    run(); const output=()=>fs.readFileSync(path.join(dir,'context/LATEST_HANDOFF.compact.md'),'utf8'); const first=output();
    assert.match(first,/Pending stays pending/);assert.doesNotMatch(first,/stale paid summary/);
    run('--force');assert.equal(output(),first);run();assert.equal(output(),first);
    fs.writeFileSync(path.join(dir,'context/LATEST_HANDOFF.md'),source+'Changed source.\n');
    run('--dry-run');assert.equal(output(),first);run();assert.notEqual(output(),first);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'.ops-cache/handoff-digest.json'))).mode,'deterministic-v1');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('Worker deployment keeps broker execution scoped and CI fallback explicit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-worker-broker-'));
  const source = fs.readFileSync(path.join(root, 'scripts/deploy-worker.mjs'), 'utf8');
  function runCase(name, { broker = true, brokerMode = 'ready', ci = false, token = false, account = false, pinned = true, args = [], failGate = false, status = 0, calls = 1, insideBroker = true } = {}) {
    const home = path.join(dir, name), project = path.join(home, 'project'), scriptsDir = path.join(project, 'scripts');
    fs.mkdirSync(path.join(scriptsDir, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, 'deploy-worker.mjs'), source);
    for (const file of ['deploy-argv.mjs', 'argv-guard.mjs']) fs.copyFileSync(path.join(root, 'scripts/lib', file), path.join(scriptsDir, 'lib', file));
    fs.writeFileSync(path.join(scriptsDir, 'lib/secrets.mjs'), "throw Error('raw-secret-module-must-never-load');\n");
    fs.writeFileSync(path.join(scriptsDir, 'lib/safe-spawn.mjs'), `import fs from 'node:fs';
export function spawnSync(command,args,options){
 const deploy=args.includes('deploy');
 if(deploy&&process.env.FIXTURE_EXPECT_BROKER==='true'&&process.env.FIXTURE_BROKER_ACTIVE!=='true')throw Error('outside-broker-closure');
 const row={kind:deploy?'deploy':'preflight',script:args[0].split(/[\\\\/]/).pop(),args:args.slice(1),brokerActive:process.env.FIXTURE_BROKER_ACTIVE==='true',tokenPresent:!!options.env.CLOUDFLARE_API_TOKEN,accountPresent:!!options.env.CLOUDFLARE_ACCOUNT_ID};
 fs.appendFileSync(process.env.FIXTURE_RECORD,JSON.stringify(row)+'\\n');
 return {status:process.env.FIXTURE_FAIL_GATE==='true'&&!deploy?7:0};
}
`);
    fs.mkdirSync(path.join(project, 'cloudflare'));
    fs.writeFileSync(path.join(project, 'cloudflare/wrangler.toml'), pinned ? 'account_id = "fixture-account"\n' : 'name = "fixture-worker"\n');
    const wrangler = path.join(project, 'node_modules/wrangler/bin');
    fs.mkdirSync(wrangler, { recursive: true });
    fs.writeFileSync(path.join(wrangler, 'wrangler.js'), "throw Error('real-Wrangler-must-not-execute');\n");
    if (broker) {
      const adapter = path.join(home, 'vaultspark-studio-ops/scripts/lib');
      fs.mkdirSync(adapter, { recursive: true });
      fs.writeFileSync(path.join(adapter, 'cf-deploy.mjs'), `export async function withDeployEnv(action,fn){
 if(!/^website-worker-deploy-(staging|production)$/.test(action))throw Error('unexpected-action');
 if(process.env.FIXTURE_BROKER_MODE==='throw')throw Error('fixture-denial');
 process.env.FIXTURE_BROKER_ACTIVE='true';
 try{return await fn(process.env.FIXTURE_BROKER_MODE==='missing'?{}:{CLOUDFLARE_API_TOKEN:'fixture-broker-token',CLOUDFLARE_ACCOUNT_ID:'fixture-broker-account'});}
 finally{delete process.env.FIXTURE_BROKER_ACTIVE;}
}`);
    }
    const record = path.join(home, 'calls.jsonl');
    const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
    Object.assign(env, { FIXTURE_RECORD: record, FIXTURE_BROKER_MODE: brokerMode, FIXTURE_EXPECT_BROKER: String(insideBroker), FIXTURE_FAIL_GATE: String(failGate) });
    if (ci) env.GITHUB_ACTIONS = 'true';
    if (token) env.CLOUDFLARE_API_TOKEN = 'fixture-ci-token';
    if (account) env.CLOUDFLARE_ACCOUNT_ID = 'fixture-ci-account';
    const result = spawnSync(process.execPath, [path.join(scriptsDir, 'deploy-worker.mjs'), ...args], { cwd: project, env, encoding: 'utf8', timeout: 15000, windowsHide: true });
    assert.equal(result.error, undefined, `${name}: fixture child starts`);
    assert.equal(result.status, status, `${name}: ${result.stderr}`);
    const observed = fs.existsSync(record) ? fs.readFileSync(record, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
    assert.equal(observed.length, calls, `${name}: exact subprocess count`);
    if (status === 0 && calls) {
      const deploy = observed.at(-1);
      assert.equal(deploy.kind, 'deploy', name);
      assert.equal(deploy.brokerActive, insideBroker, name);
      assert.equal(deploy.tokenPresent, true, name);
      assert.equal(deploy.accountPresent, insideBroker || account, name);
      assert.deepEqual(deploy.args, ['deploy', '--config', 'cloudflare/wrangler.toml', '--env', args.includes('production') ? 'production' : 'staging'], name);
    }
    if (args.includes('production') && args.includes('--confirm-production')) {
      assert.equal(observed[0].script, 'check-production-promotion-gate.mjs', name);
      assert.deepEqual(observed[0].args, ['--require-allowed'], name);
      if (!failGate) {
        assert.equal(observed[1].script, 'run-release-ceremony.mjs', name);
        assert.deepEqual(observed[1].args, ci ? ['--check', '--require-ready', '--require-fresh'] : ['--url=https://website.staging.vaultsparkstudios.com', '--require-ready'], name);
      }
    }
    for (const literal of ['fixture-ci-token', 'fixture-broker-token']) assert.equal((result.stdout + result.stderr).includes(literal), false, `${name}: credentials stay out of output`);
  }
  try {
    runCase('local-broker-closure');
    runCase('local-missing-adapter-env-does-not-bypass', { broker: false, token: true, account: true, status: 1, calls: 0 });
    runCase('local-broker-missing-values-fails-closed', { brokerMode: 'missing', token: true, account: true, status: 1, calls: 0 });
    runCase('ci-explicit-token-pinned-account', { broker: false, ci: true, token: true, insideBroker: false });
    runCase('ci-missing-token', { broker: false, ci: true, status: 1, calls: 0, insideBroker: false });
    runCase('ci-unpinned-account-required', { broker: false, ci: true, token: true, pinned: false, status: 1, calls: 0, insideBroker: false });
    runCase('ci-broker-denial-never-falls-back', { brokerMode: 'throw', ci: true, token: true, account: true, status: 1, calls: 0 });
    runCase('production-confirmation-required', { args: ['--env', 'production'], status: 2, calls: 0 });
    runCase('production-gates-before-broker', { args: ['--env', 'production', '--confirm-production'], calls: 3 });
    runCase('ci-production-fresh-ceremony', { broker: false, ci: true, token: true, args: ['--env', 'production', '--confirm-production'], calls: 3, insideBroker: false });
    runCase('production-gate-rejection-stops-deploy', { args: ['--env', 'production', '--confirm-production'], failGate: true, status: 7, calls: 1 });
    runCase('unknown-argv-prevents-io', { args: ['--surprise'], status: 2, calls: 0 });
  } finally {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('vss-worker-broker-'));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
