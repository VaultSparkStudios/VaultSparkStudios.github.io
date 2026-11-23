import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function buildAvailability(tiers, waitlists) {
  if (!tiers?.enrolment || !Array.isArray(tiers.tiers) || !waitlists?.projects) throw new Error('Availability authority is incomplete');
  const mode=tiers.enrolment.freeAccounts;
  if (!['invitation','open','closed'].includes(mode)) throw new Error('Unknown canonical signup posture');
  const projects=Object.entries(waitlists.projects).map(([key,value])=>{
    if (!/^(game|project):[a-z0-9-]+$/.test(key) || !value.name || !/^\/(games|projects|universe)\/[a-z0-9-]+\/$/.test(value.path)) throw new Error('Invalid project waitlist authority');
    return {key,name:value.name,path:value.path};
  });
  return {
    schemaVersion:'1.0',
    signup:{mode,label:tiers.enrolment.label,url:tiers.enrolment.url,identityProvider:'Obelisk'},
    billing:{interval:tiers.billing.interval,annualOffered:tiers.billing.annual?.buyable===true},
    plans:tiers.tiers.map(tier=>({id:tier.id,name:tier.name,planCode:tier.planCode,monthlyPrice:tier.price.monthly,
      annualPrice:tiers.billing.annual?.buyable===true?tier.price.annual:null,cta:tier.cta,
      purchase: tier.planCode==='free'?'membership-enrollment':'checkout-verifies-current-eligibility'})),
    waitlists:{mode:'project-specific-double-opt-in',endpoint:'/api/project-waitlist',confirmationPath:'/waitlist/confirm/',
      projectCount:projects.length,projects,sourceSha256:crypto.createHash('sha256').update(JSON.stringify(waitlists)).digest('hex')},
    sources:['api/membership-tiers.json','config/project-waitlists.json'],
  };
}
export function readAvailability(root=process.cwd()) {
  return buildAvailability(JSON.parse(fs.readFileSync(path.join(root,'api/membership-tiers.json'),'utf8')),
    JSON.parse(fs.readFileSync(path.join(root,'config/project-waitlists.json'),'utf8')));
}
export function availabilityConflicts(actual,expected) {
  if(!actual)return ['public-intelligence availability is missing'];
  return JSON.stringify(actual)===JSON.stringify(expected)?[]:['public-intelligence availability differs from canonical signup, billing or project-list authority'];
}

