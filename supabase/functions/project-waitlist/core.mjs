import {boundedBytes} from '../_shared/boundedBody.mjs';
export const TOKEN = /^[a-f0-9]{64}$/;
export function normalizeEmail(value) {
  if(typeof value!=='string')return null;
  const email=value.trim().toLowerCase();
  return email.length>=6&&email.length<=254&&/^[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(email)&&!email.includes('..')?email:null;
}
export async function digest(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join(''); }
export function mintToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
export function createHandler(deps) {
  return async request=>{
    const origin=request.headers.get('origin');
    const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',vary:'Origin','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'};
    if(origin===deps.origin)headers['access-control-allow-origin']=origin;
    const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(origin&&origin!==deps.origin)return reply({ok:false,error:'origin_not_allowed'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
    let body;
    try{
      const bytes=await boundedBytes(request.body,8192,deps.readTimeoutMs??10000);
      body=JSON.parse(new TextDecoder().decode(bytes));
    }catch{return reply({ok:false,error:'invalid_request'},400);}
    if(!body||Array.isArray(body)||typeof body!=='object')return reply({ok:false,error:'invalid_request'},400);
    try{
      if(body.action==='request'){
        if(Object.keys(body).some(k=>!['action','project','email','turnstileToken'].includes(k)))return reply({ok:false,error:'invalid_request'},400);
        const project=typeof body.project==='string'&&Object.prototype.hasOwnProperty.call(deps.projects,body.project)?deps.projects[body.project]:null;const email=normalizeEmail(body.email);
        if(!project||!email)return reply({ok:false,error:'invalid_project_or_email'},400);
        if(!await deps.verifyHuman(body.turnstileToken))return reply({ok:false,error:'human_verification_failed'},403);
        const token=(deps.mintToken||mintToken)();const tokenHash=await digest(token);
        const reservation=await deps.data.reserve(body.project,email,tokenHash);
        if(reservation?.state==='limited')return reply({ok:false,error:'rate_limited'},429);
        if(reservation?.state==='duplicate')return reply({ok:true,state:'pending-confirmation',project:body.project});
        if(reservation?.state!=='reserved')throw Error('reservation_unverified');
        try{
          await deps.sendConfirmation({email,project:body.project,name:project.name,token});
          const receipt=await deps.data.delivery(tokenHash,'accepted');
          if(receipt?.recorded!==true)throw Error('delivery_receipt_unverified');
        }catch(error){
          // A network failure can follow a real provider acceptance. Keep the
          // original token valid and do not claim mail delivery or resend it.
          await deps.data.delivery(tokenHash,error?.deliveryState==='rejected'?'rejected':'uncertain').catch(()=>{});
          return reply({ok:false,error:'confirmation_delivery_unverified'},503);
        }
        return reply({ok:true,state:'pending-confirmation',project:body.project});
      }
      if(!['preview','confirm'].includes(body.action)||Object.keys(body).some(k=>!['action','token'].includes(k))||!TOKEN.test(body.token||''))return reply({ok:false,error:'invalid_confirmation'},400);
      const result=await deps.data.confirmation(await digest(body.token),body.action==='confirm');
      if(!result||!['pending','confirmed'].includes(result.state)||!Object.prototype.hasOwnProperty.call(deps.projects,result.project))return reply({ok:false,error:'confirmation_expired_or_unknown'},410);
      return reply({ok:true,state:result.state,project:result.project,name:deps.projects[result.project].name,path:deps.projects[result.project].path});
    }catch{return reply({ok:false,error:'waitlist_unavailable'},503);}
  };
}
