const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_ANON_KEY = 'sb_publishable_thM93D_GVKW5qzAiZpNl1w_AVGILCij';
const AUTH_STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

function hasVaultCreds() {
  return Boolean(process.env.VAULT_TEST_EMAIL && process.env.VAULT_TEST_PASSWORD);
}

async function createVaultSession(request) {
  const res = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    data: {
      email: process.env.VAULT_TEST_EMAIL,
      password: process.env.VAULT_TEST_PASSWORD,
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

async function seedVaultSession(page, request) {
  const session = await createVaultSession(request);
  await page.addInitScript(
    ({ key, sessionData }) => {
      window.localStorage.setItem(key, JSON.stringify(sessionData));
    },
    {
      key: AUTH_STORAGE_KEY,
      sessionData: {
        currentSession: session,
        expiresAt: session.expires_at,
        user: session.user,
      },
    }
  );
  return session;
}

async function loginVaultMember(page, request) {
  await seedVaultSession(page, request);
  await page.goto('/vault-member/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#dashboard-view', { state: 'visible', timeout: 15000 });
  return page;
}

async function loginVaultMemberWithTheme(page, request, theme) {
  const session = await createVaultSession(request);
  await page.addInitScript(
    ({ authKey, sessionData, themeKey, themeValue }) => {
      window.localStorage.setItem(authKey, JSON.stringify(sessionData));
      window.localStorage.setItem(themeKey, themeValue);
    },
    {
      authKey: AUTH_STORAGE_KEY,
      sessionData: {
        currentSession: session,
        expiresAt: session.expires_at,
        user: session.user,
      },
      themeKey: 'vs_theme',
      themeValue: theme,
    }
  );
  await page.goto('/vault-member/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#dashboard-view', { state: 'visible', timeout: 15000 });
  return page;
}

module.exports = {
  AUTH_STORAGE_KEY,
  hasVaultCreds,
  loginVaultMember,
  loginVaultMemberWithTheme,
  seedVaultSession,
};
