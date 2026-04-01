import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const DEFAULT_SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const DEFAULT_ENV_PATH = '.env.playwright.local';

const nowIso = new Date().toISOString();
const plus30DaysIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

const config = {
  supabaseUrl: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  envPath: process.env.PLAYWRIGHT_ENV_PATH || DEFAULT_ENV_PATH,
  writeEnv: process.env.WRITE_PLAYWRIGHT_ENV !== '0',
  accounts: [
    {
      kind: 'free',
      email: process.env.VAULT_FREE_TEST_EMAIL || '',
      password: process.env.VAULT_FREE_TEST_PASSWORD || generatePassword(),
      username: process.env.VAULT_FREE_TEST_USERNAME || 'vaultfreeqa',
      plan: 'free',
      status: 'inactive',
      isSparked: false,
      points: 10,
    },
    {
      kind: 'sparked',
      email: process.env.VAULT_SPARKED_TEST_EMAIL || '',
      password: process.env.VAULT_SPARKED_TEST_PASSWORD || generatePassword(),
      username: process.env.VAULT_SPARKED_TEST_USERNAME || 'vaultsparkedqa',
      plan: 'vault_sparked',
      status: 'active',
      isSparked: true,
      points: 100,
    },
    {
      kind: 'promogrind',
      email:
        process.env.VAULT_PROMOGRIND_TEST_EMAIL ||
        derivePromoGrindEmail(
          process.env.VAULT_FREE_TEST_EMAIL || process.env.VAULT_SPARKED_TEST_EMAIL || ''
        ),
      password: process.env.VAULT_PROMOGRIND_TEST_PASSWORD || generatePassword(),
      username: process.env.VAULT_PROMOGRIND_TEST_USERNAME || 'vaultproqa',
      plan: 'promogrind_pro',
      status: 'active',
      isSparked: false,
      points: 100,
    },
  ],
};

main().catch((error) => {
  console.error(`Provisioning failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  if (!config.serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
  }

  const requestedAccounts = config.accounts.filter((account) => account.email);
  if (!requestedAccounts.length) {
    throw new Error(
      'Provide at least one target email via VAULT_FREE_TEST_EMAIL or VAULT_SPARKED_TEST_EMAIL.'
    );
  }

  const results = [];

  for (const account of requestedAccounts) {
    const authUser = await getOrCreateAuthUser(account);
    const member = await ensureVaultMember(authUser, account);
    const subscription = await ensureSubscription(authUser.id, account);
    results.push({ account, authUser, member, subscription });
  }

  if (config.writeEnv) {
    await updatePlaywrightEnv(results);
  }

  console.log('');
  console.log('Provisioned accounts:');
  for (const result of results) {
    console.log(
      `- ${result.account.kind}: ${result.account.email} | username=${result.member.username} | plan=${result.subscription?.plan || result.account.plan}`
    );
  }
  console.log('');
  console.log(`Playwright env file: ${path.resolve(config.envPath)}`);
}

function generatePassword() {
  return `Vault!${crypto.randomBytes(9).toString('base64url')}`;
}

function derivePromoGrindEmail(sourceEmail) {
  if (!sourceEmail || !sourceEmail.includes('@')) return '';
  const [local, domain] = sourceEmail.split('@');
  if (!local || !domain) return '';
  return `${local}+promogrind@${domain}`;
}

function buildHeaders(extra = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function supabaseFetch(urlPath, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${urlPath}`, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${urlPath} failed (${response.status}): ${text}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function listAuthUsers() {
  const data = await supabaseFetch('/auth/v1/admin/users?page=1&per_page=1000', {
    headers: buildHeaders(),
  });
  return data?.users || [];
}

async function findAuthUserByEmail(email) {
  const users = await listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function createAuthUser(account) {
  try {
    return await supabaseFetch('/auth/v1/admin/users', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          username: account.username,
          provisioned_by: 'scripts/provision-vault-test-accounts.mjs',
          provisioned_at: nowIso,
          vault_test_account: true,
          vault_test_kind: account.kind,
        },
      }),
    });
  } catch (error) {
    if (!/already exists|registered/i.test(error.message)) throw error;
    return null;
  }
}

