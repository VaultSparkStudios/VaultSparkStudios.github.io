import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {readAvailability,membershipSurfaceCopy,renderMembershipSurfaceBlocks,availabilitySurfaceConflicts} from '../scripts/lib/public-availability.mjs';
import {buildModel,renderPressBio,renderPressCatalog,readBlock,applySurface,SURFACES} from '../scripts/derive-registry-surfaces.mjs';
const ROOT=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8'),availability=readAvailability(ROOT);
test('canonical invitation posture generates current CTAs/notes without changing monthly tier facts',()=>{
 const c=membershipSurfaceCopy(availability),b=renderMembershipSurfaceBlocks(availability),tiers=JSON.parse(read('api/membership-tiers.json'));
 assert.equal(c.url,'/invite/');assert.equal(c.label,tiers.enrolment.label);assert.match(c.note,/by invitation/);assert.equal(Object.keys(b).length,10);
 assert.ok(tiers.tiers.some(t=>t.price.monthly===4.99));assert.ok(tiers.tiers.some(t=>t.price.monthly===29.99));assert.equal(tiers.billing.interval,'month');assert.equal(tiers.billing.annual.buyable,false);
 for(const name of ['home-hero-membership-cta','home-vault-membership-cta','home-membership-cta']){assert.ok(b[name].includes('href="/invite/"'));assert.ok(b[name].includes(tiers.enrolment.label));assert.doesNotMatch(b[name],/Create your free account/);}
});
test('open/closed postures update copy and links together, and unknown or unsafe authority fails',()=>{
 for(const [mode,label,url]of [['open','Create website membership','/vault-member/#register'],['closed','Current membership information','/membership/']]){
  const a={...availability,signup:{...availability.signup,mode,label,url}},b=renderMembershipSurfaceBlocks(a);assert.ok(b['home-membership-cta'].includes(`href="${url}"`));assert.ok(b['home-membership-cta'].includes(label));assert.ok(b['press-membership-overview'].includes(membershipSurfaceCopy(a).note));assert.match(b['home-membership-timeline'],mode==='open'?/currently open/:/currently closed/);
 }
 for(const signup of [{...availability.signup,mode:'unknown'},{...availability.signup,url:'https://unowned.invalid/'},{...availability.signup,url:'//unowned.invalid/'},{...availability.signup,label:''}])assert.throws(()=>membershipSurfaceCopy({...availability,signup}));
});
test('proposed active Home/Press/Contact are coherent; shared Studio identity headers remain byte-identical',()=>{
 for(const f of ['index.html','press/index.html','assets/contact-page.js','vault-member/index.html','assets/vault-cta.js','invite/index.html'])assert.deepEqual(availabilitySurfaceConflicts(f,read(f),availability),[],f);
 const pi=JSON.parse(read('api/public-intelligence.json')),registry=JSON.parse(read('data/game-registry.json'));
 for(const f of ['index.html','press/index.html']){
  const blocks=SURFACES.find(s=>s.file===f).blocks.filter(b=>b.name.includes('membership-'));
  const flipped=buildModel(registry,{...pi,availability:{...availability,signup:{mode:'closed',label:'Membership information',url:'/membership/'}}});
  const changed=applySurface(read(f),blocks,flipped,{bootstrap:false});
  assert.equal(changed.html.match(/<header\b[\s\S]*?<\/header>/)?.[0],read(f).match(/<header\b[\s\S]*?<\/header>/)?.[0],f+' shared Studio header changed');
 }
 const home=read('index.html');for(const name of ['home-hero-membership-cta','home-vault-membership-cta','home-membership-cta'])assert.equal(readBlock(home,name),renderMembershipSurfaceBlocks(availability)[name]);
});
test('coherence rejects stale labels, URLs, enrollment notes and active unsupported Press claims',()=>{
 const cta=renderMembershipSurfaceBlocks(availability)['home-hero-membership-cta'];
 for(const changed of [read('index.html').replace(cta,cta.replace('Request your Vault invite','Create your free account')),read('index.html').replace(cta,cta.replace('href="/invite/"','href="/vault-member/#register"')),read('index.html').replace('New website memberships are currently opened by invitation.','No invitation needed.')])assert.ok(availabilitySurfaceConflicts('index.html',changed,availability).length>0);
 const press=read('press/index.html').replace('</main>','<p>16 live edge functions bind every studio title.</p></main>');assert.ok(availabilitySurfaceConflicts('press/index.html',press,availability).some(x=>x.includes('unsupported')));
 assert.ok(availabilitySurfaceConflicts('assets/contact-page.js',read('assets/contact-page.js').replace('For current website membership enrollment and access, see the membership page.','No invitation is needed to join.'),availability).length>0);
});
test('historical article quotations are outside this active-surface gate and are never rewritten',()=>{
 const historical='<article><blockquote>Membership is open. No invitation needed. Powered by16live edge functions.</blockquote></article>';
 assert.deepEqual(availabilitySurfaceConflicts('news/2026-03-04-membership/index.html',historical,availability),[]);assert.equal(historical,'<article><blockquote>Membership is open. No invitation needed. Powered by16live edge functions.</blockquote></article>');
});
test('registry bio cannot turn a function inventory count into deployment/integration claims',()=>{
 const pi=JSON.parse(read('api/public-intelligence.json'));pi.stats={...pi.stats,activeEdgeFunctions:9999};
 const bio=renderPressBio(buildModel(JSON.parse(read('data/game-registry.json')),pi));assert.match(bio,/Obelisk provides shared Studio sign-in/);assert.match(bio,/each project page/);assert.doesNotMatch(bio,/9999|live edge functions|binds every title|shared points economy/);
});
test('marker generation is idempotent and switches the ten availability blocks as one model',()=>{
 const pi=JSON.parse(read('api/public-intelligence.json')),registry=JSON.parse(read('data/game-registry.json'));
 for(const f of ['index.html','press/index.html']){
  const blocks=SURFACES.find(s=>s.file===f).blocks.filter(b=>b.name.includes('membership-')||b.name==='press-bio');
  const model=buildModel(registry,pi),same=applySurface(read(f),blocks,model,{bootstrap:false});assert.deepEqual(same.problems,[]);assert.equal(same.html,read(f));
  const flipped=buildModel(registry,{...pi,availability:{...availability,signup:{...availability.signup,mode:'open',label:'Create website membership',url:'/vault-member/#register'}}});const changed=applySurface(read(f),blocks,flipped,{bootstrap:false});assert.deepEqual(changed.problems,[]);assert.notEqual(changed.html,read(f));assert.deepEqual(availabilitySurfaceConflicts(f,changed.html,flipped.availability),[]);
 }
});
test('actual Contact invite preset creates a current-membership anchor and no enrollment promise',()=>{
 const script=read('assets/contact-page.js'),start=script.indexOf('  var TOPIC_PRESETS ='),end=script.lastIndexOf('\n  }\n})();');assert.ok(start>0&&end>start);let note;
 const subject={value:''},message={},hidden={};const heading={insertAdjacentElement(position,node){assert.equal(position,'afterend');note=node;}};
 const document={getElementById:id=>({'contact-subject':subject,'contact-message':message}[id]||null),querySelector:q=>q.startsWith('#contact-form')?hidden:q==='.contact-form-panel'?{querySelector:()=>heading}:null,createElement:tag=>({tag,children:[],appendChild(node){this.children.push(node);}}),createTextNode:text=>({text})};
 vm.runInNewContext(script.slice(start,end+'\n  }'.length)+'\napplyTopicPreset();',{document,window:{location:{search:'?topic=invite',pathname:'/contact/'}},URLSearchParams});
 assert.ok(note);assert.match(note.textContent,/current website membership/i);assert.doesNotMatch(note.textContent,/no invitation|starts directly|free account/i);const link=note.children.find(n=>n.tag==='a');assert.equal(link.href,'/membership/');assert.equal(link.textContent,'Current membership information');
});

