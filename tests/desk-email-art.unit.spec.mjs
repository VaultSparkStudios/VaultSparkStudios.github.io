// contract-files: scripts/build-news-desk.mjs scripts/lib/desk-art-provenance.mjs scripts/lib/desk-article-art.mjs scripts/lib/desk-email-art.mjs scripts/prepare-desk-email.mjs scripts/build-desk-dispatch-digest.mjs scripts/desk-art-autopilot.mjs .github/workflows/desk-dispatch-digest.yml
import { fileURLToPath } from 'node:url';
import { planIngest, parseReviewed } from '../scripts/ingest-news-art.mjs';
import { DESK_ART_PRODUCERS, beginArticleArtRender, sealArticleArtRender, articleArtOutputs, articleArtProofPath, validateArticleArtProof } from '../scripts/lib/desk-art-provenance.mjs';
import { renderArticleArt } from '../scripts/lib/desk-article-art.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { imageHash, inspectDeskEmailArt, verifyDeskEmailArt, deskArtGenerationCommands, validDeskDate } from '../scripts/lib/desk-email-art.mjs';
import { prepareDeskEmail, parsePreparationArgs } from '../scripts/prepare-desk-email.mjs';
import { main as digest, SITE, BREVO_API } from '../scripts/build-desk-dispatch-digest.mjs';
import { explicitArtScope, scopedPendingImages, existingArtPreparation, pendingImages, ingestScopeArgs } from '../scripts/desk-art-autopilot.mjs';
import { EDITORIAL_PANEL_BUDGETS, SATIRE_CARTOON_BUDGETS } from '../scripts/lib/news-memes.mjs';

const DATE='2026-11-09', now=new Date(DATE+'T23:30:00Z');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhX0AAAAASUVORK5CYII=','base64');
function fixture({count=1,cartoon=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'desk-email-art-'));
 const write=(file,bytes)=>{const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);};
 for(const file of DESK_ART_PRODUCERS)write(file,fs.readFileSync(new URL('../'+file,import.meta.url)));
 const day={date:DATE,simulated:false,leadSlug:'story-0',stories:[]};
 for(let i=0;i<count;i++){
  const slug='story-'+i,id=DATE+'--'+slug,source='data/news-desk/art/'+id+'.png';
  const story={slug,headline:'Fixture headline '+i,hook:'Fixture summary',edition:'wire',stances:[],body:[{voice:'dot',text:'Fixture source text'}],memeLine:{personaId:'dot',text:'A fixture joke'},visual:{artSource:source,alt:'Fixture image',generatedArt:true,pixelInspection:{kind:'source-raster',reviewed:true,reviewer:'offline fixture',sha256:imageHash(png),entropy:6,semanticVerified:false}}};
  write(source,png);write('assets/og/news/'+id+'.png',png);
  for(const suffix of Object.keys(EDITORIAL_PANEL_BUDGETS))write('assets/og/news/'+id+'--meme'+suffix,png);
  write('assets/og/news/'+id+'--meme--640.webp',png);
  if(cartoon){
   const artSource='data/news-desk/art/'+id+'--satire.png';
   story.visual.satireCartoon={artSource,kind:'satire-cartoon',sha256:imageHash(png),reviewer:'offline fixture',semanticVerified:false,caricature:false,persona:'dot',register:'chart',caption:story.memeLine.text,alt:'AI-generated satirical cartoon showing a clearly imaginary fixture illustration for an offline article workflow test.'};
   write(artSource,png);for(const suffix of Object.keys(SATIRE_CARTOON_BUDGETS))write('assets/og/news/'+id+'--satire'+suffix,png);
  }
  day.stories.push(story);
  // Explicit mock encoder buffers for gate-unit tests. Actual encoder is
  // exercised separately below; these receipts are never production artifacts.
  for(const kind of cartoon?['banner','satire']:['banner']){
   const buffers=Object.fromEntries(articleArtOutputs(DATE,slug,kind).map(file=>[file,png]));
   for(const [file,bytes]of Object.entries(buffers))write(file,bytes);
   sealArticleArtRender(root,beginArticleArtRender(root,day,story,kind),day,story,buffers);
  }
 }
 const save=()=>write('data/news-desk/days/'+DATE+'.json',JSON.stringify(day));save();
 const inspect=()=>inspectDeskEmailArt({root,day});
 return{root,day,save,write,inspect,clean:()=>fs.rmSync(root,{recursive:true,force:true})};
}
function siteFetch(root,{status=200,mime='image/png',wrongBytes=false,throws=false,brevoStatus='none'}={}){
 const calls=[];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,method:init.method||'GET'});
  if(url.startsWith(BREVO_API)){
   if(brevoStatus==='none')throw Error('Mail provider must not be called');
   if(url.includes('/emailCampaigns?'))return new Response(JSON.stringify({campaigns:brevoStatus==='sent'?[{id:7,name:'desk-dispatch-'+DATE,status:'sent'}]:[]}),{status:200});
   if(url.endsWith('/sendNow')){if(brevoStatus==='ambiguous')throw Error('ambiguous transport');return new Response(null,{status:204});}
   return new Response(JSON.stringify(url.endsWith('/smtp/email')?{messageId:'fixture-id'}:url.endsWith('/emailCampaigns')?{id:9}:{status:'queued'}),{status:201});
  }
  assert.equal(new URL(url).origin,SITE);assert.ok(init.signal);
  if(init.method==='HEAD')return new Response(null,{status:200});
  assert.equal(init.redirect,'error');if(throws)throw Error('fixture timeout');
  const file=path.join(root,new URL(url).pathname.slice(1));
  return new Response(wrongBytes?Buffer.from('old pixels'):fs.readFileSync(file),{status,headers:{'content-type':mime}});
 };
 return{calls,fetchImpl};
}
const quiet=async fn=>{const log=console.log;console.log=()=>{};try{return await fn();}finally{console.log=log;}};

