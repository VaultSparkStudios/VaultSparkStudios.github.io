const PRODUCTION_ORIGIN='https://vaultsparkstudios.com';
export const PRODUCTION_ENDPOINT='https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/project-waitlist';
async function readBounded(stream,limit,timeoutMs){
  const reader=stream?.getReader();if(!reader)throw Error('missing_body');
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('read_timeout')),timeoutMs);});
  const chunks=[];let length=0;
  try{for(;;){const part=await Promise.race([reader.read(),timeout]);if(part.done)break;length+=part.value.byteLength;if(length>limit)throw Error('body_too_large');chunks.push(part.value);}}
  finally{clearTimeout(timer);void reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
function publicResponse(body,status){
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.ok!=='boolean')throw Error('invalid_result');
  if(!body.ok){if(status<400||status>599)throw Error('invalid_status');return{ok:false,error:'waitlist_request_unverified'};}
  if(status!==200||!['pending-confirmation','pending','confirmed'].includes(body.state)||!/^(game|project):[a-z0-9-]{1,80}$/.test(body.project||''))throw Error('invalid_result');
  const result={ok:true,state:body.state,project:body.project};
  if(body.state!=='pending-confirmation'){
    if(typeof body.name!=='string'||body.name.length<1||body.name.length>120||/[\x00-\x1f]/.test(body.name)||!/^\/(games|projects|universe)\/[a-z0-9-]+\/$/.test(body.path||''))throw Error('invalid_result');
    result.name=body.name;result.path=body.path;
  }
  return result;
}
export function resolveWaitlistEndpoint(request,env) {
  const requestOrigin=new URL(request.url).origin;
  const publicOrigin=new URL(env.PUBLIC_ORIGIN||PRODUCTION_ORIGIN).origin;
  if(requestOrigin!==publicOrigin)throw Error('public_origin_mismatch');
  const production=publicOrigin===PRODUCTION_ORIGIN;
  const configured=env.PROJECT_WAITLIST_ENDPOINT||(production?PRODUCTION_ENDPOINT:'');
  if(!configured)throw Error('isolated_waitlist_endpoint_missing');
  const endpoint=new URL(configured);
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash
    ||endpoint.pathname!=='/functions/v1/project-waitlist')throw Error('waitlist_endpoint_invalid');
  if(production&&endpoint.href!==PRODUCTION_ENDPOINT)throw Error('production_waitlist_endpoint_mismatch');
  if(!production&&endpoint.origin===new URL(PRODUCTION_ENDPOINT).origin)throw Error('production_waitlist_forbidden_on_staging');
  return endpoint.href;
}
export async function handleProjectWaitlist(request,env,{fetchImpl=globalThis.fetch,readTimeoutMs=10000}={}) {
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
  const reject=(error,status)=>new Response(JSON.stringify({ok:false,error}),{status,headers});
  if(request.method!=='POST')return reject('method_not_allowed',405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return reject('origin_not_allowed',403);
  let endpoint;try{endpoint=resolveWaitlistEndpoint(request,env);}catch{return reject('waitlist_environment_unavailable',503);}
  try{
    const raw=await readBounded(request.body,8192,readTimeoutMs);
    const response=await fetchImpl(endpoint,{method:'POST',headers:{'content-type':'application/json',origin:new URL(request.url).origin},
      body:raw,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(30000)});
    if(!/^application\/json\b/i.test(response.headers.get('content-type')||''))return reject('waitlist_response_unverified',503);
    const bytes=await readBounded(response.body,16384,readTimeoutMs);
    const body=publicResponse(JSON.parse(new TextDecoder().decode(bytes)),response.status);
    return new Response(JSON.stringify(body),{status:response.status,headers});
  }catch{return reject('waitlist_unavailable',503);}
}