test('Press progression label is neutral and Portal shared identity copy preserves SSO/form contracts',()=>{
 const overview=renderMembershipSurfaceBlocks(availability)['press-membership-overview'];assert.match(overview,/>Vault Rank<\/strong>/);assert.match(overview,/Earned progression/);assert.doesNotMatch(overview,/>9<\/strong>/);
 const portal=read('vault-member/index.html');assert.match(portal,/Shared Studio account/);assert.match(portal,/Check current website membership availability/);
 for(const id of ['obelisk-create-account','oauth-complete-form','oauth-birth-month','oauth-birth-year','oauth-username','oauth-invite','oauth-subscribe'])assert.ok(portal.includes(`id="${id}"`));
 assert.ok(portal.includes('href="/login?intent=signup&amp;return=/vault-member/"'));assert.ok(portal.includes('href="/login?intent=signin&amp;return=/vault-member/"'));
 for(const promise of ['Free membership · open to everyone','No membership invite required','No invitation is needed']){
  const changed=portal.replace('Shared Studio account',promise);assert.ok(availabilitySurfaceConflicts('vault-member/index.html',changed,availability).some(e=>e.includes('unqualified open')));
 }
});

test('Press catalog status headings preserve labels/counts with readable theme tokens and canonical Pulse link',()=>{
 const pi=JSON.parse(read('api/public-intelligence.json'));pi.portfolio={...pi.portfolio,sealedCount:2};
 const registry=JSON.parse(read('data/game-registry.json')),model=buildModel(registry,pi),rendered=renderPressCatalog(model),headings=[...rendered.matchAll(/<h3 style="([^"]+)">([^<]+)<\/h3>/g)];
 assert.ok(headings.length>=3);for(const [,style,label]of headings){assert.ok(style.includes(label.includes('Vaulted')?'color:var(--muted)':'color:var(--gold)'));assert.doesNotMatch(style,/#fbbf24|#f59e0b|#94a3b8/);assert.match(label,/Sparked|Forge|Vaulted/);assert.match(label,/\(\d+\)/);}
 const expectedSparked=pi.catalog.filter(c=>c.status.toLowerCase()==='sparked').length;assert.ok(headings.some(([, ,label])=>label===`🔥 Sparked — Live Now (${expectedSparked})`));
 assert.ok(rendered.includes('href="/studio/#pulse"'));assert.ok(!rendered.includes('href="/studio-pulse/"'));assert.ok(headings.some(([, ,label])=>label.includes('🔒 Vaulted')));
});

test('active Home and delayed CTA refuse alternate open-signup wording and unsupported universal integrations',()=>{
 const home=read('index.html');
 for(const phrase of ['Create a free account to make it yours.','Your Vault Rank grows as you play across every live title.'])assert.ok(availabilitySurfaceConflicts('index.html',home.replace('</main>','<p>'+phrase+'</p></main>'),availability).length>0);
 const cta=read('assets/vault-cta.js');assert.deepEqual(availabilitySurfaceConflicts('assets/vault-cta.js',cta,availability),[]);
 assert.ok(availabilitySurfaceConflicts('assets/vault-cta.js',cta.replace('href="/membership/"','href="/vault-member/#register"'),availability).length>0);
});

test('delayed membership bar guard rejects added open-enrollment and universal integration claims in every posture',()=>{
 const cta=read('assets/vault-cta.js');
 for(const mode of ['invitation','open','closed']){
  const authority={...availability,signup:{...availability.signup,mode}};assert.deepEqual(availabilitySurfaceConflicts('assets/vault-cta.js',cta,authority),[]);
  for(const phrase of ['Create a free account.','Create your free account.','No invitation is needed.','Membership is open.','Your Vault Rank grows as you play across every live title.','One identity that follows you into every world.']){
   const changed=cta.replace('Explore member features and current enrollment.','Explore member features and current enrollment. '+phrase);
   assert.ok(availabilitySurfaceConflicts('assets/vault-cta.js',changed,authority).some(e=>/neutral|universal/.test(e)),mode+': '+phrase);
  }
 }
});

test('Invite separates open shared identity from invitation membership and referral eligibility',()=>{
 const source=read('invite/index.html');assert.deepEqual(availabilitySurfaceConflicts('invite/index.html',source,availability),[]);
 for(const phrase of ['No invitation is needed.','Anyone can create a free Vault Member account.','Your free VaultSpark account carries a personal referral link.','Create a free VaultSpark account to unlock your personal referral link.','Create your free account, grab your referral link.']){
  assert.ok(availabilitySurfaceConflicts('invite/index.html',source.replace('</main>','<p>'+phrase+'</p></main>'),availability).length>0,phrase);
 }
 for(const [a,b]of [['Website membership is currently by invitation','Website membership is open'],['A referral link does not grant website membership.',''],['free Obelisk Studio account','free website account']])assert.ok(availabilitySurfaceConflicts('invite/index.html',source.replaceAll(a,b),availability).length>0,a);
 assert.deepEqual(availabilitySurfaceConflicts('invite/index.html',source.replace('</main>','<blockquote>No invitation is needed.</blockquote><!-- No invitation is needed. --><script>"No invitation is needed."</script></main>'),availability),[]);
 assert.ok(availabilitySurfaceConflicts('invite/index.html',source,{...availability,signup:{...availability.signup,mode:'open'}}).length>0,'stale invitation copy fails when authority changes');
 const caller=read('scripts/check-content-coherence.mjs');assert.match(caller,/for\s*\(const file of \[[^\]]*'invite\/index\.html'[^\]]*\]\)/,'real coherence CLI checks Invite');
});