test('required reviewed banner passes without an undeclared optional cartoon',()=>{
 const f=fixture();try{assert.equal(f.inspect().ready,true);assert.deepEqual(f.inspect().rows.map(r=>r.kind),['banner']);assert.equal(deskArtGenerationCommands(f.inspect()).length,0);}finally{f.clean();}
});
for(const [name,change]of[
 ['procedural fallback',f=>{f.day.stories[0].visual.generatedArt=false;f.day.stories[0].visual.pixelInspection.kind='procedural-fallback';f.day.stories[0].visual.pixelInspection.reviewed=false;}],
 ['unreviewed',f=>f.day.stories[0].visual.pixelInspection.reviewed=false],
 ['no reviewer',f=>f.day.stories[0].visual.pixelInspection.reviewer=''],
 ['missing source',f=>fs.unlinkSync(path.join(f.root,f.day.stories[0].visual.artSource))],
 ['source hash drift',f=>f.write(f.day.stories[0].visual.artSource,Buffer.from('changed source'))],
 ['missing derivative',f=>fs.unlinkSync(path.join(f.root,'assets/og/news/'+DATE+'--story-0.png'))],
 ['unsafe source metadata',f=>f.day.stories[0].visual.artSource='../outside.png'],
])test(name+' is not email-ready',()=>{const f=fixture();try{change(f);assert.equal(f.inspect().ready,false);}finally{f.clean();}});

test('declared cartoon uses the existing optional-cartoon source and derivative contract',()=>{
 const f=fixture({cartoon:true});try{assert.equal(f.inspect().ready,true);f.day.stories[0].visual.satireCartoon.sha256='a'.repeat(64);assert.equal(f.inspect().ready,false);f.day.stories[0].visual.satireCartoon.sha256=imageHash(png);fs.unlinkSync(path.join(f.root,'assets/og/news/'+DATE+'--story-0--satire--640.webp'));assert.equal(f.inspect().ready,false);}finally{f.clean();}
});

for(const [name,options]of[['404',{status:404}],['410',{status:410}],['500',{status:500}],['challenge',{status:403}],['wrong MIME',{mime:'text/html'}],['wrong bytes',{wrongBytes:true}],['timeout',{throws:true}]])
test('live '+name+' never counts as verified art',async()=>{const f=fixture();try{const net=siteFetch(f.root,options);assert.equal((await verifyDeskEmailArt(f.inspect(),net)).ready,false);assert.equal(net.calls.length,7);}finally{f.clean();}});

