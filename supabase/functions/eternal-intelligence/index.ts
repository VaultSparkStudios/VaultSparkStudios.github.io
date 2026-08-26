import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActivePlanKey,
  isVaultSparkedProPlan,
  normalizePlanKey,
} from '../_shared/membershipAccess.ts';
import {
  isCapBreached,
  isPaused,
  meterCall,
  tierPersonaSuffix,
} from '../_shared/tokenMeter.ts';

type AccessState = {
  authenticated: boolean;
  userId: string | null;
  planKey: string;
  isPro: boolean;
};

type RevealEntry = {
  slug?: string;
  title?: string;
  description?: string;
  tagline?: string;
  revealAt?: string;
  href?: string;
};

type CreditEntry = {
  handle?: string;
  name?: string;
  label?: string;
  game?: string | null;
};

function buildCors(origin: string | null, appUrl: string) {
  const canonicalOrigin = new URL(appUrl).origin;
  const allowedOrigins = new Set([
    canonicalOrigin,
    'https://website.staging.vaultsparkstudios.com',
  ]);
  let requestedOrigin: string | null = null;
  try {
    requestedOrigin = origin ? new URL(origin).origin : null;
  } catch {
    requestedOrigin = null;
  }
  const allowedOrigin = requestedOrigin && allowedOrigins.has(requestedOrigin)
    ? requestedOrigin
    : canonicalOrigin;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

async function getAccessState(
  supabase: ReturnType<typeof createClient>,
  authClient: ReturnType<typeof createClient>,
  authHeader: string | null,
): Promise<AccessState> {
  if (!authHeader) {
    return { authenticated: false, userId: null, planKey: 'free', isPro: false };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { authenticated: false, userId: null, planKey: 'free', isPro: false };
  }

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) {
    return { authenticated: false, userId: null, planKey: 'free', isPro: false };
  }

  const [{ data: member }, { data: subscription }] = await Promise.all([
    supabase
      .from('vault_members')
      .select('plan_key, is_sparked')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const subscriptionPlan = getActivePlanKey(subscription);
  const memberPlan = normalizePlanKey(member?.plan_key ?? 'free');
  const planKey = subscriptionPlan !== 'free' ? subscriptionPlan : memberPlan;

  return {
    authenticated: true,
    userId: user.id,
    planKey,
    isPro: isVaultSparkedProPlan(planKey),
  };
}

function quarterLabel(date = new Date()) {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

function parseJsonEnv<T>(name: string, fallback: T): T {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function parseRequestJson(req: Request) {
  const contentType = req.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return {};
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function fetchIntel(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`intel ${res.status}`);
  return res.json();
}

function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Studio lifecycle vocabulary is FORGE → SPARKED → VAULTED. `sealedCount` is a
 * different axis — projects that exist but are not announced yet — so folding
 * it into the lifecycle triple both retired the word VAULTED from a paid
 * member's briefing and mislabelled seven unannounced projects as a lifecycle
 * state. The two are reported separately.
 */
function portfolioPosture(portfolio: any) {
  const lifecycle = `Portfolio posture: ${portfolio?.sparked ?? 0} SPARKED, ${portfolio?.forge ?? 0} FORGE, ${portfolio?.vaulted ?? 0} VAULTED.`;
  const sealed = Number(portfolio?.sealedCount ?? 0);
  if (!sealed) return lifecycle;
  return `${lifecycle} ${sealed} project${sealed === 1 ? ' remains' : 's remain'} sealed and unannounced.`;
}

function buildTemplateDispatch(intel: any, reveals: any[], credits: any[]) {
  const project = intel?.project ?? {};
  const portfolio = intel?.portfolio ?? {};
  const shipped = asArray<string>(intel?.pulse?.shipped).slice(0, 4);
  const sparked = asArray<any>(intel?.catalog).filter((item) => item?.status === 'SPARKED').slice(0, 4);
  const forge = asArray<any>(intel?.catalog).filter((item) => item?.status === 'FORGE').slice(0, 4);

  return {
    title: `Eternal Dispatch · ${quarterLabel()}`,
    dek: 'A private studio briefing assembled from the live vault pulse.',
    sections: [
      {
        heading: 'Forge Window',
        body: [
          project.currentFocus ? `Current focus: ${project.currentFocus}.` : 'The forge is active.',
          project.nextMilestone ? `Next milestone: ${project.nextMilestone}.` : '',
          typeof project.currentSession !== 'undefined'
            ? `Session marker: ${project.currentSession}.`
            : '',
        ].filter(Boolean).join(' '),
      },
      {
        heading: 'Sparked Now',
        body: sparked.length
          ? `Live surfaces: ${sparked.map((item) => item.name).join(', ')}. Recent movement: ${shipped.join(' · ')}.`
          : 'No fresh sparked catalog items are available in the public snapshot yet.',
      },
      {
        heading: 'Pressure In The Forge',
        body: forge.length
          ? `Projects carrying the most visible heat: ${forge.map((item) => item.name).join(', ')}. ${portfolioPosture(portfolio)}`
          : portfolioPosture(portfolio),
      },
      {
        heading: 'Eternal Ledger',
        body: reveals.length
          ? `${reveals.length} sealed reveal${reveals.length === 1 ? '' : 's'} are inside the 48-hour window. ${credits.length ? `${credits.length} Eternal credit${credits.length === 1 ? '' : 's'} are currently queued for shipped-title recognition.` : ''}`.trim()
          : credits.length
            ? `${credits.length} Eternal credit${credits.length === 1 ? '' : 's'} are currently queued for shipped-title recognition.`
            : 'No sealed reveals are inside the preview window yet. Eternal status remains active and ready for the next break in the seal.',
      },
    ],
  };
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getCachedDispatch(supabase: ReturnType<typeof createClient>, hash: string) {
  try {
    const { data } = await supabase
      .from('ignis_response_cache')
      .select('reply, model')
      .eq('question_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!data?.reply) return null;
    return { dispatch: JSON.parse(data.reply), model: data.model, cached: true };
  } catch {
    return null;
  }
}

async function buildModelDispatch(
  supabase: ReturnType<typeof createClient>,
  intel: any,
  reveals: any[],
  credits: any[],
  planKey: string,
) {
  const baseUrl = (Deno.env.get('HETZNER_INFERENCE_BASE_URL') || '').replace(/\/$/, '');
  const apiKey = Deno.env.get('HETZNER_INFERENCE_API_KEY') || '';
  const model = Deno.env.get('HETZNER_INFERENCE_MODEL') || 'openai/gpt-oss-120b';
  const grounding = JSON.stringify({ project: intel?.project, portfolio: intel?.portfolio, pulse: intel?.pulse, reveals, credits });
  const hash = await sha256Hex('eternal-dispatch-v1|' + quarterLabel() + '|' + grounding);
  const cached = await getCachedDispatch(supabase, hash);
  if (cached) return cached;
  if (!baseUrl || !apiKey || isPaused() || await isCapBreached(supabase, 'eternal-intelligence')) return null;

  const res = await fetch(baseUrl + '/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: 850,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are IGNIS, VaultSpark Studios\' precise, ceremonial intelligence. Write only grounded facts supplied by the user. Return strict JSON: {"title":string,"dek":string,"sections":[{"heading":string,"body":string}]}. Use 3-4 concise sections. Never invent dates, releases, counts, promises, or sealed-project details. ' + tierPersonaSuffix(planKey),
        },
        { role: 'user', content: 'Create the private Eternal quarterly briefing from this exact snapshot:\n' + grounding },
      ],
    }),
  });
  if (!res.ok) return null;
  const payload = await res.json();
  const reply = payload?.choices?.[0]?.message?.content;
  if (!reply) return null;
  let dispatch;
  try { dispatch = JSON.parse(reply); } catch { return null; }
  if (!dispatch?.title || !dispatch?.dek || !Array.isArray(dispatch?.sections) || dispatch.sections.length < 2) return null;
  const normalized = JSON.stringify(dispatch);
  const groundedTerms = [
    intel?.project?.currentFocus,
    intel?.project?.nextMilestone,
    ...(Array.isArray(intel?.pulse?.shipped) ? intel.pulse.shipped : []),
  ].filter(Boolean).map((x) => String(x).toLowerCase());
  if (groundedTerms.length && !groundedTerms.some((term) => normalized.toLowerCase().includes(term.slice(0, Math.min(term.length, 24))))) return null;
  await meterCall(supabase, 'eternal-intelligence', {
    input_tokens: Number(payload?.usage?.prompt_tokens || 0),
    output_tokens: Number(payload?.usage?.completion_tokens || 0),
  });
  try {
    await supabase.from('ignis_response_cache').upsert({
      question_hash: hash,
      question_text: 'Eternal quarterly dispatch ' + quarterLabel(),
      reply: normalized,
      model,
      page_context: 'vault-member/eternal-intelligence',
      hit_count: 1,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'question_hash' });
  } catch { /* cache is an optimization */ }
  return { dispatch, model, cached: false };
}

function filterRevealWindow(entries: RevealEntry[]) {
  const now = Date.now();
  return entries
    .map((entry) => {
      const revealAt = new Date(entry?.revealAt ?? '').getTime();
      if (!revealAt || Number.isNaN(revealAt)) return null;
      const windowOpensAt = revealAt - (48 * 60 * 60 * 1000);
      if (now < windowOpensAt || now >= revealAt) return null;
      return {
        slug: entry.slug ?? entry.title ?? 'sealed-signal',
        title: entry.title ?? 'Sealed Signal',
        description: entry.description ?? entry.tagline ?? 'No signal on that reveal yet.',
        revealAt: new Date(revealAt).toISOString(),
        windowOpensAt: new Date(windowOpensAt).toISOString(),
        href: entry.href ?? '/studio-pulse/',
      };
    })
    .filter(Boolean);
}

function buildAccessPayload(access: AccessState) {
  return {
    authenticated: access.authenticated,
    planKey: access.planKey,
    isPro: access.isPro,
  };
}

function buildPreview(reveals: ReturnType<typeof filterRevealWindow>, credits: Array<{ handle: string; label: string; game: string | null }>) {
  return {
    revealCount: reveals.length,
    creditCount: credits.length,
    nextRevealAt: reveals[0]?.revealAt ?? null,
  };
}

serve(async (req) => {
  const appUrl = Deno.env.get('APP_URL') ?? 'https://vaultsparkstudios.com';
  const cors = buildCors(req.headers.get('Origin'), appUrl);

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'GET' && req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey;
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const authClient = createClient(supabaseUrl, supabaseAnon);
  const body = req.method === 'POST' ? await parseRequestJson(req) : {};
  const probe = body?.probe === true || new URL(req.url).searchParams.get('probe') === '1';

  const access = await getAccessState(supabase, authClient, req.headers.get('Authorization'));
  if (!access.authenticated) {
    return new Response(JSON.stringify({
      error: 'Sign in to read Eternal Dispatch.',
      code: 'auth_required',
    }), { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  if (!access.isPro) {
    return new Response(JSON.stringify({
      error: 'Eternal Dispatch is reserved for VaultSparked Eternal members.',
      code: 'eternal_required',
      planKey: access.planKey,
    }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  const revealEntries = parseJsonEnv<RevealEntry[]>('SEALED_REVEALS_JSON', []);
  const creditEntries = parseJsonEnv<CreditEntry[]>('ETERNAL_CREDITS_JSON', []);
  const reveals = filterRevealWindow(revealEntries);
  const credits = creditEntries.map((entry) => ({
    handle: entry.handle ?? entry.name ?? 'Eternal Member',
    label: entry.label ?? 'Studio credit pending',
    game: entry.game ?? null,
  }));

  if (probe) {
    return new Response(JSON.stringify({
      ok: true,
      probe: true,
      access: buildAccessPayload(access),
      preview: buildPreview(reveals, credits),
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const intelUrl = Deno.env.get('PUBLIC_INTEL_URL') ?? `${appUrl}/api/public-intelligence.json`;
  const intel = await fetchIntel(intelUrl);
  const modeled = await buildModelDispatch(supabase, intel, reveals, credits, access.planKey);
  const dispatch = modeled?.dispatch ?? buildTemplateDispatch(intel, reveals, credits);

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    planKey: access.planKey,
    access: buildAccessPayload(access),
    preview: buildPreview(reveals, credits),
    dispatch,
    intelligence: {
      mode: modeled ? 'model' : 'grounded-template-fallback',
      model: modeled?.model ?? null,
      semanticCache: modeled?.cached === true,
    },
    reveals,
    credits,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