async function updateAuthUser(userId, account) {
  return supabaseFetch(`/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({
      password: account.password,
      email_confirm: true,
      user_metadata: {
        username: account.username,
        provisioned_by: 'scripts/provision-vault-test-accounts.mjs',
        provisioned_at: nowIso,
        vault_test_account: true,
        vault_test_kind: account.kind,
      },
    }),
  });
}

async function getOrCreateAuthUser(account) {
  let user = await findAuthUserByEmail(account.email);
  if (!user) {
    user = await createAuthUser(account);
  }
  if (!user) {
    user = await findAuthUserByEmail(account.email);
  }
  if (!user?.id) {
    throw new Error(`Could not create or find auth user for ${account.email}`);
  }
  return updateAuthUser(user.id, account);
}

async function findMemberById(userId) {
  const rows = await supabaseFetch(`/rest/v1/vault_members?id=eq.${encodeURIComponent(userId)}&select=*`, {
    headers: buildHeaders(),
  });
  return rows?.[0] || null;
}

async function usernameExists(usernameLower) {
  const rows = await supabaseFetch(
    `/rest/v1/vault_members?username_lower=eq.${encodeURIComponent(usernameLower)}&select=id,username`,
    { headers: buildHeaders() }
  );
  return rows?.[0] || null;
}

async function ensureUniqueUsername(baseUsername, userId) {
  const cleaned = (baseUsername || 'vaultmemberqa').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  let candidate = cleaned || 'vaultmemberqa';
  let suffix = 0;

  while (true) {
    const existing = await usernameExists(candidate);
    if (!existing || existing.id === userId) return candidate;
    suffix += 1;
    candidate = `${cleaned || 'vaultmemberqa'}${suffix}`;
  }
}

async function ensureVaultMember(authUser, account) {
  const existing = await findMemberById(authUser.id);
  const usernameLower = await ensureUniqueUsername(account.username, authUser.id);
  const username = existing?.username || usernameLower;
  const achievements = [
    { id: 'joined', earned: nowIso },
    ...(account.isSparked ? [{ id: 'subscribed', earned: nowIso }] : []),
  ];

  const payload = {
    id: authUser.id,
    username,
    username_lower: usernameLower,
    points: Math.max(existing?.points || 0, account.points),
    subscribed: true,
    prefs: existing?.prefs || { updates: true, lore: true, access: true },
    achievements: existing?.achievements?.length ? existing.achievements : achievements,
    is_sparked: account.isSparked,
  };

  const method = existing ? 'PATCH' : 'POST';
  const url = existing
    ? `/rest/v1/vault_members?id=eq.${encodeURIComponent(authUser.id)}`
    : '/rest/v1/vault_members';
  const headers = buildHeaders({
    Prefer: existing ? 'return=representation' : 'return=representation,resolution=merge-duplicates',
  });

  const rows = await supabaseFetch(url, {
    method,
    headers,
    body: JSON.stringify(existing ? payload : [payload]),
  });

  return Array.isArray(rows) ? rows[0] : rows;
}

async function ensureSubscription(userId, account) {
  const needsActiveSubscription = account.plan !== 'free' && account.status === 'active';
  const payload = {
    user_id: userId,
    stripe_customer_id: needsActiveSubscription ? `test_customer_${account.kind}_${userId}` : null,
    stripe_subscription_id: needsActiveSubscription ? `test_subscription_${account.kind}_${userId}` : null,
    plan: account.plan,
    status: account.status,
    current_period_end: needsActiveSubscription ? plus30DaysIso : null,
    updated_at: nowIso,
  };

  const rows = await supabaseFetch('/rest/v1/subscriptions?on_conflict=user_id', {
    method: 'POST',
    headers: buildHeaders({
      Prefer: 'return=representation,resolution=merge-duplicates',
    }),
    body: JSON.stringify([payload]),
  });

  return rows?.[0] || null;
}

function parseEnv(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    values[key] = value;
  }
  return values;
}

async function updatePlaywrightEnv(results) {
  const envPath = path.resolve(config.envPath);
  let existing = {};

  try {
    existing = parseEnv(await fs.readFile(envPath, 'utf8'));
  } catch (_) {
    existing = {};
  }

  const merged = {
    BASE_URL: existing.BASE_URL || 'https://vaultsparkstudios.com',
    VAULT_TEST_EMAIL: existing.VAULT_TEST_EMAIL || '',
    VAULT_TEST_PASSWORD: existing.VAULT_TEST_PASSWORD || '',
    VAULT_FREE_TEST_EMAIL: existing.VAULT_FREE_TEST_EMAIL || '',
    VAULT_FREE_TEST_PASSWORD: existing.VAULT_FREE_TEST_PASSWORD || '',
    VAULT_SPARKED_TEST_EMAIL: existing.VAULT_SPARKED_TEST_EMAIL || '',
    VAULT_SPARKED_TEST_PASSWORD: existing.VAULT_SPARKED_TEST_PASSWORD || '',
    VAULT_PROMOGRIND_TEST_EMAIL: existing.VAULT_PROMOGRIND_TEST_EMAIL || '',
    VAULT_PROMOGRIND_TEST_PASSWORD: existing.VAULT_PROMOGRIND_TEST_PASSWORD || '',
  };

  for (const result of results) {
    if (result.account.kind === 'free') {
      merged.VAULT_TEST_EMAIL = result.account.email;
      merged.VAULT_TEST_PASSWORD = result.account.password;
      merged.VAULT_FREE_TEST_EMAIL = result.account.email;
      merged.VAULT_FREE_TEST_PASSWORD = result.account.password;
    }
    if (result.account.kind === 'sparked') {
      merged.VAULT_SPARKED_TEST_EMAIL = result.account.email;
      merged.VAULT_SPARKED_TEST_PASSWORD = result.account.password;
    }
    if (result.account.kind === 'promogrind') {
      merged.VAULT_PROMOGRIND_TEST_EMAIL = result.account.email;
      merged.VAULT_PROMOGRIND_TEST_PASSWORD = result.account.password;
    }
  }

  const content = [
    `BASE_URL=${merged.BASE_URL}`,
    '',
    `VAULT_TEST_EMAIL=${merged.VAULT_TEST_EMAIL}`,
    `VAULT_TEST_PASSWORD=${merged.VAULT_TEST_PASSWORD}`,
    '',
    `VAULT_FREE_TEST_EMAIL=${merged.VAULT_FREE_TEST_EMAIL}`,
    `VAULT_FREE_TEST_PASSWORD=${merged.VAULT_FREE_TEST_PASSWORD}`,
    '',
    `VAULT_SPARKED_TEST_EMAIL=${merged.VAULT_SPARKED_TEST_EMAIL}`,
    `VAULT_SPARKED_TEST_PASSWORD=${merged.VAULT_SPARKED_TEST_PASSWORD}`,
    '',
    `VAULT_PROMOGRIND_TEST_EMAIL=${merged.VAULT_PROMOGRIND_TEST_EMAIL}`,
    `VAULT_PROMOGRIND_TEST_PASSWORD=${merged.VAULT_PROMOGRIND_TEST_PASSWORD}`,
    '',
  ].join('\n');

  await fs.writeFile(envPath, content, 'utf8');
}