test('exact served bytes verify and a later source mutation invalidates the snapshot',async()=>{
 const f=fixture();try{const before=f.inspect(),net=siteFetch(f.root);assert.equal((await verifyDeskEmailArt(before,net)).ready,true);f.write(f.day.stories[0].visual.artSource,Buffer.from('new pixels'));assert.notEqual(f.inspect().snapshot,before.snapshot);assert.equal(f.inspect().ready,false);}finally{f.clean();}
});

for(const mode of ['send','test'])test('actual '+mode+' dispatch holds fallback art before key lookup or any mail-provider call',async()=>{
 const f=fixture();try{
  f.day.stories[0].visual.generatedArt=false;f.day.stories[0].visual.pixelInspection.reviewed=false;f.day.stories[0].visual.pixelInspection.kind='procedural-fallback';f.save();
  const net=siteFetch(f.root);let keyReads=0;
  const deps={root:f.root,outDir:path.join(f.root,'output'),now,fetchImpl:net.fetchImpl,config:{autoSend:true,approvedTestIssue:DATE},get key(){keyReads++;return 'fixture';}};
  const args=mode==='send'?['--send']:['--test-to','founder@example.com'];
  const result=await quiet(()=>digest([...args,'--date',DATE,'--day-file',path.join(f.root,'data/news-desk/days/'+DATE+'.json')],deps));
  assert.equal(result.outcome,'held-art');assert.equal(keyReads,0);assert.equal(net.calls.filter(c=>c.url.startsWith(BREVO_API)).length,0);
 }finally{f.clean();}
});

test('actual dispatch holds missing/unverified image bytes instead of omitting art',async()=>{
 const f=fixture();try{const net=siteFetch(f.root,{status:403});const result=await quiet(()=>digest(['--test-to','founder@example.com','--date',DATE,'--day-file',path.join(f.root,'data/news-desk/days/'+DATE+'.json')],{root:f.root,outDir:path.join(f.root,'output'),now,key:'fixture',fetchImpl:net.fetchImpl}));assert.equal(result.outcome,'held-art');assert.equal(net.calls.filter(c=>c.url.startsWith(BREVO_API)).length,0);}finally{f.clean();}
});

test('valid actual send preserves campaign idempotency and never retries ambiguous sendNow',async()=>{
 const f=fixture();try{
  const args=['--send','--date',DATE,'--day-file',path.join(f.root,'data/news-desk/days/'+DATE+'.json')];
  const deps={root:f.root,outDir:path.join(f.root,'output'),now,key:'fixture',config:{autoSend:true,approvedTestIssue:DATE},backoffMs:0};
  let net=siteFetch(f.root,{brevoStatus:'sent'});const result=await quiet(()=>digest(args,{...deps,fetchImpl:net.fetchImpl}));assert.equal(result.outcome,'already-sent');assert.equal(net.calls.filter(c=>c.url.startsWith(BREVO_API)&&c.method!=='GET').length,0);
  net=siteFetch(f.root,{brevoStatus:'ambiguous'});await assert.rejects(quiet(()=>digest(args,{...deps,fetchImpl:net.fetchImpl})),/ambiguous/);assert.equal(net.calls.filter(c=>c.url.endsWith('/sendNow')).length,1);
 }finally{f.clean();}
});

test('default preparation is network-free preview/status; generate is explicit and required-only',async()=>{
 const f=fixture();try{
  f.day.stories[0].visual.generatedArt=false;f.day.stories[0].visual.pixelInspection.reviewed=false;f.day.stories[0].visual.pixelInspection.kind='procedural-fallback';f.save();
  const fail=()=>{throw Error('Unexpected side effect');};
  const result=await prepareDeskEmail(['--date',DATE],{root:f.root,outDir:path.join(f.root,'preview'),fetchImpl:fail,runGenerator:fail});
  assert.equal(result.outcome,'images-pending');assert.equal(result.generated,false);assert.equal(result.sendReady,false);assert.equal(result.commands.length,1);assert.equal(result.commands[0].kind,'banner');assert.deepEqual(result.commands[0].stories,[DATE+'/story-0']);assert.ok(fs.existsSync(path.join(f.root,'preview',DATE+'.html')));
  const all=deskArtGenerationCommands(f.inspect(),{kind:'all',stories:f.day.stories});assert.deepEqual(all.map(c=>c.kind),['banner','satire']);
 }finally{f.clean();}
});

