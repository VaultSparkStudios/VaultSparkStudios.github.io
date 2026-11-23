import {boundedBytes} from '../_shared/boundedBody.mjs';
export function createAdapters({env,projects,fetchImpl=globalThis.fetch,readTimeoutMs=10000}) {
  const need=name=>{const value=env(name);if(!value)throw Error('configuration_unavailable');return value;};
  const origin=new URL(env('APP_URL')||'https://vaultsparkstudios.com').origin;
  const base=need('SUPABASE_URL').replace(/\/$/,'');const key=need('SUPABASE_SERVICE_ROLE_KEY');
  async function json(url,options,mail=false){
    const response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(15000)});
    const raw=await boundedBytes(response.body,128*1024,readTimeoutMs);
    const body=JSON.parse(new TextDecoder().decode(raw));
    if(!response.ok){const error=new Error('provider_unavailable');if(mail&&response.status>=400&&response.status<500&&response.status!==408)error.deliveryState='rejected';throw error;}
    return body;
  }
  const rpc=(name,args)=>json(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify(args)});
  return {origin,projects,
    data:{reserve:(project,email,token)=>rpc('website_waitlist_request',{p_project:project,p_email:email,p_token_hash:token}),
      delivery:(token,state)=>rpc('website_waitlist_delivery',{p_token_hash:token,p_state:state}),
      confirmation:(token,confirm)=>rpc('website_waitlist_confirmation',{p_token_hash:token,p_confirm:confirm})},
    async verifyHuman(token){
      if(typeof token!=='string'||token.length<8||token.length>4096)return false;
      const result=await json('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({secret:need('TURNSTILE_SECRET_KEY'),response:token}).toString()});
      const age=Date.now()-Date.parse(result.challenge_ts||'');
      return result.success===true&&result.hostname===new URL(origin).hostname&&Number.isFinite(age)&&age>=-30000&&age<=300000;
    },
    async sendConfirmation({email,project,name,token}){
      const link=new URL('/waitlist/confirm/',origin);link.hash=new URLSearchParams({token}).toString();
      const result=await json('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':need('BREVO_API_KEY'),'content-type':'application/json'},body:JSON.stringify({
        sender:{email:env('PROJECT_WAITLIST_FROM_EMAIL')||'news@vaultsparkstudios.com',name:'VaultSpark Studios'},to:[{email}],
        replyTo:{email:'news@vaultsparkstudios.com'},subject:`Confirm your ${name} updates`,
        textContent:`You requested email updates for ${name}. Confirm this project only by opening ${link.href} and choosing Confirm. The link expires in 24 hours. If you did not request this, ignore the email; no confirmed subscription is created. VaultSpark Studios LLC · https://vaultsparkstudios.com/privacy/`,
        tags:['website-project-waitlist',project.replace(':','-')],
      })},true);
      if(typeof result.messageId!=='string'||!result.messageId)throw Error('confirmation_unverified');
    },
  };
}
