import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  getActivePlanKey,
  isVaultSparkedProPlan,
  normalizePlanKey,
} from '../_shared/membershipAccess.ts';

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
  const allowedOrigin = origin && origin === appUrl ? origin : appUrl;
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
          ? `Projects carrying the most visible heat: ${forge.map((item) => item.name).join(', ')}. Portfolio posture: ${portfolio.sparked ?? 0} SPARKED, ${portfolio.forge ?? 0} FORGE, ${portfolio.sealedCount ?? 0} SEALED.`
          : `Portfolio posture: ${portfolio.sparked ?? 0} SPARKED, ${portfolio.forge ?? 0} FORGE, ${portfolio.sealedCount ?? 0} SEALED.`,
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
  const dispatch = buildTemplateDispatch(intel, reveals, credits);

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    planKey: access.planKey,
    access: buildAccessPayload(access),
    preview: buildPreview(reveals, credits),
    dispatch,
    reveals,
    credits,
  }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
