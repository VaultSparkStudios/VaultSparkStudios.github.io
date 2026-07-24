const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const sessionCache = new Map();

function getVaultCreds(accountType = 'default') {
  if (accountType === 'free') {
    return {
      email: process.env.VAULT_FREE_TEST_EMAIL || process.env.VAULT_TEST_EMAIL,
      password: process.env.VAULT_FREE_TEST_PASSWORD || process.env.VAULT_TEST_PASSWORD,
    };
  }

  if (accountType === 'sparked') {
    return {
      email: process.env.VAULT_SPARKED_TEST_EMAIL,
      password: process.env.VAULT_SPARKED_TEST_PASSWORD,
    };
  }

  if (accountType === 'eternal') {
    return {
      email: process.env.VAULT_ETERNAL_TEST_EMAIL,
      password: process.env.VAULT_ETERNAL_TEST_PASSWORD,
    };
  }

  if (accountType === 'promogrind') {
    return {
      email: process.env.VAULT_PROMOGRIND_TEST_EMAIL,
      password: process.env.VAULT_PROMOGRIND_TEST_PASSWORD,
    };
  }

  return {
    email: process.env.VAULT_TEST_EMAIL || process.env.VAULT_FREE_TEST_EMAIL,
    password: process.env.VAULT_TEST_PASSWORD || process.env.VAULT_FREE_TEST_PASSWORD,
  };
}

function hasVaultCreds(accountType = 'default') {
  const creds = getVaultCreds(accountType);
  return Boolean(creds.email && (creds.password || SUPABASE_SERVICE_ROLE_KEY));
}

async function createVaultSession(request, accountType = 'default') {
  const creds = getVaultCreds(accountType);

  if (!creds.email || !creds.password) {
    throw new Error(`Vault auth credentials are missing for account type "${accountType}"`);
  }

  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      email: creds.email,
      password: creds.password,
    },
  });

  if (!res.ok()) {
    throw new Error(`Vault auth failed with status ${res.status()}`);
  }

  const session = await res.json();
  if (!session?.access_token || !session?.refresh_token || !session?.user) {
    throw new Error('Vault auth response did not include a usable session');
  }
  return session;
}

async function createAdminMagicSession(request, accountType = 'default') {
  const creds = getVaultCreds(accountType);
  if (!creds.email) {
    throw new Error(`Vault auth email is missing for account type "${accountType}"`);
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for magic-link auth');
  }

  const res = await request.post(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    data: {
      type: 'magiclink',
      email: creds.email,
      redirect_to: `${BASE_URL}/vault-member/`,
    },
  });

  if (!res.ok()) {
    throw new Error(`Vault magic-link generation failed with status ${res.status()}`);
  }

  const data = await res.json();
  const tokenHash = data?.hashed_token || data?.properties?.hashed_token;
  if (!tokenHash) {
    throw new Error('Vault magic-link response did not include a token hash');
  }

  const verifyRes = await request.post(`${SUPABASE_URL}/auth/v1/verify`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      type: 'magiclink',
      token_hash: tokenHash,
    },
  });

  if (!verifyRes.ok()) {
    throw new Error(`Vault magic-link verification failed with status ${verifyRes.status()}`);
  }

  const session = await verifyRes.json();
  if (!session?.access_token || !session?.refresh_token || !session?.user) {
    throw new Error('Vault magic-link verification did not return a usable session');
  }

  return session;
}

function getOrCreateVaultSession(request, accountType = 'default') {
  const mode = SUPABASE_SERVICE_ROLE_KEY ? 'magic' : 'password';
  const cacheKey = `${mode}:${accountType}`;
  if (!sessionCache.has(cacheKey)) {
    const pending = (SUPABASE_SERVICE_ROLE_KEY
      ? createAdminMagicSession(request, accountType)
      : createVaultSession(request, accountType)
    ).catch((error) => {
      sessionCache.delete(cacheKey);
      throw error;
    });
    sessionCache.set(cacheKey, pending);
  }
  return sessionCache.get(cacheKey);
}

async function installEdgeSession(page, session) {
  const identity = {
    provider: 'obelisk',
    sub: `test:${session.user.id}`,
    supabaseUserId: session.user.id,
    email: session.user.email,
    name: session.user.user_metadata?.display_name || session.user.email,
    assurance: ['pwd'],
  };
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, identity }),
  }));
  await page.route('**/api/auth/session', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, identity, supabase: session }),
  }));
  await page.route('**/api/auth/logout', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));
}

async function seedVaultSession(page, request, accountType = 'default') {
  const session = await getOrCreateVaultSession(request, accountType);
  await installEdgeSession(page, session);
  return session;
}

async function loginVaultMember(page, request) {
  const session = await getOrCreateVaultSession(request);
  await installEdgeSession(page, session);
  await page.goto('/vault-member/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#dashboard-view', { state: 'visible', timeout: 15000 });
  return page;
}

async function loginVaultMemberByType(page, request, accountType) {
  const session = await getOrCreateVaultSession(request, accountType);
  await installEdgeSession(page, session);
  await page.goto('/vault-member/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#dashboard-view', { state: 'visible', timeout: 15000 });
  return page;
}

async function loginVaultMemberWithTheme(page, request, theme) {
  await page.addInitScript(
    ({ themeKey, themeValue }) => {
      window.localStorage.setItem(themeKey, themeValue);
    },
    {
      themeKey: 'vs_theme',
      themeValue: theme,
    }
  );

  const session = await getOrCreateVaultSession(request);
  await installEdgeSession(page, session);
  await page.goto('/vault-member/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#dashboard-view', { state: 'visible', timeout: 15000 });
  return page;
}

async function seedMagicSession(page, request, accountType = 'default') {
  const session = await getOrCreateVaultSession(request, accountType);
  await installEdgeSession(page, session);
  return session;
}

module.exports = {
  getVaultCreds,
  hasVaultCreds,
  installEdgeSession,
  loginVaultMember,
  loginVaultMemberByType,
  loginVaultMemberWithTheme,
  seedVaultSession,
};
