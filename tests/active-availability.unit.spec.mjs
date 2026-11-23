import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import assert from 'node:assert/strict';import {test} from 'node:test';
const dir=process.cwd(),proposed=dir;
const {activeAvailabilityConflicts,ACTIVE_AVAILABILITY_FILES}=await import(new URL('../scripts/lib/active-availability.mjs',import.meta.url));
const availability=JSON.parse(fs.readFileSync('api/public-intelligence.json','utf8')).availability;
async function renderTrust(source,context,mode,state={}){
 const root={dataset:{trustContext:context},innerHTML:''},events={};
 const intel={stats:{activeEdgeFunctions:987,liveProjects:3,projectsInForge:17},availability:mode===undefined?undefined:{signup:{mode}}};
 const document={readyState:'complete',querySelectorAll:()=>[root],addEventListener:(k,v)=>events[k]=v};
 const window={location:{pathname:'/'},VSPublicIntel:{get:()=>Promise.resolve(intel)},VSIntentState:{getState:()=>state,noteExposure(){}}};
 vm.runInNewContext(source,{window,document},{timeout:1000});await new Promise(r=>setImmediate(r));return {root,events,intel};
}
for(const context of ['home','membership','invite'])for(const mode of ['invitation','open','closed',undefined,'unknown','toString','constructor','__proto__',null,42])test('actual lazy trust render '+context+' '+mode,async()=>{
 const source=fs.readFileSync(path.join(proposed,'assets/trust-depth.js'),'utf8'),{root}=await renderTrust(source,context,mode,{membership_temperature:'hot',intent:'lore'});
 assert.ok(root.innerHTML.includes('trust-depth-card'));assert.doesNotMatch(root.innerHTML,/987|already power|world access begin|every title|recognizing you|support \+ priority tiers/);
 if(['home','membership','invite'].includes(context))assert.match(root.innerHTML,new RegExp(mode==='invitation'?'opened by invitation':mode==='open'?'currently open\\.':mode==='closed'?'currently closed':'See the membership page for current website enrollment'));
});
test('actual rerender follows changed authority, not returning/referral hints',async()=>{const {root,events,intel}=await renderTrust(fs.readFileSync(path.join(proposed,'assets/trust-depth.js'),'utf8'),'membership','invitation',{returning_status:'returning',referral_active:true});assert.match(root.innerHTML,/opened by invitation/);intel.availability.signup.mode='closed';events['vs:intent-state-change']();await new Promise(r=>setImmediate(r));assert.match(root.innerHTML,/currently closed/);});
test('mutation guard catches concrete dynamic copy and preserves historical/fiction scope',()=>{for(const bad of ['16 backend services already power the member layer','Early access to everything we build next','Your account ties your journey across every title'])assert.ok(activeAvailabilityConflicts('assets/trust-depth.js',bad,availability).length);assert.deepEqual(activeAvailabilityConflicts('news/2026-03-01/index.html','No invitation is needed',availability),[]);assert.deepEqual(activeAvailabilityConflicts('studio/index.html','Characters bleed between worlds. Lore threads connect across games.',availability),[]);});
for(const state of [{pathway:'player'},{pathway:'member'},{pathway:'lore'},{pathway:'supporter'},{referral_active:true},{hesitation_signal:'price_unsure'}])test('actual adaptive account route stays neutral '+JSON.stringify(state),()=>{
 const el={dataset:{adaptiveCta:state.hesitation_signal?'membership':'account',adaptiveNoteTarget:'note'},setAttribute(k,v){this[k]=v}},note={},events={};
 const window={location:{pathname:'/membership/'},VSIntentState:{getState:()=>state}};
 const document={addEventListener:(k,v)=>events[k]=v,querySelectorAll:()=>[el],getElementById:()=>note};
 vm.runInNewContext(fs.readFileSync(path.join(proposed,'assets/adaptive-cta.js'),'utf8'),{window,document},{timeout:1000});events.DOMContentLoaded();
 assert.equal(el.href,'/membership/');assert.equal(el.innerHTML,'See website membership');assert.match(note.textContent,/Check current website enrollment/);
});
test('actual adaptive signed-in portal navigation is preserved',()=>{const el={dataset:{adaptiveCta:'account'},setAttribute(k,v){this[k]=v}},events={};const window={location:{pathname:'/membership/'},VSIntentState:{getState:()=>({logged_in:true,referral_active:true})}},document={addEventListener:(k,v)=>events[k]=v,querySelectorAll:()=>[el]};vm.runInNewContext(fs.readFileSync(path.join(proposed,'assets/adaptive-cta.js'),'utf8'),{window,document},{timeout:1000});events.DOMContentLoaded();assert.equal(el.href,'/vault-member/');assert.equal(el.innerHTML,'Open Your Vault');});
test('actual related Membership selected-member card points to current enrollment info',()=>{const root={dataset:{relatedContext:'membership',relatedLimit:4},innerHTML:''};const window={location:{pathname:'/'},VSIntentState:{getState:()=>({pathway:'member'}),noteExposure(){}}},document={readyState:'complete',querySelectorAll:()=>[root],addEventListener(){}};vm.runInNewContext(fs.readFileSync(path.join(proposed,'assets/related-content.js'),'utf8'),{window,document},{timeout:1000});assert.match(root.innerHTML,/Check current enrollment/);assert.doesNotMatch(root.innerHTML,/vault-member\/#register|Free account, live rank/);});
test('actual milestone render never converts sparked services into playable worlds or access promises',async()=>{const root={innerHTML:''},window={VSPublicIntel:{get:()=>Promise.resolve({stats:{liveProjects:3},portfolio:{forge:17}})}},document={readyState:'complete',querySelector:()=>root};vm.runInNewContext(fs.readFileSync(path.join(proposed,'assets/studio-milestones.js'),'utf8'),{window,document},{timeout:1000});await new Promise(r=>setImmediate(r));assert.match(root.innerHTML,/3 projects marked live/);assert.doesNotMatch(root.innerHTML,/3 worlds playable|members see each one first|Every sealed world eventually/);});


 test('actual Home catalog copy points visitors to release and access details',async()=>{const {root}=await renderTrust(fs.readFileSync(path.join(proposed,'assets/trust-depth.js'),'utf8'),'home','invitation');assert.match(root.innerHTML,/3 projects are marked live in the public catalog and 17 are in development\. Each project page lists its current release and access details\./);assert.doesNotMatch(root.innerHTML,/source inventory|verify deployed backend|987 backend/);});

const canonicalTiers=JSON.parse(fs.readFileSync('api/membership-tiers.json','utf8'));
test('all actual active consumers agree with canonical authority after integration',()=>{
 for(const file of ACTIVE_AVAILABILITY_FILES)assert.deepEqual(activeAvailabilityConflicts(file,fs.readFileSync(file,'utf8'),availability,canonicalTiers),[],file);
});
test('Membership shared header keeps shared identity doors separate from enrollment',()=>{
 const header=fs.readFileSync('membership/index.html','utf8').match(/<header\b[\s\S]*?<\/header>/)?.[0];assert.ok(header);
 function assertIdentityDoors(source){
   const doors=[...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m=>/\bdata-vs-join(?:\s|$|=)/.test(m[1])||/^Create\s+Account$/i.test(m[2].replace(/<[^>]+>/g,'').trim()));
   assert.ok(doors.length>0,'shared identity door is present');
   for(const door of doors){assert.equal(door[1].match(/\bhref="([^"]*)"/)?.[1],'/vault-member/#register','shared identity door must not become website invitation');}
 }
 assertIdentityDoors(header);
 assert.throws(()=>assertIdentityDoors(header.replace('href="/vault-member/#register"','href="/invite/"')));
 assertIdentityDoors(header.replace('</header>','<a href="/trust/">Trust</a></header>'));
});
test('active Membership headings and next step stay qualified',()=>{const source=fs.readFileSync('membership/index.html','utf8');assert.match(source,/Membership and Project Access/);assert.match(source,/Find Your<br>Place in the Vault/);assert.match(source,/Check current website enrollment and the profile features/);assert.deepEqual(activeAvailabilityConflicts('membership/index.html',source,availability,canonicalTiers),[]);});
test('active Projects universal early access heading is rejected',()=>{const source=fs.readFileSync('projects/index.html','utf8');assert.match(source,/Explore Website Membership/);assert.deepEqual(activeAvailabilityConflicts('projects/index.html',source,availability,canonicalTiers),[]);assert.ok(activeAvailabilityConflicts('projects/index.html',source.replace('Explore Website Membership','Get Early Access to Everything We Ship'),availability,canonicalTiers).length);});
test('each original Membership heading/next-step claim is independently rejected',()=>{for(const bad of ['One membership. Every world.','The Vault<br>Is Open.','Free to join','Open a free account first'])assert.ok(activeAvailabilityConflicts('membership/index.html',bad,availability,canonicalTiers).length,bad);});
test('Member Benefits equals exactly the existing canonical five free perks',()=>{const source=fs.readFileSync('vault-member/index.html','utf8');assert.deepEqual(activeAvailabilityConflicts('vault-member/index.html',source,availability,canonicalTiers),[]);const list=source.match(/<h4>Member Benefits<\/h4>\s*<ul class="benefit-list">([\s\S]*?)<\/ul>/)[1];assert.equal([...list.matchAll(/<li>/g)].length,5);for(const bad of ['Early access to new builds and beta invites','Exclusive lore dispatches and character reveals','First signal when sealed projects break containment'])assert.ok(activeAvailabilityConflicts('vault-member/index.html',source.replace(list,list+'<li>'+bad+'</li>'),availability,canonicalTiers).length);assert.ok(activeAvailabilityConflicts('vault-member/index.html',source,availability).length);});
test('milestones horizon stays positive and does not promise blanket access',async()=>{const root={innerHTML:''},window={VSPublicIntel:{get:()=>Promise.resolve({})}},document={readyState:'complete',querySelector:()=>root};vm.runInNewContext(fs.readFileSync('assets/studio-milestones.js','utf8'),{window,document},{timeout:1000});await new Promise(r=>setImmediate(r));assert.match(root.innerHTML,/Follow project pages for announced releases and access updates/);assert.doesNotMatch(root.innerHTML,/Unannounced projects do not imply/);});

for(const mode of ['open','closed',undefined,null,'unknown','toString'])test('static invitation HTML refuses changed or missing authority '+mode,()=>{const source=fs.readFileSync('membership/index.html','utf8'),changed={...availability,signup:{...availability.signup,mode}};assert.ok(activeAvailabilityConflicts('membership/index.html',source,changed,canonicalTiers).length);});
test('current static invitation copy agrees with actual canonical authority',()=>{assert.equal(availability.signup.mode,'invitation');assert.deepEqual(activeAvailabilityConflicts('membership/index.html',fs.readFileSync('membership/index.html','utf8'),availability,canonicalTiers),[]);});
test('rank projector is an active guarded neutral CTA consumer',()=>{const source=fs.readFileSync('assets/rank-projector.js','utf8');assert.deepEqual(activeAvailabilityConflicts('assets/rank-projector.js',source,availability,canonicalTiers),[]);for(const bad of ['<a href="/vault-member/#register" class="vs-rp__cta">Start Climbing — It\'s Free</a>','<a href="/membership/" class="vs-rp__cta">Start Climbing — It\'s Free</a>']){const mutated=source.replace(/<a\s[^>]*class="vs-rp__cta"[^>]*>[\s\S]*?<\/a>/,bad);assert.ok(activeAvailabilityConflicts('assets/rank-projector.js',mutated,availability,canonicalTiers).length);}});

test('rank projector guard accepts harmless tracking attributes and formatting',()=>{const source=fs.readFileSync('assets/rank-projector.js','utf8'),formatted=source.replace(/<a\s[^>]*class="vs-rp__cta"[^>]*>[\s\S]*?<\/a>/,'<a data-track-event="projector_membership" class="extra vs-rp__cta" href="/membership/">  See current <span>website</span> membership  </a>');assert.notEqual(formatted,source);assert.deepEqual(activeAvailabilityConflicts('assets/rank-projector.js',formatted,availability,canonicalTiers),[]);assert.ok(activeAvailabilityConflicts('assets/rank-projector.js',formatted.replace('href="/membership/"','href="/invite/"'),availability,canonicalTiers).length);});
test('missing or null enrollment authority returns conflicts without throwing',()=>{const source=fs.readFileSync('membership/index.html','utf8');for(const missing of [undefined,null,{}, {signup:undefined},{signup:null},{signup:{}}]){let conflicts;assert.doesNotThrow(()=>{conflicts=activeAvailabilityConflicts('membership/index.html',source,missing,canonicalTiers);});assert.ok(conflicts.length);}});

// S418 status/count/privacy renderer regressions.
{
const actualIntel=JSON.parse(fs.readFileSync('api/public-intelligence.json','utf8')),tiers=JSON.parse(fs.readFileSync('api/membership-tiers.json','utf8'));
// Explicit mixed renderer fixture: distinct counts test field selection without
// requiring a future real catalog to retain today's distribution or project mix.
const intel={...actualIntel,stats:{...actualIntel.stats,liveProjects:2,projectsInForge:1},portfolio:{...actualIntel.portfolio,sparked:2,forge:1,vaulted:7,sealedCount:11,total:21},catalog:[
 {id:'fixture-platform',name:'Fixture platform',type:'platform',status:'SPARKED'},
 {id:'fixture-game',name:'Fixture game',type:'game',status:'SPARKED'},
 {id:'fixture-forge',name:'Fixture forge',type:'game',status:'FORGE'},
 ...Array.from({length:7},(_,i)=>({id:'fixture-vaulted-'+i,name:'Fixture archived '+i,type:'game',status:'VAULTED'}))
]};
class Node {constructor(tag='div'){this.tag=tag;this.children=[];this.style={setProperty(k,v){this[k]=v;}};this.attrs={};this.textContent='';this.innerHTML='';}appendChild(n){this.children.push(n);return n;}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}get firstChild(){return this.children[0];}removeChild(n){this.children.splice(this.children.indexOf(n),1);} }
function read(file){return fs.readFileSync(file,'utf8');}
function harness(file,names){const nodes=new Map();const document={head:new Node('head'),readyState:'loading',getElementById:id=>nodes.get(id)||null,createElement:tag=>new Node(tag),createTextNode:text=>Object.assign(new Node('#text'),{textContent:text}),addEventListener(){}};
 // Test-only closure observation: exported functions retain their actual source
 // bodies. No renderer statement, input or branch is rewritten.
 const source=read(file),suffix=source.lastIndexOf('})();');assert.ok(suffix>0);const observed=source.slice(0,suffix)+'globalThis.__probe={'+names.join(',')+'};\n'+source.slice(suffix);const context={document,window:{},Date};vm.runInNewContext(observed,context,{timeout:1000});return {api:context.__probe,nodes,mount(id){const n=new Node();nodes.set(id,n);return n;}};
}
function text(node){return [node.textContent,...node.children.map(text)].join(' ');}
test('actual public-intelligence counts agree with its actual catalog statuses',()=>{assert.equal(actualIntel.portfolio.vaulted,actualIntel.catalog.filter(p=>p.status==='VAULTED').length);assert.equal(actualIntel.portfolio.sparked,actualIntel.catalog.filter(p=>p.status==='SPARKED').length);});
test('scoreboard selects the named Vaulted field from explicit distinct sentinels and labels its snapshot',()=>{const {api}=harness('assets/honest-traction-scoreboard.js',['figuresFrom','render']);const rows=api.figuresFrom(intel);assert.equal(rows.find(x=>x.label==='vaulted').v,7);assert.notEqual(rows.find(x=>x.label==='vaulted').v,11);const root=new Node();api.render(root,rows,'2030-04-05','today');const footer=root.children[0].children.find(n=>n.className==='vs-traction__meta').children[0].innerHTML;assert.match(footer,/as of 2030-04-05/);assert.match(footer,/current catalog snapshot/);assert.doesNotMatch(footer,/every number is live/);});
test('missing/zero Vaulted does not inherit anonymous count or obsolete vaultedCount',()=>{const {api}=harness('assets/honest-traction-scoreboard.js',['figuresFrom']);for(const value of [undefined,null,0]){const rows=api.figuresFrom({...intel,portfolio:{...intel.portfolio,vaulted:value,vaultedCount:99,sealedCount:77}});assert.ok(!rows.some(x=>x.label==='vaulted'));}});
test('actual heartbeat renders distinct current status and private inventory counts',()=>{const h=harness('assets/studio-pulse-live.js',['renderHeartbeat']),root=h.mount('forge-heartbeat');h.api.renderHeartbeat(intel.portfolio);assert.match(root.innerHTML,new RegExp('<strong>'+intel.portfolio.sparked+'</strong><span>Sparked projects'));assert.match(root.innerHTML,new RegExp('<strong>'+intel.portfolio.vaulted+'</strong><span>Vaulted projects'));assert.match(root.innerHTML,new RegExp('<strong>'+intel.portfolio.sealedCount+'</strong><span>Unannounced initiatives'));assert.doesNotMatch(root.innerHTML,/Playable now|Vaulted in the deep/);});
test('actual catalog cards preserve all catalog records and status filters without platform playable labels',()=>{const h=harness('assets/studio-pulse-live.js',['renderCatalogGrid']),root=h.mount('cards');h.api.renderCatalogGrid('cards',intel.catalog);assert.equal(root.children.length,intel.catalog.length);for(const [i,node]of root.children.entries()){const item=intel.catalog[i];assert.match(text(node),new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));if(item.status==='SPARKED'){assert.match(text(node),/SPARKED — LIVE/);assert.doesNotMatch(node.attrs['aria-label'],/PLAYABLE NOW/);}assert.match(node.className,new RegExp(item.status==='SPARKED'?'tone-sparked':item.status==='FORGE'?'tone-forge':'tone-vaulted'));}});
test('actual Studio privacy grid retains only anonymous count, no status/access promise',()=>{const h=harness('assets/studio-pulse-live.js',['renderSealedVault']),root=h.mount('forge-sealed-grid'),caption=h.mount('forge-sealed-caption');h.api.renderSealedVault({...intel.portfolio,privateName:'DO_NOT_EXPOSE'});assert.equal((root.innerHTML.match(/forge-sealed-tile"/g)||[]).length,intel.portfolio.sealedCount);assert.match(root.innerHTML,/UNANNOUNCED/);assert.doesNotMatch(root.innerHTML+caption.innerHTML,/VAULTED|hear first|DO_NOT_EXPOSE/);});
for(const context of ['games','projects','default'])test('actual '+context+' shared privacy row uses plain human copy and anonymous tiles',()=>{const h=harness('assets/sealed-vault-row.js',['render']),root=new Node();root.setAttribute('data-sealed-vault-context',context);h.api.render(root,{...intel.portfolio,privateName:'DO_NOT_EXPOSE'});const wrap=root.children[0],caption=wrap.children.find(n=>n.className==='vs-sealed-caption'),grid=wrap.children.find(n=>n.className==='vs-sealed-grid');assert.match(caption.textContent,new RegExp('^'+intel.portfolio.sealedCount+' more initiatives'));assert.doesNotMatch(text(root),/<strong>|<\/strong>|Vaulted|hear first|DO_NOT_EXPOSE/);assert.equal(grid.children.length,intel.portfolio.sealedCount);assert.ok(grid.children.every(n=>n.innerHTML.includes('UNANNOUNCED')&&!n.innerHTML.includes('VAULTED')));});
test('coherence guards pass actual proposed sources and reject exact old count/access statements',()=>{for(const file of ['assets/studio-pulse-live.js','assets/honest-traction-scoreboard.js','assets/sealed-vault-row.js','studio/index.html'])assert.deepEqual(activeAvailabilityConflicts(file,read(file),intel.availability,tiers),[],file);for(const [file,bad]of [['assets/studio-pulse-live.js',"statTile(portfolio.sealedCount, 'Vaulted in the deep', 'sealed')"],['assets/studio-pulse-live.js',"SPARKED: { label: 'PLAYABLE NOW' }"],['assets/honest-traction-scoreboard.js','var vaulted=n(p.sealedCount);'],['assets/sealed-vault-row.js',"heading: 'More tools still vaulted.'"],['assets/sealed-vault-row.js',"body: '<strong>' + count"],['studio/index.html','Vault Members hear first']])assert.ok(activeAvailabilityConflicts(file,bad,intel.availability,tiers).length,file+bad);});
test('static Studio privacy labels and FAQ agree while shared identity header stays preserved',()=>{const source=read('studio/index.html');assert.match(source,/Loading unannounced initiative count/);assert.match(source,/<div\b[^>]*>\s*Unannounced\s*<\/div>/);assert.match(source,/explore <a href="\/membership\/">current website membership/);assert.doesNotMatch(source,/Vault Members hear first|create a free Vault Member account/);});

}


// S418 actual working-pixel follow-through: scoped current website facts.
test('Studio stack and visible FAQ avoid universal game hosting claims',()=>{
 const source=fs.readFileSync('studio/index.html','utf8');
 function assertScope(html){
   const stack=html.match(/<section\b[^>]*\bid="stack"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';
   const faq=html.match(/<h3>How does VaultSpark Studios make games\?<\/h3>\s*<p>([\s\S]*?)<\/p>/)?.[1]||'';
   assert.ok(stack&&faq,'actual current sections present');
   assert.doesNotMatch(stack,/All games and the studio site|Each game lives at its own path|hosts all game backends/);
   assert.doesNotMatch(faq,/deployed through Cloudflare Pages to the studio.s custom domain|Every game ships to the browser/);
   assert.match(stack,/This studio website is served through Cloudflare Pages/);
   assert.match(stack,/For this website, a Cloudflare Worker/);
 }
 assertScope(source);
 for(const bad of ['All games and the studio site','Each game lives at its own path','hosts all game backends'])assert.throws(()=>assertScope(source.replace('This studio website is served through Cloudflare Pages',bad)));
 assert.throws(()=>assertScope(source.replace('<p>VaultSpark Studios builds web-first products','<p>Every game ships to the browser')));
});
test('Studio visible game-making FAQ equals its existing structured answer',()=>{
 const source=fs.readFileSync('studio/index.html','utf8'),visible=source.match(/<h3>How does VaultSpark Studios make games\?<\/h3>\s*<p>([\s\S]*?)<\/p>/)[1];let answer;
 function walk(x){if(!x||typeof x!=='object')return;if(x.name==='How does VaultSpark Studios make games?')answer=x.acceptedAnswer.text;for(const v of Object.values(x))if(typeof v==='object')Array.isArray(v)?v.forEach(walk):walk(v);}
 for(const m of source.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g))walk(JSON.parse(m[1]));assert.equal(visible,answer);
});
test('Forge source note keeps its concept identity without a conflicting Vaulted status',()=>{
 const generator=fs.readFileSync('scripts/generate-public-intelligence.mjs','utf8'),note=generator.match(/'vaultspark-forge':\s*'([^']*)'/)?.[1];
 function assertNote(value){assert.ok(value?.includes('Crafting-and-building world in early concept.'));assert.doesNotMatch(value,/\bvaulted\b/i);}
 assertNote(note);assert.throws(()=>assertNote(note+' Vaulted silhouette for now.'));
});
test('Studio light anonymous count uses theme-readable text and preserves dark blue',()=>{
 const source=fs.readFileSync('studio/index.html','utf8');
 assert.match(source,/body\.light-mode\s+\.forge-sealed-caption strong\s*\{\s*color:var\(--text\)/);
 assert.match(source,/(?:^|\n)\s*\.forge-sealed-caption strong\s*\{\s*color:#7EC9FF/);
});


// Canonical rank display follow-through: execute actual consumer functions.
{
const config=JSON.parse(fs.readFileSync('config/membership-entitlements.json','utf8'));
function authorityFor(c){const context={};vm.runInNewContext(fs.readFileSync('assets/membership-access.js','utf8'),context);context.VSMembership.config.rankThresholds=[...c.rankThresholds];context.VSMembership.config.ranks=c.ranks.map(r=>({...r}));return context.VSMembership;}
function probe(file,names,authority,extras={}){const source=fs.readFileSync(file,'utf8'),end=source.lastIndexOf('})();');assert.ok(end>0);const window={VSMembership:authority,VSPublic:{from(){return {select(){return this;},eq(){return this;},count(){return this;},get(){return new Promise(()=>{});}};}},...extras.window};const document={head:{appendChild(){}},createElement(){return {};},readyState:'loading',addEventListener(){},querySelectorAll(){return [];},...extras.document};const context={...extras,window,document,Promise,location:extras.location||{pathname:'/membership/'},console};vm.runInNewContext(source.slice(0,end)+'globalThis.__probe={'+names.join(',')+'};\n'+source.slice(end),context,{timeout:1000});return context.__probe;}
for(const variant of ['actual','shifted'])test('member displays use canonical boundary authority '+variant,()=>{
 const c=structuredClone(config);if(variant==='shifted')c.rankThresholds=c.rankThresholds.map((n,i)=>i?n+i*13:n);
 const authority=authorityFor(c),proof=probe('assets/live-proof.js',['pointsToRankTitle'],authority),bar=probe('assets/vault-rank-bar.js',['getRankProgress'],authority);
 for(let i=0;i<c.ranks.length;i++)for(const points of [c.rankThresholds[i],...(i?[c.rankThresholds[i]-1]:[])]){
   const expected=authority.getRankIndex(points);assert.equal(proof.pointsToRankTitle(points),c.ranks[expected].label);
   const actual=bar.getRankProgress(points);assert.equal(actual.rank,c.ranks[expected].label);assert.equal(actual.maxed,expected===c.ranks.length-1);
   if(!actual.maxed){assert.equal(actual.next,c.ranks[expected+1].label);assert.equal(actual.pct,Math.round((points-c.rankThresholds[expected])/(c.rankThresholds[expected+1]-c.rankThresholds[expected])*100));}
 }
});
test('rank bar rejects cache computed for another canonical authority',()=>{const source=fs.readFileSync('assets/vault-rank-bar.js','utf8');assert.match(source,/cached\.authorityKey === authorityKey/);assert.match(source,/authority\.config\.version, authority\.config\.rankThresholds, authority\.config\.ranks/);assert.doesNotMatch(source,/var RANK_THRESHOLDS =/);});
test('rank bar actually refetches stale scale cache and reuses exact authority cache',async()=>{
 const authority=authorityFor(config),key=JSON.stringify([authority.config.version,authority.config.rankThresholds,authority.config.ranks]);
 for(const authorityKey of ['old-50-point-scale',key]){let queries=0;const api=probe('assets/vault-rank-bar.js',['fetchAndRender'],authority,{sessionStorage:{getItem(){return JSON.stringify({userId:'fixture-owner',authorityKey});}},window:{VSSupabase:{from(){queries++;return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}};}}}});await api.fetchAndRender('fixture-owner');assert.equal(queries,authorityKey===key?0:1);}
});
test('missing canonical authority suppresses member-rank query rather than guessing',async()=>{
 let queries=0;const api=probe('assets/vault-rank-bar.js',['fetchAndRender','membershipReady'],undefined,{window:{VSSupabase:{from(){queries++;throw Error('must not query');}}}});await assert.rejects(api.membershipReady);await api.fetchAndRender('fixture-owner');assert.equal(queries,0);
});
test('actual member fetch computes velocity to canonical next threshold',async()=>{
 const authority=authorityFor(config);let saved;
 const node=()=>({style:{},classList:{add(){}},setAttribute(){}});
 const api=probe('assets/vault-rank-bar.js',['fetchAndRender'],authority,{location:{pathname:'/'},requestAnimationFrame(fn){fn();},sessionStorage:{getItem(){return null;},setItem(k,v){saved=JSON.parse(v);}},document:{body:{appendChild(){}},createElement:node},window:{VSSupabase:{from(table){assert.equal(table,'vault_members');return {select(fields){assert.equal(fields,'points, created_at');return this;},eq(field,id){assert.equal(field,'id');assert.equal(id,'fixture-owner');return this;},async maybeSingle(){return {data:{points:100,created_at:new Date(Date.now()-10*86400000).toISOString()}};}};}}}});
 await api.fetchAndRender('fixture-owner');assert.ok(saved);assert.equal(saved.rank,'Spark Initiate');assert.equal(saved.next,'Vault Runner');assert.equal(saved.pct,40);assert.equal(saved.weeksToNext,3);
});
test('local simulator has no duplicate rank scale and uses canonical thresholds',()=>{
 const source=fs.readFileSync('assets/rank-economy-simulator.js','utf8'),data=JSON.parse(fs.readFileSync('data/rank-economy.json','utf8'));assert.equal(data.ranks,undefined);assert.match(source,/Hypothetical action estimates against current website rank thresholds/);assert.doesNotMatch(source,/data\.ranks/);
 const authority=authorityFor(config),api=probe('assets/rank-economy-simulator.js',['mount'],authority),nodes={};let listener;
 const root={innerHTML:'',querySelector(selector){return nodes[selector]||=(selector==='.vs-rank-sim__out'?{innerHTML:''}:{value:0,max:999});},addEventListener(name,fn){listener=fn;}};
 api.mount(root,data,authority);assert.match(nodes['.vs-rank-sim__out'].innerHTML,/Next: Vault Runner at 250/);
 nodes['[data-rank-action="playSessions"]'].value=32;listener();assert.match(nodes['.vs-rank-sim__out'].innerHTML,/Rank: Vault Runner/);assert.match(nodes['.vs-rank-sim__out'].innerHTML,/Next: Rift Scout at 1,000/);
});
}

// Proposed append to existing tests/active-availability.unit.spec.mjs (fs/vm/assert/test already imported).
async function renderHomeSnapshot(order,{piFailure=false,recordedAt='2026-11-01T00:00:00Z',pulse=[]}={}){
 const slots=Object.fromEntries(['pulse','active','pulses','proof','oracle'].map(k=>[k,{textContent:k==='active'?'3':k==='pulses'?'17':''}])),pending={};
 const document={querySelector:()=>({querySelector:s=>slots[s.match(/data-spine-(\w+)/)?.[1]]||null})};
 const fetch=url=>new Promise((resolve,reject)=>{pending[url]={resolve,reject};});
 vm.runInNewContext(fs.readFileSync('assets/showcase-spine.js','utf8'),{document,fetch},{timeout:1000});
 const feeds={pi:{portfolio:{sparked:4,forge:22},pulse:{now:pulse},ecosystem:{listingMetadata:{tagline:'Studio OS migration and Discord live',canonicalSummary:'stale forecast'}}},proof:{generatedAt:recordedAt,summary:{fresh:2,feeds:3,trustScore:99,worstStale:{key:'older-feed',ageSeconds:7200},seedRisk:[]},proofs:{'public-status':{data:{studio:{sparked:999,forge:888}}}}}};
 for(const kind of order){const item=pending[kind==='pi'?'/api/public-intelligence.json':'/api/status-proof.json'];if(kind==='pi'&&piFailure)item.reject(Error('unavailable'));else item.resolve({ok:true,json:()=>Promise.resolve(feeds[kind])});await new Promise(r=>setImmediate(r));}
 return slots;
}
for(const order of [['pi','proof'],['proof','pi']])test('Home snapshot keeps public-intelligence count authority in '+order.join(' then '),async()=>{
 const r=await renderHomeSnapshot(order);assert.equal(r.active.textContent,'4');assert.equal(r.pulses.textContent,'22');
 assert.match(r.proof.textContent,/2\/3 proofs recorded fresh/);assert.match(r.proof.textContent,/recorded 2026-11-01T00:00:00\.000Z/);assert.match(r.proof.textContent,/2h at recording/);assert.doesNotMatch(r.proof.textContent,/trust 99|manifest live/);
 assert.equal(r.pulse.textContent,'No recent public dispatch is recorded here. Read the Signal Log.');assert.equal(r.oracle.textContent,'Read the public studio overview and recorded status.');assert.doesNotMatch(r.pulse.textContent+r.oracle.textContent,/migration|Discord live|stale forecast/);
});
test('Home snapshot failed count feed retains static count authority and invalid proof time is unknown',async()=>{
 const r=await renderHomeSnapshot(['proof','pi'],{piFailure:true,recordedAt:'invalid'});assert.equal(r.active.textContent,'3');assert.equal(r.pulses.textContent,'17');assert.match(r.proof.textContent,/recording timestamp unavailable/);assert.doesNotMatch(r.proof.textContent,/999|888|trust/);
});
test('Home snapshot real pulse survives and source generator preserves snapshot labels',async()=>{
 const r=await renderHomeSnapshot(['pi','proof'],{pulse:['Recorded public release note']});assert.equal(r.pulse.textContent,'Recorded public release note');
 const source=fs.readFileSync('scripts/derive-registry-surfaces.mjs','utf8'),fn=source.match(/export function renderHomeSpine\(model\) \{[\s\S]*?\n\}/)[0].replace('export ','');
 const render=vm.runInNewContext('('+fn+')');const html=render({counts:{portfolio:{sparked:4,forge:22}}});assert.match(html,/>4<\/strong> projects marked live/);assert.match(html,/>22<\/strong> projects in development/);
 const home=fs.readFileSync('index.html','utf8');assert.match(home,/Studio snapshot/);assert.match(home,/>3<\/strong> projects marked live/);assert.match(home,/>17<\/strong> projects in development/);assert.match(home,/href="\/studio\/#pulse"[^>]*>Read the studio overview/);
});

// S418 actual late-loaded visitor guidance lifecycle.
{
const code=fs.readFileSync('assets/telemetry-matrix.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Node {constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.dataset={};this.replaces=0;}appendChild(n){this.children.push(n);return n;}replaceChildren(...nodes){this.children=nodes;this.replaces++;}get text(){return this.textContent+this.children.map(n=>n.text).join(' ');}get links(){return(this.tag==='a'?[this]:[]).concat(this.children.flatMap(n=>n.links));}}
function fixture({ready='complete',context='membership',intel={availability:{signup:{mode:'invitation'}}},get,state={},noIntel=false}={}){const root=new Node('root');root.dataset.telemetryContext=context;const listeners=new Map(),calls={get:0,exposure:0,emit:0},document={readyState:ready,createElement:t=>new Node(t),querySelectorAll:()=>[root],addEventListener:(event,fn,options)=>{if(!listeners.has(event))listeners.set(event,[]);listeners.get(event).push({fn,once:options?.once});}},window={VSIntentState:{getState:()=>state,noteExposure:()=>{calls.exposure++;throw Error('Render must not write exposure');}}};if(!noIntel)window.VSPublicIntel={get:()=>{calls.get++;return get?get():Promise.resolve(intel);}};const sandbox=vm.createContext({window,document,WeakMap,Promise,Object,Array,JSON});function run(){vm.runInContext(code,sandbox);}function fire(event){for(const entry of [...listeners.get(event)||[]]){entry.fn();if(entry.once)listeners.set(event,listeners.get(event).filter(e=>e!==entry));}}return{root,window,document,listeners,calls,run,fire};}
test('late idle-loader execution initializes, duplicate script and events stay idempotent',async()=>{const f=fixture();f.run();await tick();assert.equal(f.root.replaces,2);assert.match(f.root.text,/opened by invitation/);f.run();f.fire('DOMContentLoaded');await tick();assert.equal(f.calls.get,1);assert.equal(f.listeners.get('vs:intent-state-change').length,1);assert.equal(f.root.replaces,2);assert.equal(f.calls.exposure,0);});
test('loading document waits once for DOM readiness',async()=>{const f=fixture({ready:'loading'});f.run();await tick();assert.equal(f.calls.get,0);f.fire('DOMContentLoaded');f.fire('DOMContentLoaded');await tick();assert.equal(f.calls.get,1);assert.equal(f.root.replaces,2);});
for(const [mode,url,note]of [['open','/vault-member/#register',/currently open\./],['invitation','/invite/',/opened by invitation/],['closed','/membership/',/currently closed/],['unknown','/membership/',/current enrollment path/]])test(`actual rendered ${mode} next action respects availability`,async()=>{const f=fixture({intel:{availability:{signup:{mode}}}});f.run();await tick();assert.equal(f.root.links[0].href,url);assert.match(f.root.text,note);if(mode!=='open')assert.ok(f.root.links.every(l=>l.href!=='/vault-member/#register'));});
test('paid comparison uses current membership page without inferring readiness',async()=>{const f=fixture({context:'vaultsparked',state:{membership_temperature:'hot',logged_in:true,confidence:99}});f.run();await tick();assert.equal(f.root.links[0].href,'/membership/#tiers');assert.doesNotMatch(f.root.text,/99|confidence|warming toward|already have|conviction/);});
test('only explicit known entry preferences affect links; hostile or missing fields never leak',async()=>{for(const state of [{},{intent:'lore',confidence:85},{pathway:'<img src=x onerror=alert(1)>',logged_in:true},{pathway:'__proto__'}]){const f=fixture({context:'home',state});f.run();await tick();assert.equal(f.root.links[0].href,'/games/');assert.doesNotMatch(f.root.text,/undefined|confidence|trust|<img|already have/);}const f=fixture({context:'home',state:{pathway:'lore',logged_in:true}});f.run();await tick();assert.equal(f.root.links[0].href,'/universe/');assert.match(f.root.text,/choice saved in this browser/);});
test('missing or rejected public feed renders neutral membership fallback',async()=>{for(const options of [{noIntel:true},{get:()=>Promise.reject(Error('outage'))}]){const f=fixture(options);f.run();await tick();assert.equal(f.root.replaces,1);assert.equal(f.root.links[0].href,'/membership/');assert.doesNotMatch(f.root.text,/undefined|currently open\.|opened by invitation/);}});
test('same-tick preference/feedback events coalesce, no exposure write or recursive rerender',async()=>{const f=fixture();f.run();await tick();for(let n=0;n<12;n++){f.fire('vs:intent-state-change');f.fire('vs:feedback-change');}await tick();assert.equal(f.calls.get,2);assert.equal(f.root.replaces,2);assert.equal(f.calls.exposure,0);});
test('unresolved feed still has immediate neutral links without claiming enrollment',async()=>{const f=fixture({get:()=>new Promise(()=>{})});f.run();assert.equal(f.root.replaces,1);assert.equal(f.root.links[0].href,'/membership/');assert.equal(f.root.links.length,2);assert.doesNotMatch(f.root.text,/undefined|currently open\.|opened by invitation/);});
test('older async feed cannot overwrite newer closed-enrollment result',async()=>{const pending=[];const f=fixture({get:()=>new Promise(resolve=>pending.push(resolve))});f.run();await tick();f.fire('vs:intent-state-change');await tick();assert.equal(pending.length,2);pending[1]({availability:{signup:{mode:'closed'}}});await tick();assert.match(f.root.text,/currently closed/);pending[0]({availability:{signup:{mode:'open'}}});await tick();assert.match(f.root.text,/currently closed/);assert.equal(f.root.links[0].href,'/membership/');});

}

// S418 actual public member aggregate/quote lifecycle.
{
// Proposed append to existing tests/active-availability.unit.spec.mjs; existing fs/vm/assert/test imports reused.
async function memberVoicesFixture({readyState='complete',results=[{count:7},{count:2},{count:0},{data:[{points:0},{points:249},{points:250},{points:999},{points:1000}]}],quoteResponse={ok:true,json:async()=>({voices:[]})},sdk=true,authority=true}={}){
 const roots=Object.fromEntries(['voices','outcomes','distribution'].map(k=>[k,{innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;}}])),events={},calls=[],timers=new Map();let nextTimer=0,fetches=0;
 const context={console,AbortController,setTimeout(fn){const n=++nextTimer;timers.set(n,fn);return n;},clearTimeout(n){timers.delete(n);},document:{readyState,querySelector(s){return roots[s==='[data-member-voices]'?'voices':s==='[data-member-outcomes]'?'outcomes':'distribution'];},addEventListener(name,fn,options){events[name]={fn,options};}},fetch(){fetches++;return typeof quoteResponse==='function'?quoteResponse():Promise.resolve(quoteResponse);}};
 context.window=context;context.VSPublicIntel={get(){throw Error('Member metrics must not substitute portfolio PI fields');}};
 if(sdk)context.VSPublic={from(table){const call={table};calls.push(call);const q={select(value){call.select=value;return q;},eq(key,value){call.eq=[key,value];return q;},count(){call.count=true;return q;},get(){const value=results[calls.indexOf(call)];return typeof value==='function'?value():Promise.resolve(value);}};return q;}};
 vm.createContext(context);if(authority)vm.runInContext(fs.readFileSync('assets/membership-access.js','utf8'),context);
 vm.runInContext(fs.readFileSync('assets/member-voices.js','utf8'),context,{timeout:1000});
 const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};await flush();
 return{roots,events,calls,timers,flush,fetches:()=>fetches,expire:async()=>{for(const fn of [...timers.values()])fn();await flush();}};
}
test('actual member outcomes use existing four public reads and canonical250/1000 rank boundaries',async()=>{
 const f=await memberVoicesFixture();assert.deepEqual(f.calls,[{table:'public_leaderboard',select:'id',count:true},{table:'public_leaderboard',select:'id',eq:['is_sparked',true],count:true},{table:'challenge_submissions',select:'id',count:true},{table:'public_leaderboard',select:'points'}]);
 assert.equal(f.roots.outcomes.attrs['data-state'],'ready');assert.match(f.roots.outcomes.innerHTML,/>7<\/span>/);assert.match(f.roots.outcomes.innerHTML,/>2<\/span>/);assert.match(f.roots.outcomes.innerHTML,/>0<\/span>/);assert.match(f.roots.outcomes.innerHTML,/>—<\/span>/);
 assert.match(f.roots.outcomes.innerHTML,/public leaderboard members and challenge submissions/);assert.match(f.roots.outcomes.innerHTML,/Challenge submissions/);assert.doesNotMatch(f.roots.outcomes.innerHTML,/Challenges Complete/);
 assert.equal(f.roots.distribution.attrs['data-state'],'ready');for(const text of ['Spark Initiate: 2','Vault Runner: 2','Rift Scout: 1','5 returned public leaderboard records'])assert.ok(f.roots.distribution.innerHTML.includes(text),text);assert.doesNotMatch(f.roots.distribution.innerHTML,/member-id|username|user_id/);
});
test('successful zero counts and empty returned leaderboard remain distinct from unavailable',async()=>{
 const f=await memberVoicesFixture({results:[{count:0},{count:0},{count:0},{data:[]}]});assert.equal(f.roots.outcomes.attrs['data-state'],'ready');assert.equal((f.roots.outcomes.innerHTML.match(/>0<\/span>/g)||[]).length,3);assert.equal(f.roots.distribution.attrs['data-state'],'empty');assert.match(f.roots.distribution.innerHTML,/No public leaderboard records/);
});
test('errored or invalid counts never become zero, while independent successful reads remain',async()=>{
 const f=await memberVoicesFixture({results:[{count:7},{count:0,error:503},()=>Promise.reject(Error('offline')),{data:[{points:250}]}]});assert.match(f.roots.outcomes.innerHTML,/>7<\/span>/);assert.equal((f.roots.outcomes.innerHTML.match(/>—<\/span>/g)||[]).length,3);assert.doesNotMatch(f.roots.outcomes.innerHTML,/>0<\/span>/);assert.match(f.roots.distribution.innerHTML,/Vault Runner: 1/);
 const bad=await memberVoicesFixture({results:[{count:'7'},{count:-1},{count:0,error:503},{data:null,error:503}]});assert.equal(bad.roots.outcomes.attrs['data-state'],'unavailable');assert.equal(bad.roots.distribution.attrs['data-state'],'unavailable');assert.doesNotMatch(bad.roots.outcomes.innerHTML,/intelligence|\bloading\b|offline|>0</);
});
test('missing SDK, malformed rows or missing canonical authority remain visibly unavailable',async()=>{
 for(const options of [{sdk:false},{results:[{count:7},{count:2},{count:0},{data:[{points:'250'}]}]},{authority:false}]){const f=await memberVoicesFixture(options);assert.equal(f.roots.distribution.attrs['data-state'],'unavailable');if(options.sdk===false)assert.equal(f.roots.outcomes.attrs['data-state'],'unavailable');}
});
test('curated quote success escapes content; validempty and unavailable quote feeds differ',async()=>{
 const positive=await memberVoicesFixture({quoteResponse:{ok:true,json:async()=>({voices:[{quote:'<script>alert(1)</script>',name:'<Ada>',rank:'Vault Runner',memberSince:'2026',game:'A&B'}]})}});assert.equal(positive.roots.voices.attrs['data-state'],'ready');assert.match(positive.roots.voices.innerHTML,/&lt;script&gt;/);assert.match(positive.roots.voices.innerHTML,/&lt;Ada&gt;/);assert.match(positive.roots.voices.innerHTML,/A&amp;B/);assert.doesNotMatch(positive.roots.voices.innerHTML,/<script>/);
 const empty=await memberVoicesFixture();assert.equal(empty.roots.voices.attrs['data-state'],'empty');assert.match(empty.roots.voices.innerHTML,/No public member quotes are published here yet/);assert.doesNotMatch(empty.roots.voices.innerHTML,/opt in from their portal/);
 for(const quoteResponse of [{ok:false},{ok:true,json:async()=>({wrong:true})},()=>Promise.reject(Error('failed'))]){const failed=await memberVoicesFixture({quoteResponse});assert.equal(failed.roots.voices.attrs['data-state'],'unavailable');assert.doesNotMatch(failed.roots.voices.innerHTML,/No public member quotes|intelligence.*offline/);}
});
test('actual module starts after DOMContentLoaded or lateidle load without waiting on stalled quotes',async()=>{
 const early=await memberVoicesFixture({readyState:'loading'});assert.equal(early.calls.length,0);assert.equal(early.fetches(),0);assert.equal(early.events.DOMContentLoaded.options.once,true);early.events.DOMContentLoaded.fn();await early.flush();assert.equal(early.roots.outcomes.attrs['data-state'],'ready');
 const stalled=await memberVoicesFixture({quoteResponse:()=>new Promise(()=>{})});assert.equal(stalled.roots.outcomes.attrs['data-state'],'ready');assert.equal(stalled.roots.distribution.attrs['data-state'],'ready');assert.equal(stalled.roots.voices.attrs['data-state'],undefined);await stalled.expire();assert.equal(stalled.roots.voices.attrs['data-state'],'unavailable');
 const queries=await memberVoicesFixture({results:Array.from({length:4},()=>()=>new Promise(()=>{}))});assert.equal(queries.roots.voices.attrs['data-state'],'empty');await queries.expire();assert.equal(queries.roots.outcomes.attrs['data-state'],'unavailable');assert.equal(queries.roots.distribution.attrs['data-state'],'unavailable');
});

}