test('explicit generation composes scoped worker and verifies its published artifact without changing caller',async()=>{
 const caller=fixture(),published=fixture();try{
  caller.day.stories[0].visual.generatedArt=false;caller.day.stories[0].visual.pixelInspection.reviewed=false;caller.day.stories[0].visual.pixelInspection.kind='procedural-fallback';caller.save();
  const original=fs.readFileSync(path.join(caller.root,'data/news-desk/days/'+DATE+'.json'));const runs=[];
  const result=await prepareDeskEmail(['--date',DATE,'--generate'],{root:caller.root,outDir:path.join(caller.root,'preview'),fetchImpl:siteFetch(published.root).fetchImpl,runGenerator:async command=>{runs.push(command);return{status:0,artifactRoot:published.root};}});
  assert.equal(result.sendReady,true);assert.equal(result.noEmailSent,true);assert.equal(result.artifactPlane,'art-worker-published-worktree');assert.equal(runs.length,1);assert.deepEqual(runs[0].args,['scripts/desk-art-autopilot.mjs','--kind','banner','--story',DATE+'/story-0']);assert.ok(fs.readFileSync(path.join(caller.root,'data/news-desk/days/'+DATE+'.json')).equals(original));
 }finally{caller.clean();published.clean();}
});

test('preparation help and invalid options cannot invoke generation/network or render files',async()=>{
 const f=fixture();try{const no=()=>{throw Error('Unexpected side effect');},deps={root:f.root,fetchImpl:no,runGenerator:no};assert.equal((await prepareDeskEmail(['--help'],deps)).outcome,'help');for(const args of [['--dry-run','--generate'],['--dry-run','--verify-live'],['--date','2026-02-30'],['--send'],['--kind','anything']])await assert.rejects(prepareDeskEmail(args,deps));assert.equal(fs.existsSync(path.join(f.root,'.cache/desk-email')),false);assert.equal(validDeskDate('2026-02-30'),false);assert.equal(parsePreparationArgs(['--dry-run']).generate,false);}finally{f.clean();}
});

test('explicit scope excludes every unrelated staged story and kind from the actual review queue',()=>{
 const items=[{id:DATE+'--one',kind:'banner'},{id:DATE+'--one',kind:'satire'},{id:DATE+'--two',kind:'banner'},{id:'2026-11-08--one',kind:'banner'}];
 const scope=explicitArtScope({story:DATE+'/one',kind:'banner'});
 assert.deepEqual(scopedPendingImages(items,scope),[items[0]]);
 assert.deepEqual(scopedPendingImages(items,explicitArtScope()),items);
 assert.throws(()=>explicitArtScope({story:'../outside',kind:'banner'}));assert.throws(()=>explicitArtScope({kind:'unknown'}));
 const source=fs.readFileSync(new URL('../scripts/desk-art-autopilot.mjs',import.meta.url),'utf8');
 assert.match(source,/const pending = scopedPendingImages\(pendingImages\(scope\), scope\)/);
});

test('preparation follows actual digest selection rather than repairing unrelated day stories',async()=>{
 const f=fixture({count:7});try{f.day.stories[6].visual.generatedArt=false;f.day.stories[6].visual.pixelInspection.reviewed=false;f.save();const result=await prepareDeskEmail(['--date',DATE,'--dry-run'],{root:f.root,outDir:path.join(f.root,'preview'),fetchImpl:()=>{throw Error('No network');},runGenerator:()=>{throw Error('No generation');}});assert.equal(result.localReady,true);assert.equal(result.local.selectedStories.length,6);assert.equal(result.commands.length,0);assert.equal(result.local.selectedStories.includes('story-6'),false);}finally{f.clean();}
});

