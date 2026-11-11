import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from '../scripts/lib/safe-spawn.mjs';
import {closedSessionFromSil,committedSessionFromGit} from '../scripts/lib/session-identity.mjs';
import {resolveStartupSessions,resolveStartupBriefIdentity} from '../scripts/lib/startup-session-identity.mjs';
import {buildBriefSemanticFingerprint,formatBriefSemanticFingerprint} from '../scripts/lib/brief-semantic-fingerprint.mjs';

test('unfinished sessions do not turn active identity into a completed session', () => {
  assert.deepEqual(resolveStartupSessions({silSession:411,statusSession:412,lockText:'session_id: 413\n'}), {
    currentSession:413,lastClosedSession:411,activeSession:413,statusAheadOfSil:true,
  });
});
test('absent, malformed and closed locks select the next session', () => {
  for(const lockText of ['', 'session_id: garbage\n', 'session_id: 411\n', 'session_id: 410\n'])
    assert.equal(resolveStartupSessions({silSession:411,statusSession:411,lockText}).currentSession,412);
  assert.equal(resolveStartupSessions({silSession:413,statusSession:413,lockText:'session_id: 413\n'}).currentSession,414);
});
test('SIL remains the completed-session authority when status is ahead or behind', () => {
  for(const statusSession of [410,412,413])
    assert.equal(resolveStartupSessions({silSession:411,statusSession,lockText:'session_id: 413\n'}).lastClosedSession,411);
});
test('semantic freshness binds the same active and closed identity as the renderer', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'startup-identity-'));
  try {
    fs.mkdirSync(path.join(root,'context'));
    fs.writeFileSync(path.join(root,'context/PROJECT_STATUS.json'),JSON.stringify({currentSession:412,silLastSession:411,silScore:939}));
    fs.writeFileSync(path.join(root,'context/SELF_IMPROVEMENT_LOOP.md'),'## Session 411 — 2026-11-06\n');
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 413\n');
    const first=buildBriefSemanticFingerprint(root);
    assert.equal(first.nextSession,413);assert.equal(first.lastClosedSession,411);
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 414\n');
    assert.notEqual(first.hash,buildBriefSemanticFingerprint(root).hash);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
test('actual renderer uses separate identities and only repairs lagging status', () => {
  const source=fs.readFileSync(new URL('../scripts/render-startup-brief.mjs',import.meta.url),'utf8');
  assert.match(source,/expectedSession: lastClosedSession/);
  assert.match(source,/statusLatest < silMaxSession/);
  assert.doesNotMatch(source,/currentSession - 1/);
});

test('actual status self-heal branch executes only forward using the project root', () => {
  const source=fs.readFileSync(new URL('../scripts/render-startup-brief.mjs',import.meta.url),'utf8');
  const branch=source.slice(source.indexOf('const statusLatest ='),source.indexOf('const staleBanner ='));
  for(const currentSession of [410,412]) {
    const writes=[], warnings=[];
    vm.runInNewContext(branch,{status:{currentSession},silMaxSession:411,silTotal:939,root:'/fixture-project',path,
      fs:{readFileSync:()=>JSON.stringify({currentSession})},
      writeProjectStatus:(target,status,options)=>writes.push({target,status,options}),
      console:{log(){},warn:message=>warnings.push(message)}});
    if(currentSession===410){assert.equal(writes.length,1);assert.equal(writes[0].target,'/fixture-project');assert.equal(writes[0].status.currentSession,411);assert.equal(warnings.length,0);}
    else {assert.equal(writes.length,0);assert.match(warnings[0],/preserved/);}
  }
});

test('actual local freshness CLI reads the project identity helper', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'startup-freshness-'));
  try {
    fs.mkdirSync(path.join(root,'context'));fs.mkdirSync(path.join(root,'docs'));
    fs.writeFileSync(path.join(root,'context/PROJECT_STATUS.json'),JSON.stringify({currentSession:411,silLastSession:411,silScore:939}));
    fs.writeFileSync(path.join(root,'context/SELF_IMPROVEMENT_LOOP.md'),'## Session 411 — 2026-11-06\n');
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 413\n');
    const marker=formatBriefSemanticFingerprint(buildBriefSemanticFingerprint(root));
    fs.writeFileSync(path.join(root,'docs/STARTUP_BRIEF.md'),`<!-- generated-at: ${new Date().toISOString().slice(0,10)} -->\n${marker}\n`);
    const script=new URL('../scripts/check-brief-staleness.mjs',import.meta.url);
    const run=()=>spawnSync(process.execPath,[script.pathname.replace(/^\/([A-Za-z]:)/,'$1'),'--json'],{cwd:root,encoding:'utf8',windowsHide:true});
    let result=run();assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).fresh,true);
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 414\n');
    result=run();assert.equal(result.status,1,result.stderr);assert.equal(JSON.parse(result.stdout).reason,'semantic-input-shift');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('actual coherence checker accepts skipped active identities and rejects false completion', () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'startup-coherence-'));
  try {
    for(const dir of ['context','docs','logs'])fs.mkdirSync(path.join(root,dir));
    fs.writeFileSync(path.join(root,'context/PROJECT_STATUS.json'),JSON.stringify({currentSession:412}));
    fs.writeFileSync(path.join(root,'context/SELF_IMPROVEMENT_LOOP.md'),'## Session 411 — 2026-11-06\n');
    fs.writeFileSync(path.join(root,'context/TASK_BOARD.md'),'Future Session 999 must not count as complete.');
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 413\n');
    const script=fs.readFileSync(new URL('../scripts/check-startup-session-coherence.mjs',import.meta.url),'utf8')
      .replace(/^#!.*\n/,'').replace(/^import .*;\r?\n/gm,'')
      .replace("const __dirname = path.dirname(fileURLToPath(import.meta.url));",'')
      .replace("const root = path.resolve(__dirname, '..');",'const root = fixtureRoot;');
    const check=()=>{let exit=0;try{vm.runInNewContext(script,{fs,path,fixtureRoot:root,closedSessionFromSil,resolveStartupSessions,resolveStartupBriefIdentity,
      console:{log(){},error(){}},process:{exit:code=>{exit=code;throw new Error('fixture-exit');}}});}catch(error){if(error.message!=='fixture-exit')throw error;}return exit;};
    const writeBrief=(closed,current,legacy=false)=>fs.writeFileSync(path.join(root,'docs/STARTUP_BRIEF.md'),
      `<!-- generated-at: 2026-11-10 (${legacy?'Session '+closed+' closeout':'last closed Session '+closed+'; active/next Session '+current}) -->\n║  Session ${current} ·\n`);
    writeBrief(411,413);assert.equal(check(),0);
    writeBrief(412,413);assert.equal(check(),1);
    writeBrief(411,412);assert.equal(check(),1);
    fs.unlinkSync(path.join(root,'context/.session-lock'));
    writeBrief(411,412,true);assert.equal(check(),0);
    fs.writeFileSync(path.join(root,'context/SELF_IMPROVEMENT_LOOP.md'),'## Session 413 — 2026-11-10\n');
    fs.writeFileSync(path.join(root,'context/PROJECT_STATUS.json'),JSON.stringify({currentSession:413}));
    fs.writeFileSync(path.join(root,'context/.session-lock'),'session_id: 413\n');
    writeBrief(413,414);assert.equal(check(),0);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});