function pathwayRuntime(source) {
 const window={location:{pathname:'/invite/'},localStorage:{getItem:()=>null,setItem:()=>{}}},document={readyState:'loading',addEventListener:()=>{}};
 vm.runInNewContext(source,{window,document},{timeout:200});return window.VSPathways.all;
}
test('shared pathway neutral identity/membership copy and actual destination remain valid for all three canonical postures',()=>{
 const source=read('assets/pathways-router.js'),cards=pathwayRuntime(source);
 assert.equal(cards.member.href,'/membership/');assert.match(cards.member.summary,/free Obelisk Studio account/);
 for(const mode of ['invitation','open','closed'])assert.deepEqual(availabilitySurfaceConflicts('assets/pathways-router.js',source,{...availability,signup:{...availability.signup,mode}}),[]);
 assert.match(read('scripts/check-content-coherence.mjs'),/for\s*\(const file of \[[^\]]*'assets\/pathways-router\.js'[^\]]*\]\)/);
});
test('twelve pathway negatives mutate actual member/player/personalization/backend string producers rather than comments',()=>{
 const source=read('assets/pathways-router.js'),summary=pathwayRuntime(source).member.summary;
 const mutations=[source.replace(summary,'Start free, earn rank. '+summary),source.replace('Start with live browser games. Each project page describes its access, account integration and progression.','Start with live games, rank progression, and a vault identity you can carry across worlds.'),source.replace('Best first stop: playable games and their access details.','Best first stop: playable games and rank-carrying identity.'),source.replace("    if (stats.trackedSocialAccounts)","    if (stats.activeEdgeFunctions) proofBits.push(stats.activeEdgeFunctions + ' active backend services');\n    if (stats.trackedSocialAccounts)")];
 for(const changed of mutations){assert.notEqual(changed,source);for(const mode of ['invitation','open','closed'])assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',changed,{...availability,signup:{...availability.signup,mode}}).length);}
});
test('actual unqualified open enrollment fails invitation/closed while neutral summary remains mode independent',()=>{
 const source=read('assets/pathways-router.js'),summary=pathwayRuntime(source).member.summary,bad=source.replace(summary,'Website membership is open to everyone. No invitation needed. '+summary);
 assert.match(pathwayRuntime(bad).member.summary,/open to everyone/);
 for(const mode of ['invitation','closed'])assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',bad,{...availability,signup:{...availability.signup,mode}}).length);
 assert.deepEqual(availabilitySurfaceConflicts('assets/pathways-router.js',bad,{...availability,signup:{...availability.signup,mode:'open'}}),[]);
 for(const [phrase,allowed]of [['Website membership is currently by invitation. ','invitation'],['Website membership enrollment is currently closed. ','closed']])for(const mode of ['invitation','open','closed']){const changed=source.replace(summary,phrase+summary);assert.equal(availabilitySurfaceConflicts('assets/pathways-router.js',changed,{...availability,signup:{...availability.signup,mode}}).length===0,mode===allowed);}
});
test('actual member href cannot be masked by comments or another pathway destination; normal quoting/spacing is accepted',()=>{
 const source=read('assets/pathways-router.js'),wrong=source.replace("href: '/membership/'","href: '/vault-member/#register'")+"\n// href: '/membership/'\n";
 assert.equal(pathwayRuntime(wrong).member.href,'/vault-member/#register');assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',wrong,availability).length);
 const other=wrong.replace("href: '/vaultsparked/#pricing'","href: '/membership/'");assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',other,availability).length);
 for(const href of ['href: "/membership/"','href /* current info */ : "/membership/"',String.raw`href: '\/membership\/'`]){const formatted=source.replace("href: '/membership/'",href);assert.equal(pathwayRuntime(formatted).member.href,'/membership/');assert.deepEqual(availabilitySurfaceConflicts('assets/pathways-router.js',formatted,availability),[]);}
 const commented=source+"\n// Website membership is open to everyone. No invitation needed.\n/* active backend services */\n";assert.deepEqual(availabilitySurfaceConflicts('assets/pathways-router.js',commented,availability),[]);
});
test('comment summary bait, duplicate properties, dynamic values and late member override cannot satisfy literal metadata',()=>{
 const source=read('assets/pathways-router.js'),summary=pathwayRuntime(source).member.summary;
 const late=source.replace('  window.VSPathways = {',"  PATHWAYS.member.href='/vault-member/#register';\n  window.VSPathways = {");assert.equal(pathwayRuntime(late).member.href,'/vault-member/#register');
 for(const bad of [source.replace(summary,'Unknown membership copy.')+'\n// '+summary,source.replace("href: '/membership/'","href: '/membership/', href: '/vault-member/#register'"),source.replace("href: '/membership/'","href: window.memberDestination"),source.replace("href: '/membership/'","href: '/member' + 'ship/'"),late]){assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',bad,availability).length);}
 assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js','x'.repeat(100001),availability).length);
});
test('actual renderer exposes the guarded personalized/backend mutations and keeps proposed member destination neutral',async()=>{
 const source=read('assets/pathways-router.js');
 async function render(text){const root={dataset:{pathwaysContext:'invite',pathwaysLimit:'3'},innerHTML:''},listeners={},document={readyState:'loading',addEventListener:(name,fn)=>listeners[name]=fn,querySelectorAll:()=>[root]},window={location:{pathname:'/invite/'},localStorage:{getItem:()=>null,setItem:()=>{}},VSIntentState:{getState:()=>({hesitation_signal:'want_gameplay',pathway:null})},VSPublicIntel:{get:()=>Promise.resolve({stats:{vaultRankTiers:9,activeEdgeFunctions:16,trackedSocialAccounts:6}})}};vm.runInNewContext(text,{window,document},{timeout:200});listeners.DOMContentLoaded();await new Promise(setImmediate);return root.innerHTML;}
 const good=await render(source);assert.ok(good.includes('href="/membership/"'));assert.ok(good.includes('current access and progression'));assert.ok(!good.includes('active backend services'));
 const backend=source.replace("    if (stats.trackedSocialAccounts)","    if (stats.activeEdgeFunctions) proofBits.push(stats.activeEdgeFunctions + ' active backend services');\n    if (stats.trackedSocialAccounts)");assert.ok((await render(backend)).includes('16 active backend services'));assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',backend,availability).length);
 const personalized=source.replace('Best first stop: playable games and their access details.','Best first stop: playable games and rank-carrying identity.');assert.ok((await render(personalized)).includes('rank-carrying identity'));assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',personalized,availability).length);
});

test('linecomment terminators cannot hide a later actual duplicate member destination',()=>{
 const source=read('assets/pathways-router.js');
 for(const end of ['\r','\u2028','\u2029']){
  const bad=source.replace("href: '/membership/',","href: '/membership/', // visiblecomment"+end+" href: '/vault-member/#register',\n");
  assert.equal(pathwayRuntime(bad).member.href,'/vault-member/#register');
  assert.ok(availabilitySurfaceConflicts('assets/pathways-router.js',bad,availability).length);
 }
});
