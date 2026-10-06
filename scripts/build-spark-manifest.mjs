/** Spark's public destination contract: shared by human cards and agent itineraries. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseRedirects} from './build-route-consolidation.mjs';
export function writeSparkManifest({check=false}={}){
const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const exists=route=>fs.existsSync(path.join(root,route.replace(/^\//,''),'index.html'));
const SITE='https://vaultsparkstudios.com';
const games=read('data/game-registry.json').games;
const intel=read('api/public-intelligence.json');
const intents=read('api/intent-map.json');
const redirects=parseRedirects(fs.readFileSync(path.join(root,'_redirects'),'utf8'));
const canonical=url=>{let u=new URL(url,SITE);for(let i=0;i<8;i++){const rule=redirects.find(r=>r.from===u.pathname&&r.status>=300&&r.status<400);if(!rule) return u.href;u=new URL(rule.to,SITE);}throw Error('Redirect loop: '+url);};
// A feed refresh is not a source publication date. Undated sources stay undated.
const stamp=null;
const destinations=[];
function gameMetadata(id){
 if(!exists('/games/'+id+'/'))return {description:'',tags:[]};
 const html=fs.readFileSync(path.join(root,'games',id,'index.html'),'utf8');
 for(const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)){
  try{const d=JSON.parse(match[1]);if(d['@type']==='VideoGame'){const genres=[].concat(d.genre||[]).map(v=>String(v).toLowerCase());const description=String(d.description||'');if(/strategy|tactical|front.office|draft/i.test(description))genres.push('strategy');return {description,tags:genres};}}catch{}
 }
 return {description:'',tags:[]};
}
function add(d){if(!exists(d.path))return;var change=(intel.normalizedActivity?.latest||[]).find(e=>e.type==='public_ship'&&d.id.endsWith(e.projectId)&&Number.isFinite(Date.parse(e.occurredAt)));destinations.push({...d,recentChange:change?{title:change.title,occurredAt:change.occurredAt,url:canonical(change.url)}:null,url:canonical(d.path),action:{capability:'navigate',method:'GET'},prerequisites:[],freshness:{observedAt:d.observedAt,maxAgeHours:168},evidence:[{url:canonical(d.source),observedAt:d.observedAt}]});}
for(const [id,g] of Object.entries(games).filter(([,g])=>g.status!=='sealed'))add({id:'game-'+id,label:g.name,region:'play',path:'/games/'+id+'/',availability:g.status==='vaulted'?'vaulted':g.status==='sparked'&&g.playUrl?'play-now':g.playUrl?'playable-preview':'in-the-forge',status:g.status.toUpperCase(),description:gameMetadata(id).description|| (g.status==='vaulted'?'An archived world from the Vault.':g.playUrl?'Open the world page for its playable build and development status.':'Explore the world and its development plans.'),tags:['games',...id.split('-'),...gameMetadata(id).tags],source:'/data/game-registry.json',observedAt:stamp});
for(const p of intel.catalog||[]){if(p.type==='game')continue;const route='/projects/'+p.id+'/';add({id:'project-'+p.id,label:p.name,region:'build',path:route,availability:p.status==='VAULTED'?'vaulted':p.status==='SPARKED'?'available':'in-the-forge',status:p.status,description:p.note||p.category,tags:['tools','building',String(p.category||'').toLowerCase()],source:'/api/public-intelligence.json',observedAt:stamp});}
for(const d of [
 {id:'explore-universe',label:'The Vault Universe',region:'explore',path:'/universe/',description:'Enter the stories and worlds taking shape in the Vault.',tags:['lore','worldbuilding']},
 {id:'explore-news',label:'The Desk',region:'explore',path:'/news/',description:'Read the latest editions from the studio’s fictional AI correspondents.',tags:['news','reading']},
 {id:'explore-journal',label:'Studio Journal',region:'explore',path:'/journal/',description:'Explore the ideas and craft behind the worlds.',tags:['craft','worldbuilding']},
 {id:'verify-evidence',label:'Shipping evidence',region:'verify',path:'/evidence/',description:'Inspect public sources and dated receipts for studio claims.',tags:['proof','evidence']},
 {id:'verify-pulse',label:'Studio Pulse',region:'verify',path:'/studio-pulse/',description:'See the public operating pulse and documented work.',tags:['studio','craft']},
 {id:'verify-status',label:'Service status',region:'verify',path:'/status/',description:'Review reported service status and its evidence limits.',tags:['status','proof']}
])add({...d,status:'SPARKED',availability:'available',source:'/api/intent-map.json',observedAt:stamp});
const revision=crypto.createHash('sha256').update(JSON.stringify(destinations)).digest('hex').slice(0,16);
const manifest={schemaVersion:1,kind:'public-navigation',name:'Spark — Vault Compass',revision,publishedAt:stamp,publicSafe:true,runtimeAiCost:0,regions:[{id:'play',label:'Play',description:'Find a world.'},{id:'explore',label:'Explore',description:'Follow a story.'},{id:'build',label:'Build',description:'Discover a tool.'},{id:'verify',label:'Verify',description:'Inspect the evidence.'}],destinations};
if(new Set(destinations.map(d=>d.id)).size!==destinations.length)throw Error('Duplicate Spark ID');
for(const d of destinations){if(!['play','explore','build','verify'].includes(d.region)||!d.label)throw Error('Invalid destination '+d.id);if(new URL(d.url).origin!==SITE)throw Error('Unexpected destination origin');}
const output=JSON.stringify(manifest,null,2)+'\n';
const file='api/spark-manifest.json';
if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==output)throw Error('Spark manifest drift: run builder');}else fs.writeFileSync(file,output);
console.log(`Spark manifest: ${destinations.length} validated public destinations · revision ${revision}`);

return manifest;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))writeSparkManifest({check:process.argv.includes('--check')});