test('regression witnesses expose existence-only art checks and swallowed unknown live images',async()=>{
 const f=fixture();try{
  const original=fs.readFileSync(new URL('../scripts/lib/desk-email-art.mjs',import.meta.url),'utf8');
  const rewrite=source=>source
    .replace("from './news-desk.mjs'",`from '${new URL('../scripts/lib/news-desk.mjs',import.meta.url).href}'`)
    .replace("from './desk-art-provenance.mjs'",`from '${new URL('../scripts/lib/desk-art-provenance.mjs',import.meta.url).href}'`)
    .replace("from './news-memes.mjs'",`from '${new URL('../scripts/lib/news-memes.mjs',import.meta.url).href}'`);
  const existenceOnly=original.replace('reasons.push(...validateArticleArtProof(root, day, story, kind));','')
    .replace('const errors = validateArtKindReceipt(visual, id);','const errors = [];')
    .replace("if (visual?.generatedArt !== true || visual?.pixelInspection?.reviewed !== true || visual?.pixelInspection?.kind === 'procedural-fallback') errors.push('reviewed-real-banner-required');",'');
  assert.notEqual(existenceOnly,original);const weakFile=path.join(f.root,'existence-only.mjs');fs.writeFileSync(weakFile,rewrite(existenceOnly));
  f.day.stories[0].visual.generatedArt=false;f.day.stories[0].visual.pixelInspection.reviewed=false;f.day.stories[0].visual.pixelInspection.kind='procedural-fallback';
  assert.equal(f.inspect().ready,false);const weak=await import(new URL('file:///'+weakFile.replaceAll('\\','/')));
  assert.equal(weak.inspectDeskEmailArt({root:f.root,day:f.day}).ready,true,'Existence-only mutation reproduces the unsafe readiness result');
  f.day.stories[0].visual.generatedArt=true;f.day.stories[0].visual.pixelInspection.reviewed=true;f.day.stories[0].visual.pixelInspection.kind='source-raster';
  const swallow=original.replace("catch { failures.push({ file: asset.file, reason: 'live-image-unverified-or-mismatched' }); }",'catch { /* intentionally unsafe fixture-only mutation */ }');
  assert.notEqual(swallow,original);const swallowFile=path.join(f.root,'swallowed-unknown.mjs');fs.writeFileSync(swallowFile,rewrite(swallow));const badLive=await import(new URL('file:///'+swallowFile.replaceAll('\\','/')));
  const net=siteFetch(f.root),fetchImpl=(url,init)=>url.endsWith(DATE+'--story-0.png')?Promise.resolve(new Response(null,{status:403})):net.fetchImpl(url,init);
  assert.equal((await verifyDeskEmailArt(f.inspect(),{fetchImpl})).ready,false);
  assert.equal((await badLive.verifyDeskEmailArt(f.inspect(),{fetchImpl})).ready,true,'Swallowing an unknown image reproduces a false pass');
 }finally{f.clean();}
});


test('legacy derivatives require source-preserving scoped preparation, never a redraw',()=>{
 const f=fixture({count:2,cartoon:true});try{
  fs.unlinkSync(path.join(f.root,articleArtProofPath(DATE,'story-0','banner')));
  const local=inspectDeskEmailArt({root:f.root,day:f.day,stories:[f.day.stories[0]]});
  assert.equal(local.ready,false);const commands=deskArtGenerationCommands(local);
  assert.equal(commands.length,1);assert.equal(commands[0].action,'rebuild');assert.ok(commands[0].args.includes('--prepare-only'));
  const preparation=existingArtPreparation(f.root,explicitArtScope({story:DATE+'/story-0',kind:'banner'}));
  assert.deepEqual(preparation.args,['scripts/build-news-desk.mjs','--rebuild','--refresh-art-only',DATE+'/story-0']);
  assert.equal(preparation.approved.banner.length,1);assert.equal(preparation.approved.satire.length,0);
  f.day.stories[0].visual.pixelInspection.reviewed=false;f.save();
  assert.throws(()=>existingArtPreparation(f.root,explicitArtScope({story:DATE+'/story-0',kind:'banner'})),/reviewed source/);
  assert.throws(()=>existingArtPreparation(f.root,explicitArtScope()),/explicit/);
 }finally{f.clean();}
});

for(const [name,mutate]of[
 ['source',f=>f.write(f.day.stories[0].visual.artSource,Buffer.from('changed source'))],
 ['story',f=>f.day.stories[0].headline+=' changed'],
 ['producer',f=>f.write('scripts/lib/desk-article-art.mjs',Buffer.from('changed producer'))],
 ['derivative',f=>f.write('assets/og/news/'+DATE+'--story-0.png',Buffer.from('changed derivative'))],
])test('render provenance rejects independent '+name+' mutation',()=>{const f=fixture();try{mutate(f);assert.equal(f.inspect().ready,false);assert.ok(validateArticleArtProof(f.root,f.day,f.day.stories[0],'banner').length);}finally{f.clean();}});

