#!/usr/bin/env node
/**
 * Obelisk identity-plane activation gate.
 *
 * Static contract proof is paired with tests/obelisk-auth.unit.spec.js, which
 * executes authorization-code + PKCE → ES256 verification → UUID bridge →
 * signed edge session → browser compatibility-session round trip hermetically.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(ROOT, relative), 'utf8');
const assert = (condition, message, failures) => { if (!condition) failures.push(message); };

function check(fixtures = null) {
  const files = fixtures || {
    auth: read('cloudflare/obelisk-auth.js'),
    worker: read('cloudflare/security-headers-worker.js'),
    client: read('assets/supabase-client.js'),
    identity: read('assets/identity.js'),
    signedState: read('assets/signed-in-state.js'),
    chipLoader: read('assets/account-chip-loader.js'),
    member: read('vault-member/index.html'),
    memberAuth: read('vault-member/portal-auth.js'),
    investor: read('investor-portal/login/index.html'),
    tests: read('tests/obelisk-auth.unit.spec.js'),
    packageJson: read('package.json'),
    readiness: read('scripts/check-obelisk-redirect-readiness.mjs'),
    deployStaging: read('scripts/deploy-staging.mjs'),
    readinessReceipt: read('api/obelisk-redirect-readiness.json'),
    stagingReleaseGate: read('scripts/run-staging-release-gate.mjs'),
  };
  const failures = [];

  assert(/response_type.*code/.test(files.auth), 'OIDC authorization-code flow is missing', failures);
  assert(/code_challenge_method.*S256/.test(files.auth), 'PKCE S256 is not enforced', failures);
  assert(/state.*nonce.*verifier/.test(files.auth), 'state, nonce, and verifier flow state is incomplete', failures);
  assert(/header\.alg !== 'ES256'/.test(files.auth), 'ES256 algorithm pin is missing', failures);
  assert(/email_verified !== true/.test(files.auth), 'verified-email requirement is missing', failures);
  assert(/id_token_nonce_invalid/.test(files.auth), 'OIDC nonce verification is missing', failures);
  assert(/auth:session:/.test(files.auth) && /HttpOnly; Secure; SameSite=Lax/.test(files.auth), 'signed server-side session contract is missing', failures);
  assert(/SUPABASE_SERVICE_ROLE_KEY/.test(files.auth), 'server-only Supabase continuity bridge is missing', failures);
  assert(/admin\/users\?page=/.test(files.auth) && /app_metadata\?\.obelisk_sub/.test(files.auth), 'Obelisk subject → preserved UUID lookup is missing', failures);
  assert(/supabase_session_identity_mismatch/.test(files.auth), 'compatibility-session UUID invariant is missing', failures);

  assert(/handleObeliskAuthRequest/.test(files.worker), 'Worker does not terminate the Obelisk auth routes', failures);
  assert(/authenticateObeliskRequest/.test(files.worker), 'portal gate does not validate a live Obelisk edge session', failures);
  assert(!/const session = getCookie\(request, cookieName\)/.test(files.worker), 'portal gate still trusts cookie presence', failures);

  assert(/VSAuthReady/.test(files.client) && /\/api\/auth\/session/.test(files.client), 'browser does not bootstrap from the authoritative edge session', failures);
  assert(/scope: 'local'/.test(files.client), 'legacy browser-only sessions are not cleared locally', failures);
  assert(/persistSession: false/.test(files.client) && /autoRefreshToken: false/.test(files.client), 'compatibility credentials are still independently persisted or refreshed', failures);
  assert(/clearLegacyAuthStorage/.test(files.client), 'legacy Supabase browser credentials are not actively retired', failures);
  assert(!/await authReady\.catch\([\s\S]{0,120}return rawGetSession/.test(files.client), 'bridge failure can still fall through to a stale Supabase session', failures);
  assert(!/access_token=.*refresh_token=/.test(files.client), 'bearer tokens are still transported in URL fragments', failures);
  assert(/\/api\/auth\/me/.test(files.signedState), 'ambient signed-in state does not verify the edge session', failures);
  assert(!/auth-token|supabase\.auth\.token|readPersistedSession/.test(files.signedState), 'ambient signed-in state still trusts browser-persisted credentials', failures);
  assert(!/localStorage|readPersistedSession|auth-token/.test(files.chipLoader), 'account chip loader can still resurrect a browser-persisted session', failures);
  assert(/provider: 'obelisk'/.test(files.identity), 'VSIdentity does not report Obelisk as the active provider', failures);
  assert(/Obelisk is the required VaultSpark identity provider/.test(files.identity), 'identity facade remains provider-swappable on this required surface', failures);

  for (const [name, html] of [['member', files.member], ['investor', files.investor]]) {
    assert(/data-obelisk-seal/.test(html), `${name} auth surface is missing the live Obelisk seal`, failures);
    assert(/\/login\?intent=signin/.test(html), `${name} auth surface does not start the OIDC edge flow`, failures);
    // S343: the assertion above tests for an ATTRIBUTE STRING, and the element it
    // marks is an empty div that nothing in this repo hydrates — so it passed
    // against a blank placeholder for as long as it has existed. The real seal is
    // an iframe rendered by https://obeliskgate.com/embed/seal.js (live, 200), and
    // our markup already matches its documented usage exactly. It is NOT loaded
    // because doing so needs `script-src` and `frame-src` widened to a third-party
    // origin on the authentication surface — a security change reserved for the
    // Studio Owner (SOUL: "Security is not negotiable"; CLAUDE.md: escalate auth).
    //
    // Until that decision, assert the load-bearing thing instead of the decorative
    // one: the seal must carry the login URL it claims to protect, so a stale or
    // mismatched entry point cannot hide behind a placeholder that renders nothing.
    const seal = html.match(/<div[^>]*data-obelisk-seal[^>]*>/);
    assert(seal && /data-login-url="\/login\?intent=(signin|signup)/.test(seal[0]),
      `${name} Obelisk seal does not declare the login URL it fronts`, failures);
    assert(seal && /data-rp="vaultsparkstudios-website"/.test(seal[0]),
      `${name} Obelisk seal does not declare the relying party it authenticates`, failures);
  }
  assert(!/id="signupPassword"/.test(files.investor), 'investor enrollment still asks VaultSpark to create a password', failures);
  assert(/investor_requests/.test(files.investor) && /prior_gaming:/.test(files.investor), 'investor application workflow was not preserved', failures);
  assert(/register_open/.test(files.memberAuth), 'member profile onboarding was not preserved', failures);

  assert(/authorization-code \+ PKCE callback creates a live edge session/.test(files.tests), 'behavioral round-trip test is missing', failures);
  assert(/without exposing Obelisk tokens/.test(files.tests), 'non-disclosure behavior is not tested', failures);
  assert(/bridge outage rejects a stale browser session/.test(files.tests), 'browser fail-closed behavior is not tested', failures);
  assert(/corrupt flow state fails closed/.test(files.tests), 'corrupt OIDC state behavior is not tested', failures);
  assert(/obelisk-auth\.unit\.spec\.js/.test(files.packageJson), 'Obelisk behavioral tests are not wired into package scripts', failures);
  assert(/altered-callback-host/.test(files.readiness) && /foreign-client/.test(files.readiness),
    'redirect readiness is missing tenant/client negative controls', failures);
  assert(/publicSafe:\s*true/.test(files.readiness) && !/responseBody\s*:/.test(files.readiness),
    'redirect readiness can retain provider response content', failures);
  assert(/check-obelisk-redirect-readiness\.mjs/.test(files.deployStaging) && /--require-ready/.test(files.deployStaging),
    'staging deploy does not fail fast on relying-party redirect readiness', failures);
  assert(/STAGING_RELEASE_REQUIRED/.test(files.stagingReleaseGate) && /expectedTests:\s*EXPECTED_TESTS/.test(files.stagingReleaseGate),
    'staging browser release mode is not explicit or count-bound', failures);
  assert(/skipped/.test(files.stagingReleaseGate) && /state:\s*reasons\.length === 0 \? 'passed' : 'rejected'/.test(files.stagingReleaseGate),
    'staging browser release gate does not reject skipped tests', failures);
  assert(!/rawOutput\s*:/.test(files.stagingReleaseGate) && /publicSafe:\s*true/.test(files.stagingReleaseGate),
    'staging browser release receipt can retain raw output', failures);
  try {
    const receipt = JSON.parse(files.readinessReceipt);
    assert(['passed', 'rejected', 'unverified'].includes(receipt.state), 'redirect readiness receipt has an unknown state', failures);
    assert(receipt.publicSafe === true && receipt.exact && receipt.negativeControls?.length === 2,
      'redirect readiness receipt is missing public-safe exact/negative evidence', failures);
  } catch {
    failures.push('redirect readiness receipt is missing or malformed');
  }
  return failures;
}

function selfTest() {
  const good = {
    auth: "response_type code code_challenge_method S256 state nonce verifier if (header.alg !== 'ES256'){} if (claims.email_verified !== true){} id_token_nonce_invalid auth:session: HttpOnly; Secure; SameSite=Lax SUPABASE_SERVICE_ROLE_KEY /auth/v1/admin/users?page= user.app_metadata?.obelisk_sub supabase_session_identity_mismatch",
    worker: 'handleObeliskAuthRequest authenticateObeliskRequest',
    client: "VSAuthReady /api/auth/session scope: 'local' persistSession: false autoRefreshToken: false clearLegacyAuthStorage",
    identity: "provider: 'obelisk' Obelisk is the required VaultSpark identity provider",
    signedState: '/api/auth/me',
    chipLoader: 'VSSignedInState.getSession',
    member: '<div data-obelisk-seal data-rp="vaultsparkstudios-website" data-login-url="/login?intent=signin"></div> /login?intent=signin',
    memberAuth: 'register_open',
    investor: '<div data-obelisk-seal data-rp="vaultsparkstudios-website" data-login-url="/login?intent=signin"></div> /login?intent=signin investor_requests prior_gaming:',
    tests: 'authorization-code + PKCE callback creates a live edge session without exposing Obelisk tokens bridge outage rejects a stale browser session corrupt flow state fails closed',
    packageJson: 'obelisk-auth.unit.spec.js',
    readiness: 'altered-callback-host foreign-client publicSafe: true',
    deployStaging: 'check-obelisk-redirect-readiness.mjs --require-ready',
    readinessReceipt: '{"state":"rejected","publicSafe":true,"exact":{"state":"rejected"},"negativeControls":[{},{}]}',
    stagingReleaseGate: "STAGING_RELEASE_REQUIRED expectedTests: EXPECTED_TESTS skipped state: reasons.length === 0 ? 'passed' : 'rejected' publicSafe: true",
  };
  const pass = check(good);
  if (pass.length) throw new Error(`good activation fixture rejected: ${pass.join('; ')}`);
  const cookieOnly = check({ ...good, worker: 'handleObeliskAuthRequest authenticateObeliskRequest const session = getCookie(request, cookieName)' });
  if (!cookieOnly.some((item) => item.includes('cookie presence'))) throw new Error('cookie-presence regression was not rejected');
  const tokenLeak = check({ ...good, client: "VSAuthReady /api/auth/session scope: 'local' access_token=x&refresh_token=y" });
  if (!tokenLeak.some((item) => item.includes('URL fragments'))) throw new Error('URL token leak was not rejected');
  const persisted = check({ ...good, client: "VSAuthReady /api/auth/session scope: 'local' persistSession: true autoRefreshToken: true clearLegacyAuthStorage" });
  if (!persisted.some((item) => item.includes('independently persisted'))) throw new Error('persistent compatibility-session regression was not rejected');
  const ambientBypass = check({ ...good, signedState: "/api/auth/me readPersistedSession sb-project-auth-token" });
  if (!ambientBypass.some((item) => item.includes('browser-persisted'))) throw new Error('ambient persisted-session bypass was not rejected');
  const missingRedirectGate = check({ ...good, deployStaging: 'deploy without identity preflight' });
  if (!missingRedirectGate.some((item) => item.includes('fail fast'))) throw new Error('missing redirect deploy gate was not rejected');
  console.log('check-obelisk-passport-contract --self-test: OK (activation + 5 negative paths)');
}

if (process.argv.includes('--self-test')) {
  try { selfTest(); } catch (error) { console.error(`self-test failed: ${error.message}`); process.exit(1); }
} else {
  const failures = check();
  if (failures.length) {
    console.error(`check-obelisk-passport-contract: ${failures.length} failure(s)`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }
  console.log('check-obelisk-passport-contract: OK (Obelisk identity plane active; behavioral suite wired)');
}
