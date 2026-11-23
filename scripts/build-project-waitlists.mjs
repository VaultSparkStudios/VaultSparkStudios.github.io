#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readAvailability,availabilityConflicts} from './lib/public-availability.mjs';
const START='<!-- project-waitlist:start -->',END='<!-- project-waitlist:end -->';
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function renderWaitlist(project){
 const id='waitlist-'+project.key.replace(':','-');
 return `${START}\n<section class="project-waitlist" aria-labelledby="${id}"><h2 id="${id}">Follow ${esc(project.name)}</h2><p>Request email updates for this project. Confirm your email to join its interest list. No access or launch date is promised.</p><form class="notify-me-form" data-project="${esc(project.key)}"><label for="${id}-email">Email address</label><div class="notify-me-fields"><input id="${id}-email" type="email" name="email" required maxlength="254" autocomplete="email"><button type="submit">Request project updates</button></div><div class="turnstile-slot"></div><p class="notify-me-feedback" role="status" aria-live="polite" hidden></p></form><p><a href="/privacy/">How we use your email</a></p></section>\n${END}`;
}
export function reconcilePage(html,project){
 const block=renderWaitlist(project);
 html=html.replace(/\s*<!-- Notify Me — Early Access \(auto-injected by scripts\/inject-early-signal\.mjs\) -->[\s\S]*?<script src="\/assets\/notify-me\.js" defer><\/script>/g,'');
 if(html.includes(START)){if(!html.includes(END))throw Error('Unterminated waitlist marker');html=html.replace(/<!-- project-waitlist:start -->[\s\S]*?<!-- project-waitlist:end -->/,block);}
 else{if(!html.includes('</main>'))throw Error('Missing main target');html=html.replace('</main>',`${block}\n</main>`);}
 if(!/\/assets\/project-waitlist(?:\.shell-[a-f0-9]+)?\.css/.test(html))html=html.replace('</head>','<link rel="stylesheet" href="/assets/project-waitlist.css">\n</head>');
 for(const source of ['turnstile','notify-me'])if(!new RegExp(`/assets/${source}(?:\\.shell-[a-f0-9]+)?\\.js`).test(html))html=html.replace('</body>',`<script src="/assets/${source}.js" defer></script>\n</body>`);
 return html;
}
export function build(root,{apply=false}={}){
 const availability=readAvailability(root),feed=JSON.parse(fs.readFileSync(path.join(root,'api/public-intelligence.json'),'utf8'));
 const conflicts=availabilityConflicts(feed.availability,availability);if(conflicts.length)throw Error(conflicts.join('; '));
 const config=JSON.parse(fs.readFileSync(path.join(root,'config/project-waitlists.json'),'utf8'));
 const changes=[];const write=(relative,next)=>{const file=path.join(root,relative),old=fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;if(old!==next){changes.push(relative);if(apply){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,next);}}};
 write('supabase/functions/project-waitlist/projects.json',JSON.stringify(config,null,2)+'\n');
 write('api/project-waitlists.json',JSON.stringify(availability.waitlists,null,2)+'\n');
 for(const project of availability.waitlists.projects){const relative=project.path.slice(1)+'index.html',html=fs.readFileSync(path.join(root,relative),'utf8');write(relative,reconcilePage(html,project));}
 return changes;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(args.some(arg=>!['--apply','--check','--dry-run'].includes(arg))||args.length>1)throw Error('Use exactly one of --apply, --check or --dry-run');
 const changes=build(process.cwd(),{apply:args.includes('--apply')});console.log(JSON.stringify({changed:changes,applied:args.includes('--apply')}));if(args.includes('--check')&&changes.length)process.exitCode=1;
}