test('actual encoder seals fresh source-bound buffers and replaces stale mobile siblings without redrawing source',async()=>{
 const f=fixture();try{
  const story=f.day.stories[0],before=fs.readFileSync(path.join(f.root,story.visual.artSource));
  f.write('assets/og/news/'+DATE+'--story-0--meme--640.webp',Buffer.from('stale mobile'));
  fs.unlinkSync(path.join(f.root,articleArtProofPath(DATE,story.slug,'banner')));
  assert.equal(f.inspect().ready,false);
  await renderArticleArt(f.root,f.day,story,'banner');
  assert.deepEqual(validateArticleArtProof(f.root,f.day,story,'banner'),[]);
  assert.ok(before.equals(fs.readFileSync(path.join(f.root,story.visual.artSource))));
  const sharp=(await import('sharp')).default;
  assert.equal((await sharp(fs.readFileSync(path.join(f.root,'assets/og/news/'+DATE+'--story-0--meme--640.webp'))).metadata()).width,640);
  assert.equal(f.inspect().ready,true);
 }finally{f.clean();}
});


test('stale served AVIF holds even when social PNG and WebP match',async()=>{
 const f=fixture();try{
  const net=siteFetch(f.root),fetchImpl=(url,init)=>url.endsWith('--640.avif')?Promise.resolve(new Response(Buffer.from('stale AVIF'),{status:200,headers:{'content-type':'image/avif'}})):net.fetchImpl(url,init);
  const result=await verifyDeskEmailArt(f.inspect(),{fetchImpl});
  assert.equal(result.ready,false);assert.ok(result.failures.some(row=>row.file.endsWith('--640.avif')));
 }finally{f.clean();}
});


test('real ingest planner excludes malformed unrelated staged PNG before decoding, independently of approval filtering',async()=>{
 const f=fixture({count:2});try{
  const selected=DATE+'--story-0',other=DATE+'--story-1',from=path.join(f.root,'staging');
  f.write('staging/'+selected+'/art.png',png);
  f.write('staging/'+other+'/art.png',Buffer.from('malformed unrelated staged PNG'));
  const reviewed=parseReviewed(selected+'@'+imageHash(png));
  await assert.rejects(planIngest({root:f.root,from,reviewed}),/unsupported image|corrupt|invalid/i);
  const scope=explicitArtScope({story:DATE+'/story-0',kind:'banner'});
  const {parseArgs}=await import('../scripts/ingest-news-art.mjs');
  const only=parseArgs(ingestScopeArgs(scope)).only;
  const plan=await planIngest({root:f.root,from,reviewed,only});
  assert.deepEqual(plan.rejected.map(row=>row.id),[selected]);
  assert.match(plan.rejected[0].reason,/too small/);
  assert.equal([...plan.accepted,...plan.skipped,...plan.rejected].some(row=>row.id===other),false);
 }finally{f.clean();}
});

test('pending scans pass story scope before native validation, skip other kinds and reject child failure',()=>{
 const scope=explicitArtScope({story:DATE+'/story-0',kind:'banner'}),calls=[];
 const runNode=(...args)=>{calls.push(args);return{status:0,out:'✓ valid '+DATE+'--story-0 1200x630 [NOT YET REVIEWED]'};};
 assert.equal(pendingImages(scope,{runNode,staging:'fixture-stage'}).length,1);
 assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(-2),['--story',DATE+'--story-0']);assert.equal(calls[0].includes('satire'),false);
 assert.throws(()=>pendingImages(scope,{runNode:()=>({status:1,out:''}),staging:'fixture-stage'}),/validation failed/);
 const all=[];pendingImages(explicitArtScope(),{runNode:(...args)=>{all.push(args);return{status:0,out:''};},staging:'fixture-stage'});
 assert.equal(all.length,2);assert.equal(all.some(args=>args.includes('--story')),false);
 const source=fs.readFileSync(new URL('../scripts/desk-art-autopilot.mjs',import.meta.url),'utf8');
 assert.match(source,/'--from', STAGING\(\), \.\.\.ingestScopeArgs\(scope\), '--reviewed'/);
});
