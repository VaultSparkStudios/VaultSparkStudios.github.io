#!/usr/bin/env node
/**
 * build-ignis-platform-status.mjs — generate api/ignis-platform-status.json
 * Reads ignis-platform-public@1 from sibling vaultspark-ignis repo.
 * Usage: node scripts/build-ignis-platform-status.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { V3_CATS } from './lib/sil-categories.mjs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT  = path.join(ROOT, 'api', 'ignis-platform-status.json');
const CHECK = process.argv.includes('--check');
const IGNIS_PUBLIC = path.resolve(ROOT, '..', 'vaultspark-ignis', 'ignis', 'output', 'ignis-platform-public.json');
const IGNIS_STATUS = path.resolve(ROOT, '..', 'vaultspark-ignis', 'context', 'PROJECT_STATUS.json');

// Visitor-facing wording for each capability, keyed by id. The upstream IGNIS
// feed names its internals (isotonic PAV, Kaplan-Meier, RCA, Studio Ark, Studio
// Council); /ignis/ renders this file to visitors, so it says what each one does.
const PUBLIC_CAP={
  'decision-scoring':{label:'Decision scoring',detail:'Scores studio decisions before they are made'},
  'portfolio-monitoring':{label:'Portfolio monitoring',detail:'Real-time health tracking across all projects'},
  'carry-prediction':{label:'Delivery forecasting',detail:'Estimates how likely open work is to ship on time'},
  'feed-intelligence':{label:'Signal intelligence',detail:'Pulls in signals from many sources and notices when one goes quiet'},
  'calibration':{label:'Honest confidence',detail:'Checks its own predictions against what actually happened'},
  'pattern-distribution':{label:'Shared lessons',detail:'A fix learned on one project helps every other project'},
  'studio-council':{label:'Cross-project review',detail:'Automatic feedback across every project before work begins'},
  'intel-coupling':{label:'Early warnings',detail:'Spots the signals that tend to come before a problem'},
};
const pubCaps=(caps)=>Array.isArray(caps)?caps.map((x)=>PUBLIC_CAP[x&&x.id]?{...x,...PUBLIC_CAP[x.id]}:x):caps;

function rj(p,fb=null){try{return JSON.parse(fs.readFileSync(p,'utf-8'));}catch{return fb;}}

if(CHECK){
  const c=rj(OUT,null);
  if(!c){console.error('build-ignis-platform-status --check: missing');process.exit(1);}
  const miss=['schema','sil','intelligence','sessions','capabilities','status'].filter(k=>!(k in c));
  if(miss.length){console.error('build-ignis-platform-status --check: missing fields: '+miss.join(', '));process.exit(1);}
  console.log('build-ignis-platform-status --check: ok · sil='+c.sil?.score+' · status='+c.status);
  process.exit(0);
}

const rich=rj(IGNIS_PUBLIC,null);
if(rich&&rich.schema==='ignis-platform-public@1'){
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify({schemaVersion:rich.schemaVersion||'1.0',...rich,capabilities:pubCaps(rich.capabilities),_builtAt:new Date().toISOString(),_sourceRepo:'vaultspark-ignis',_sourceFile:'ignis/output/ignis-platform-public.json'},null,2));
  console.log('build-ignis-platform-status: ok · sil='+rich.sil?.score+' · intel='+rich.intelligence?.health+' · status='+rich.status);
  process.exit(0);
}

if(fs.existsSync(IGNIS_STATUS)){
  const s=rj(IGNIS_STATUS,{});
  const sil=Number(s.silScore??s.silTotal??0),mx=Number(s.silMax??1000);
  const sp=Array.isArray(s.silSparkline)?s.silSparkline.slice(-7):[];
  const tr=sp.length>=2?(sp[sp.length-1]>sp[sp.length-2]?'↑':sp[sp.length-1]<sp[sp.length-2]?'↓':'→'):'→';
  const ih=Number(s.silCategoriesV3?.devHealth??78);
  const ps=sil>=940&&ih>=70?'green':sil>=900||ih>=60?'yellow':'red';
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify({schema:'ignis-platform-public@1',schemaVersion:'1.0',generatedAt:new Date().toISOString(),platform:'IGNIS',description:'VaultSpark Universal Intelligence Platform',sil:{score:sil,max:mx,pct:mx>0?Math.round((sil/mx)*1000)/10:0,avg3:Number(s.silAvg3??sil),trend:tr,velocity:Number(s.silVelocity??0),sparkline:sp},intelligence:{health:ih,healthMax:100,healthPct:ih},sessions:{total:Number(s.currentSession??0),avgShipsPerSession:11.5,testPassRate:null},silCategories:V3_CATS.map((k)=>({name:k,score:Number(s.silCategoriesV3?.[k]),max:100})),capabilities:pubCaps([{id:'decision-scoring',label:'Decision scoring',detail:'Calibrated scoring for studio decisions'},{id:'portfolio-monitoring',label:'Portfolio monitoring',detail:'Real-time health tracking across projects'},{id:'carry-prediction',label:'Carry prediction',detail:'Survival curve estimation for open work items'},{id:'feed-intelligence',label:'Feed intelligence',detail:'Multi-source signal ingestion and liveness tracking'},{id:'calibration',label:'Calibration',detail:'Isotonic PAV calibration across prediction models'},{id:'pattern-distribution',label:'Pattern distribution',detail:'Studio-wide RCA pattern sharing'},{id:'studio-council',label:'Studio Council',detail:'Cross-project automated feedback at session start'},{id:'intel-coupling',label:'Intelligence coupling',detail:'Lead-indicator detection across prediction dimensions'}]),council:null,status:ps,statusLabel:ps==='green'?'All systems operational':ps==='yellow'?'Partial capacity':'Attention required',voice:'IGNIS has run '+Number(s.currentSession??0)+' intelligence sessions across the VaultSpark studio. The platform maintains a '+sil+'/'+mx+' SIL score. 8 active capabilities span decision scoring, portfolio monitoring, and predictive analytics.',public:true,audience:'studio-public',_builtAt:new Date().toISOString(),_sourceRepo:'vaultspark-ignis',_sourceFile:'context/PROJECT_STATUS.json',_fallback:true},null,2));
  console.log('build-ignis-platform-status: ok (fallback) · sil='+sil+' · status='+ps);
  process.exit(0);
}

if(fs.existsSync(OUT)){console.log('build-ignis-platform-status: CI mode — using committed version');process.exit(0);}
console.warn('build-ignis-platform-status: writing placeholder');
fs.writeFileSync(OUT,JSON.stringify({schema:'ignis-platform-public@1',schemaVersion:'1.0',generatedAt:new Date().toISOString(),status:'unknown',statusLabel:'Data unavailable',sil:{score:null,max:1000,pct:null,trend:'→',sparkline:[]},intelligence:{health:null,healthMax:100,healthPct:null},sessions:{total:null},capabilities:[],voice:'IGNIS platform data is temporarily unavailable.',_placeholder:true},null,2));
