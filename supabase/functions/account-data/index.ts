import { createHandler } from './core.mjs';
import { createAdapters } from './adapters.mjs';

// verify_jwt=false is required for the separately authenticated retry processor.
// Human actions authenticate through the shared provider's /auth/v1/user route;
// no account or identity is created/deleted here.
Deno.serve(async (req: Request) => {
  try {
    return await createHandler(createAdapters({ env: (name: string) => Deno.env.get(name) }))(req);
  } catch {
    return new Response(JSON.stringify({ error: 'account_data_unavailable', retryable: true }), {
      status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
});
