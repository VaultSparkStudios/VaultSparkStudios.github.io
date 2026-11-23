// Active account/access copy only. Dated articles, fictional world connections and
// explicitly future Obelisk design statements are outside this narrow check.
export const ACTIVE_AVAILABILITY_FILES=['assets/studio-pulse-live.js','assets/honest-traction-scoreboard.js','assets/sealed-vault-row.js','assets/trust-depth.js','assets/studio-milestones.js','assets/ignis-tour.js','assets/related-content.js','assets/adaptive-cta.js','assets/membership-proof-loop.js','assets/rank-projector.js','studio/index.html','games/index.html','projects/index.html','membership/index.html','vault-member/index.html'];
export function activeAvailabilityConflicts(file,source,availability,tiers){
 if(!ACTIVE_AVAILABILITY_FILES.includes(file))return [];
 const errors=[];
 if(file==='assets/studio-pulse-live.js'&&(/PLAYABLE NOW|statTile\(portfolio\.sparked,\s*'Playable now'|statTile\(portfolio\.sealedCount,\s*'Vaulted|forge-sealed-label">VAULTED|Vault Members hear first/.test(source)))errors.push(file+': project status, unannounced count or access copy conflated');
 if(file==='assets/honest-traction-scoreboard.js'&&/var vaulted[^;]*sealedCount/.test(source))errors.push(file+': unannounced count must not become vaulted count');
 if(file==='assets/sealed-vault-row.js'&&/vs-sealed-label">VAULTED|hear first|heading: '.*vaulted|'<strong>/.test(source))errors.push(file+': unannounced privacy cards must remain plain text and separate from Vault Status/access');
 if(file==='studio/index.html'&&/Loading vaulted-projects census|Vault Members hear first|create a free Vault Member account/.test(source))errors.push(file+': active Studio copy must separate enrollment and unannounced initiatives');

 if(file==='assets/rank-projector.js'){
   const ctas=[...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].filter(m=>{
     const classes=m[1].match(/\bclass\s*=\s*["']([^"']*)["']/)?.[1]||'';
     const names=classes.split(/\s+/);
     return names.includes('vs-rp__cta')&&!names.includes('vs-rp__cta--secondary');
   });
   const valid=ctas.length===1&&ctas.every(m=>{
     const href=m[1].match(/\bhref\s*=\s*["']([^"']*)["']/)?.[1];
     const label=m[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
     return href==='/membership/'&&label==='See current website membership';
   });
   if(!valid)errors.push(file+': projector CTA must neutrally link current membership information');
 }
 if(file==='membership/index.html'){
   // Static copy must be reviewed/regenerated when canonical enrollment changes.
   // Shared identity header and inert script/style data are outside website enrollment.
   const main=(source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||source).replace(/<(script|style|header)\b[\s\S]*?<\/\1>/gi,' ');
   const text=main.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
   const mode=availability?.signup?.mode;
   const invitation=/opened by invitation|by invitation|Request your Vault invite|href="\/invite\/"/i.test(main);
   if(mode==='invitation'){
     if(!/opened by invitation|by invitation/i.test(text))errors.push(file+': current invitation posture missing');
   }else if(mode==='open'){
     if(invitation||!/website memberships? (?:enrollment )?(?:are |is )?currently open\b/i.test(text))errors.push(file+': stale or missing open enrollment posture');
   }else if(mode==='closed'){
     if(invitation||!/website membership enrollment is currently closed\b/i.test(text)||/href="\/vault-member\/#register"/i.test(main))errors.push(file+': stale or missing closed enrollment posture');
   }else errors.push(file+': unknown enrollment authority requires review');
 }

 if(file==='projects/index.html'&&/Get Early Access to Everything We Ship/i.test(source))errors.push(file+': unsupported universal access heading');
 if(file==='membership/index.html'&&/One membership\. Every world\.|The Vault<br>Is Open\.|Free to join|Open a free account first/i.test(source))errors.push(file+': unsupported current enrollment or universal account heading');
 if(file==='vault-member/index.html'){
   const perks=tiers?.tiers?.find(t=>t.id==='free')?.perks;
   const list=source.match(/<h4>Member Benefits<\/h4>\s*<ul class="benefit-list">([\s\S]*?)<\/ul>/)?.[1]||'';
   const values=[...list.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m=>m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'"));
   if(!Array.isArray(perks)||JSON.stringify(values)!==JSON.stringify(perks))errors.push(file+': Member Benefits must equal canonical free-tier perks');
 }
 // join has no active trust-depth mount; do not use dormant historical copy as evidence.
 if(file==='assets/trust-depth.js')source=source.replace(/contexts\.join = \[[\s\S]*?\n    \];/,'');
 const forbidden=[/backend services already power the member layer/i,/rank\/progression\/world access begin/i,/progress across games, worlds, and community surfaces/i,/account carries across all of them/i,/account carries rank and achievements across every game/i,/ties your journey across every title/i,/additional features across all games/i,/cross-game tracking across the entire/i,/Early access to everything we build next/i,/members see each one first/i,/direct lines into the forge/i,/One rank system, every game/i,/achievements cross every title/i,/accounts add ranks and cross-game identity/i,/Free account, live rank, achievements, streaks, and portal access/i];
 if(forbidden.some(re=>re.test(source)))errors.push(file+': unsupported current deployment, account coverage or access claim');
 if(file==='membership/index.html'&&availability?.signup?.mode!=='open'&&/No invitation (?:is needed|required)|no invitation or card is needed/i.test(source))errors.push(file+': website enrollment contradicts canonical authority');
 if(file==='assets/trust-depth.js'&&(!/intel\.availability(?:\?\.|\.)signup(?:\?\.|\.)mode/.test(source)||!source.includes('See the membership page for current website enrollment.')))errors.push(file+': lazy trust copy needs current availability and neutral fallback');
 return errors;
}