test('isolated checkout validates published active brief while live ownership stays unknown',()=>{
  const brief=(current=415,closed=411)=>'<!-- generated-at: 2026-11-11 (last closed Session '+closed+'; active/next Session '+current+') -->\n<!-- semantic-freshness: hash=0123456789abcdef next='+current+' silSession='+closed+' silScore=939 handoff=- tests=- -->\n║ Session '+current+' ·\n';
  const base={silSession:411,statusSession:411,lockText:'',briefText:brief(),committedSession:415,committedBriefText:brief()};
  assert.deepEqual(resolveStartupBriefIdentity(base),{expectedSession:415,lastClosedSession:411,liveSession:null,source:'committed-brief'});
  for(const change of [{committedSession:null},{committedSession:414},{committedBriefText:brief(414)},{lockText:'session_id: garbage\n'},{briefText:brief().replace('next=415','next=414')}])
    assert.equal(resolveStartupBriefIdentity({...base,...change}).expectedSession,412);
  assert.equal(resolveStartupBriefIdentity({...base,lockText:'session_id: 416\n'}).expectedSession,416);
  assert.equal(resolveStartupBriefIdentity({...base,committedBriefText:brief().replaceAll('\n','\r\n')}).source,'committed-brief');
});

test('actual coherence checker proves published identity without an ignored lock and still rejects drift',()=>{
  const fixtureRoot=fs.mkdtempSync(path.join(os.tmpdir(),'published-startup-coherence-'));
  try{
    for(const dir of ['context','docs','logs'])fs.mkdirSync(path.join(fixtureRoot,dir));
    fs.writeFileSync(path.join(fixtureRoot,'context/PROJECT_STATUS.json'),JSON.stringify({currentSession:411}));
    fs.writeFileSync(path.join(fixtureRoot,'context/SELF_IMPROVEMENT_LOOP.md'),'## Session 411 — fixture\n');
    fs.writeFileSync(path.join(fixtureRoot,'context/TASK_BOARD.md'),'Future Session 999 is not closed evidence.');
    const brief='<!-- generated-at: 2026-11-11 (last closed Session 411; active/next Session 415) -->\n<!-- semantic-freshness: hash=0123456789abcdef next=415 silSession=411 silScore=939 handoff=- tests=- -->\n║ Session 415 ·\n';
    const source=fs.readFileSync(new URL('../scripts/check-startup-session-coherence.mjs',import.meta.url),'utf8').replace(/^#!.*\n/,'').replace(/^import .*;\r?\n/gm,'').replace("const __dirname = path.dirname(fileURLToPath(import.meta.url));",'').replace("const root = path.resolve(__dirname, '..');",'const root = fixtureRoot;');
    function check({working=brief,published=brief,gitOk=true,lock=null,subjects='S415 ship reviewed candidate\n'}={}){
      fs.writeFileSync(path.join(fixtureRoot,'docs/STARTUP_BRIEF.md'),working);
      const lockFile=path.join(fixtureRoot,'context/.session-lock');if(lock===null){if(fs.existsSync(lockFile))fs.unlinkSync(lockFile);}else fs.writeFileSync(lockFile,lock);
      let exit=0;const messages=[],calls=[];
      const git=(command,args)=>{calls.push({command,args});assert.equal(command,'git');if(args[0]==='log'){assert.deepEqual(Array.from(args),['log','-200','--format=%s']);return {status:gitOk?0:1,stdout:subjects};}assert.deepEqual(Array.from(args),['show','HEAD:docs/STARTUP_BRIEF.md']);return {status:gitOk?0:1,stdout:published};};
      try{vm.runInNewContext(source,{fs,path,fixtureRoot,closedSessionFromSil,committedSessionFromGit,resolveStartupSessions,resolveStartupBriefIdentity,spawnSync:git,console:{log:m=>messages.push(m),error:m=>messages.push(m)},process:{exit:code=>{exit=code;throw Error('fixture-exit');}}});}catch(e){if(e.message!=='fixture-exit')throw e;}
      return {exit,messages,calls};
    }
    let result=check();assert.equal(result.exit,0,result.messages.join('\n'));assert.match(result.messages.join('\n'),/source committed-brief; live unknown/);assert.equal(result.calls.length,2);
    for(const options of [{working:brief+'uncommitted edit\n'},{gitOk:false},{subjects:'renew obligations to S415\n'},{working:brief.replace('last closed Session 411','last closed Session 415')}])assert.equal(check(options).exit,1);
    result=check({lock:'session_id: 416\n'});assert.equal(result.exit,1);assert.equal(result.calls.length,0);
    result=check({lock:''});assert.equal(result.exit,1);assert.equal(result.calls.length,0);
    result=check({lock:'session_id: 415\n'});assert.equal(result.exit,0);assert.match(result.messages.join('\n'),/source active-lock; live S415/);assert.equal(result.calls.length,0);
  }finally{fs.rmSync(fixtureRoot,{recursive:true,force:true});}
});
