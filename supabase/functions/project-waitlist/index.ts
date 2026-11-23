import projects from './projects.json' with { type: 'json' };
import { createHandler } from './core.mjs';
import { createAdapters } from './adapters.mjs';
Deno.serve(async (request: Request) => {
  try { return await createHandler(createAdapters({env:(key:string)=>Deno.env.get(key),projects:projects.projects}))(request); }
  catch { return new Response(JSON.stringify({ok:false,error:'waitlist_unavailable'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}}); }
});