// Current website membership posture. Shared Studio identity creation is separate.
export function membershipSurfaceCopy(availability) {
  const signup=availability?.signup;
  if(!signup||!['invitation','open','closed'].includes(signup.mode)||typeof signup.label!=='string'||!signup.label.trim()
    ||typeof signup.url!=='string'||!/^\/(?!\/)[a-z0-9/#?=&_-]*$/i.test(signup.url))throw Error('Current membership signup authority is incomplete');
  const posture={invitation:{short:'By invitation',note:'New website memberships are currently opened by invitation.',timeline:'Website membership is currently by invitation.'},open:{short:'Open enrollment',note:'New website memberships are currently open.',timeline:'Website membership enrollment is currently open.'},closed:{short:'Enrollment closed',note:'New website membership enrollment is currently closed.',timeline:'New website membership enrollment is currently closed.'}}[signup.mode];
  return {...posture,label:signup.label,url:signup.url,profile:'Website membership brings together your profile, Vault ranks, points, achievements and community challenges. Obelisk provides shared Studio sign-in. Project access and releases are described on each project page.'};
}
const surfaceEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderMembershipSurfaceBlocks(availability) {
  const c=membershipSurfaceCopy(availability),label=surfaceEsc(c.label),href=surfaceEsc(c.url),note=surfaceEsc(c.note),profile=surfaceEsc(c.profile);
  return {
    'home-hero-membership-cta':`<a class="button button-accent" data-track-event="home_hero_member_click" data-hero-choice="join" href="${href}" data-vs-join>${label}</a>`,
    'home-vault-membership-cta':`<a class="button vd-cta--guest" href="${href}" data-vs-join data-track-event="home_vault_door_invite_click">${label}</a>`,
    'home-vault-membership-description':`<p>${profile} ${note}</p>`,
    'home-membership-rank-benefit':`<strong>Website progression</strong><p>Earn Vault points through available website challenges and activities.</p>`,
    'home-vault-membership-note':`<p class="vd-note vd-note--guest">${note} Shared Studio sign-in is separate.</p>`,
    'home-membership-intro':`<h2 id="membership-heading">Your Profile.<br><em class="vsx-1448d9c374">Your Place in the Vault.</em></h2>\n              <p>${profile} ${note}</p>`,
    'home-membership-cta':`<a class="button" data-track-event="home_membership_free_click" href="${href}" data-vs-join>${label}</a>`,
    'home-membership-timeline':`<span class="tl-label">${surfaceEsc(c.short)}</span>\n              <strong>Website membership</strong>\n              <div class="tl-body">${surfaceEsc(c.timeline)} Shared Studio sign-in uses Obelisk; project access follows each project page. <a href="/membership/">See current membership</a>.</div>`,
    'press-membership-facts':`<tr><td>Membership</td><td>${note} <a href="${href}">${label}</a> &middot; <a href="/membership/#tiers">Current membership tiers</a></td></tr>\n              <tr><td>Vault system</td><td>Website profiles, ranks and community &middot; Obelisk shared Studio sign-in &middot; project-specific access</td></tr>`,
    'press-membership-overview':`<p>${profile}</p>\n          <p>${note} <a href="${href}">${label}</a>. Optional paid tiers and their current monthly terms are listed on the <a href="/membership/#tiers">membership page</a>.</p>\n          <div class="vsx-5d541e7bea">\n            <div class="vsx-252bf0a8c5"><strong class="vsx-a07b6250b2">Vault Rank</strong><span class="vsx-48343c0422">Earned progression</span></div>\n            <div class="vsx-252bf0a8c5"><strong class="vsx-a07b6250b2">${availability.plans.length}</strong><span class="vsx-48343c0422">Membership tiers</span></div>\n            <div class="vsx-252bf0a8c5"><strong class="vsx-a07b6250b2">Obelisk</strong><span class="vsx-48343c0422">Shared Studio sign-in</span></div>\n            <div class="vsx-252bf0a8c5"><strong class="vsx-a07b6250b2">${surfaceEsc(c.short)}</strong><span class="vsx-48343c0422">Website enrollment</span></div>\n          </div>`,
  };
}
// The owned PATHWAYS table uses literal string properties. Parse only that
// bounded grammar: never execute browser source inside a production checker.
function pathwayLiteralMetadata(source) {
  if(typeof source!=='string'||source.length>100000)throw Error('Pathway source exceeds bound');
  const tokens=[];let i=0;
  while(i<source.length) {
    const c=source[i];
    if(/\s/.test(c)){i++;continue;}
    if(source.startsWith('//',i)){const offset=source.slice(i+2).search(/[\n\r\u2028\u2029]/);if(offset<0)break;i+=2+offset;continue;}
    if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);if(end<0)throw Error('Unclosed pathway comment');i=end+2;continue;}
    if(c==='"'||c==="'") {
      const quote=c;let value='',closed=false;i++;
      while(i<source.length){const ch=source[i++];if(ch===quote){closed=true;break;}if(ch==='\n'||ch==='\r')throw Error('Invalid pathway string');
        if(ch!=='\\'){value+=ch;continue;}
        const escaped=source[i++],simple={'\\':'\\',"'":"'",'"':'"','/':'/','n':'\n','r':'\r','t':'\t','b':'\b','f':'\f','v':'\v'};
        if(Object.hasOwn(simple,escaped)){value+=simple[escaped];continue;}
        if(escaped==='\n')continue;if(escaped==='\r'){if(source[i]==='\n')i++;continue;}
        if(escaped==='x'||escaped==='u'){const count=escaped==='x'?2:4,text=source.slice(i,i+count);if(!new RegExp('^[a-f0-9]{'+count+'}$','i').test(text))throw Error('Unsupported pathway escape');value+=String.fromCharCode(parseInt(text,16));i+=count;continue;}
        throw Error('Unsupported pathway escape');
      }
      if(!closed||value.length>32768)throw Error('Unclosed/oversized pathway string');tokens.push({kind:'string',value});
    }else if(/[A-Za-z_$]/.test(c)){const start=i++;while(i<source.length&&/[A-Za-z0-9_$]/.test(source[i]))i++;tokens.push({kind:'word',value:source.slice(start,i)});}
    else{if(c==='`')throw Error('Dynamic pathway templates require review');tokens.push({kind:'punct',value:c});i++;}
    if(tokens.length>20000)throw Error('Pathway tokens exceed bound');
  }
  const is=(n,value)=>tokens[n]?.value===value&&tokens[n]?.kind!=='string';
  const declarations=[];for(let n=0;n<tokens.length-3;n++)if(['var','let','const'].includes(tokens[n].value)&&tokens[n+1].kind==='word'&&tokens[n+1].value==='PATHWAYS'&&is(n+2,'=')){if(!is(n+3,'{'))throw Error('PATHWAYS must remain a literal table');declarations.push(n+3);}
  if(declarations.length!==1)throw Error('Missing/duplicate PATHWAYS table');
  const close=open=>{const pairs={'{':'}','[':']','(':')'},stack=[];for(let n=open;n<tokens.length;n++){const t=tokens[n];if(t.kind!=='punct')continue;if(Object.hasOwn(pairs,t.value)){stack.push(pairs[t.value]);if(stack.length>64)throw Error('Pathway nesting exceeds bound');}else if(['}',']',')'].includes(t.value)){if(stack.pop()!==t.value)throw Error('Unbalanced pathway table');if(!stack.length)return n;}}throw Error('Unclosed pathway table');};
  const open=declarations[0],end=close(open);let member=null;
  for(let n=open+1;n<end;){if(is(n,',')){n++;continue;}const key=tokens[n];if(!['word','string'].includes(key.kind)||!is(n+1,':')||!is(n+2,'{'))throw Error('Pathway entries must remain literal objects');const stop=close(n+2);
    if(key.value==='member'){if(member)throw Error('Duplicate member pathway');member={};for(let p=n+3;p<stop;){if(is(p,',')){p++;continue;}const property=tokens[p],value=tokens[p+2];if(!['word','string'].includes(property.kind)||!is(p+1,':')||value?.kind!=='string'||!(is(p+3,',')||p+3===stop)||Object.hasOwn(member,property.value))throw Error('Member properties must remain unique literal strings');Object.defineProperty(member,property.value,{value:value.value,enumerable:true});p+=3;}}
    n=stop+1;if(n<end&&!is(n,','))throw Error('Unexpected pathway table expression');
  }
  if(!member||member.key!=='member'||typeof member.summary!=='string'||typeof member.href!=='string')throw Error('Missing member pathway metadata');
  // Current personalization clones entries; later direct member overrides must
  // receive review rather than bypassing the literal metadata contract.
  for(let n=end+1;n<tokens.length;n++)if(tokens[n].kind==='word'&&tokens[n].value==='PATHWAYS'&&((is(n+1,'.')&&tokens[n+2]?.value==='member')||(is(n+1,'[')&&tokens[n+2]?.kind==='string'&&tokens[n+2].value==='member')))throw Error('Later member override requires review');
  return {member,activeStrings:tokens.filter(t=>t.kind==='string').map(t=>t.value).join(' ')};
}

export function availabilitySurfaceConflicts(file,source,availability) {
  // Historical articles/quotations and shared identity headers are not current
  // website membership enrollment surfaces. Never rewrite or patrol those here.
  if(!['index.html','press/index.html','assets/contact-page.js','vault-member/index.html','assets/vault-cta.js','invite/index.html','assets/pathways-router.js'].includes(file))return [];
  const errors=[],blocks=renderMembershipSurfaceBlocks(availability);
  if(file==='invite/index.html') {
    const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
    const active=main.replace(/<(script|style|blockquote)\b[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');
    const text=active.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
    if(!/free Obelisk Studio account/i.test(text)||!active.includes('href="/membership/"'))errors.push('Invite must separate shared Studio identity and current website membership information');
    if(availability.signup.mode!=='open'&&/no invitation (?:is )?needed|anyone can create a free Vault Member account|free VaultSpark account (?:carries|to unlock)|create your free account, grab your referral link/i.test(text))errors.push('Invite copy implies open website membership or identity-only referral eligibility');
    if(availability.signup.mode==='invitation'&&!/website membership is currently by invitation/i.test(text))errors.push('Invite must state current invitation-based website membership');
    if(availability.signup.mode==='closed'&&!/website membership (?:enrollment )?is currently closed/i.test(text))errors.push('Invite must state current closed website membership');
    if(availability.signup.mode==='open'&&/website membership is currently by invitation|current website enrollment is by invitation|accept a website membership invitation/i.test(text))errors.push('Invite invitation copy differs from current open website membership');
    if(!/referral link does not grant website membership/i.test(text))errors.push('Invite must not imply a referral link grants website membership');
    return errors;
  }
  if(file==='assets/pathways-router.js') {
    let parsed;try{parsed=pathwayLiteralMetadata(source);}catch(error){errors.push('Pathway literal metadata unavailable: '+error.message);return errors;}
    const {member,activeStrings}=parsed;
    if(/rank progression, and a vault identity|identity you can carry across worlds|Start free, earn rank|rank-carrying identity|active backend services/i.test(activeStrings))errors.push('Pathway copy asserts unqualified membership, universal game progression or unverified backend activity');
    if(!/free\s+Obelisk\s+Studio\s+account/i.test(member.summary)||!/website\s+membership/i.test(member.summary)||!/current\s+enrollment/i.test(member.summary)||member.href!=='/membership/')errors.push('Member pathway must separate shared identity and current website membership availability');
    const mode=availability.signup.mode;
    if(mode!=='open'&&/website membership(?: enrollment)? (?:is |is currently )?open(?: to everyone)?|no invitation (?:is )?needed|anyone can create a free Vault Member account/i.test(activeStrings))errors.push('Pathway copy implies open website membership contrary to current authority');
    if(mode!=='invitation'&&/website membership(?: enrollment)? (?:is |is currently )?by invitation/i.test(activeStrings))errors.push('Pathway invitation claim differs from current authority');
    if(mode!=='closed'&&/website membership(?: enrollment)? (?:is |is currently )?closed/i.test(activeStrings))errors.push('Pathway closed-enrollment claim differs from current authority');
    return errors;
  }
  if(file==='assets/vault-cta.js') {
    const bar=source.match(/bar\.innerHTML\s*=([\s\S]*?);\r?\n/)?.[1]||'';
    if(!bar.includes('href="/membership/"')||!bar.includes('Website membership')||!bar.includes('See membership'))errors.push('Sticky membership CTA must link current membership information');
    if(/Join The Vault|Join the Vault|vault-member\/#register|access classified files/i.test(bar))errors.push('Sticky membership CTA implies direct membership enrollment');
    if(/no invitation (?:is )?needed|membership is open|create (?:a|your) free account/i.test(bar))errors.push('Sticky membership CTA must remain neutral about enrollment');
    if(/across every live title|identity that follows you into every world/i.test(bar))errors.push('Sticky membership CTA asserts unsupported universal title integration');
    return errors;
  }
  if(file==='vault-member/index.html') {
    const panel=source.match(/<div class="auth-panel" id="panel-register"[\s\S]*?(?=<div class="auth-panel" id="panel-oauth-complete")/)?.[0]||'';
    if(!panel.includes('Shared Studio account')||!panel.includes('href="/membership/"'))errors.push('Portal shared Studio account copy must link current website membership information');
    if(availability.signup.mode!=='open'&&/open to everyone|no membership invite|no invitation (?:is )?needed|membership is open/i.test(panel))errors.push('Portal copy implies unqualified open website membership');
    return errors;
  }
  if(file==='assets/contact-page.js') {
    const invite=source.match(/invite:\s*\{([\s\S]*?)\n\s*\},/)?.[1]||'';
    if(/no invitation (?:is )?needed|starts directly|create your free account/i.test(invite))errors.push('Contact invite help contradicts current membership authority');
    if(!/membershipHref:\s*['"]\/membership\/['"]/.test(invite))errors.push('Contact invite help must link current membership information');
    return errors;
  }
  const wanted=Object.entries(blocks).filter(([key])=>key.startsWith(file==='index.html'?'home-':'press-'));
  for(const [name,expected]of wanted){const start=`<!-- registry:${name}:start -->`,end=`<!-- registry:${name}:end -->`,a=source.indexOf(start),b=a<0?-1:source.indexOf(end,a+start.length);if(a<0||b<0||source.slice(a+start.length,b)!==expected)errors.push(`${file}: current membership block ${name} differs from availability authority`);}
  const main=source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||source;
  const active=main.replace(/<(script|style|blockquote)\b[\s\S]*?<\/\1>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  if(availability.signup.mode!=='open'&&/no invitation (?:is )?needed|membership is open|create (?:a|your) free account/i.test(active))errors.push(`${file}: active copy implies open website membership`);
  if(file==='index.html'&&/across every live title|identity that follows you into every world/i.test(active))errors.push('Home copy asserts unsupported universal title integration');
  if(file==='press/index.html'&&/\b\d+\+?\s+(?:live\s+)?edge functions|binds every title|account follows players across every studio title|9-tier cross-game rank across every VaultSpark title/i.test(active))errors.push('Press copy asserts unsupported deployed-function counts or universal title integration');
  return errors;
}
