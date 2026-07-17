#!/usr/bin/env node
/**
 * Obelisk Passport scaffold truth gate.
 *
 * Proves the isolated pages and fail-closed verifier route still exist while
 * preventing file/string presence from being reported as provider activation.
 * Full integration requires the pending behavioral callback -> storage ->
 * VSIdentity.getSession() contract and an authorized provider migration.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const assert = (ok, message, failures) => { if (!ok) failures.push(message); };

function check(fixtures = null) {
  const files = fixtures || {
    identity: read('assets/identity.js'),
    callback: read('auth/callback.html'),
    passportCallback: read('obelisk-passport/callback.html'),
    login: read('login.html'),
    passportLogin: read('obelisk-passport/login.html'),
    worker: read('cloudflare/security-headers-worker.js'),
    workerLib: read('cloudflare/worker-lib.mjs'),
    tests: read('tests/worker.unit.spec.js'),
    adoption: read('context/OBELISK_ADOPTION.md'),
    packageJson: read('package.json'),
  };
  const failures = [];

  for (const [name, html] of [['login.html', files.login], ['obelisk-passport/login.html', files.passportLogin]]) {
    assert(/https:\/\/obeliskgate\.com\/auth-client\.js/.test(html), `${name}: missing Obelisk auth client`, failures);
    assert(/data-obelisk-return="https:\/\/vaultsparkstudios\.com\/auth\/callback"/.test(html), `${name}: return URL must target /auth/callback`, failures);
    assert(/data-obelisk-project="VaultSpark Studios"/.test(html), `${name}: project label drifted`, failures);
  }

  for (const [name, html] of [['auth/callback.html', files.callback], ['obelisk-passport/callback.html', files.passportCallback]]) {
    assert(/\/api\/obelisk-verify/.test(html), `${name}: callback must POST to /api/obelisk-verify`, failures);
    assert(/vs_obelisk_session/.test(html), `${name}: callback must store the isolated session key`, failures);
    assert(/identityId/.test(html) && /capabilities/.test(html), `${name}: callback scaffold shape drifted`, failures);
  }

  assert(/url\.pathname === '\/api\/obelisk-verify'/.test(files.worker), 'Worker route /api/obelisk-verify is not wired', failures);
  assert(/verifyObeliskSession\(\{ token: body\?\.token, env \}\)/.test(files.worker), 'Worker route must call verifyObeliskSession with env', failures);
  assert(/OBELISK_VERIFY_SECRET/.test(files.workerLib), 'worker-lib must fail closed on missing verifier secret', failures);
  assert(/OBELISK_VERIFY_DEFAULT_ENDPOINT/.test(files.tests), 'unit tests must pin the verifier endpoint', failures);
  assert(/missing_config/.test(files.tests) && /identity_missing/.test(files.tests), 'unit tests must cover fail-closed verifier outcomes', failures);
  assert(/readObeliskSession/.test(files.identity), 'VSIdentity must retain the isolated scaffold reader', failures);

  // Truth boundary: these assertions intentionally describe today's incomplete
  // state. Raising posture requires replacing this boundary with behavioral proof.
  assert(/let activeProvider = 'supabase'/.test(files.identity), 'active provider truth changed; run the authorized migration gate', failures);
  assert(/raw\.sub && raw\.token/.test(files.identity), 'Obelisk normalizer shape changed; add/execute the behavioral round-trip gate', failures);
  assert(/\*\*Posture:\*\* `phase-1-scaffold-incomplete`/.test(files.adoption), 'Obelisk posture must remain phase-1-scaffold-incomplete until behavioral activation passes', failures);
  assert(/does not execute callback/.test(files.adoption) || /does not currently round-trip/.test(files.adoption), 'adoption doc must disclose the missing behavioral round-trip', failures);
  assert(/check-obelisk-passport-contract\.mjs/.test(files.packageJson), 'build:check must include this truth gate', failures);

  return failures;
}

function selfTest() {
  const good = {
    identity: "let activeProvider = 'supabase'; function readObeliskSession(){} if (raw.sub && raw.token){}",
    callback: "fetch('/api/obelisk-verify'); sessionStorage.setItem('vs_obelisk_session', JSON.stringify({identityId:d.identityId, capabilities:d.capabilities}));",
    passportCallback: "fetch('/api/obelisk-verify'); sessionStorage.setItem('vs_obelisk_session', JSON.stringify({identityId:d.identityId, capabilities:d.capabilities}));",
    login: '<script src="https://obeliskgate.com/auth-client.js" data-obelisk-return="https://vaultsparkstudios.com/auth/callback" data-obelisk-project="VaultSpark Studios"></script>',
    passportLogin: '<script src="https://obeliskgate.com/auth-client.js" data-obelisk-return="https://vaultsparkstudios.com/auth/callback" data-obelisk-project="VaultSpark Studios"></script>',
    worker: "if (url.pathname === '/api/obelisk-verify') { const result = await verifyObeliskSession({ token: body?.token, env }); }",
    workerLib: 'const secret = env.OBELISK_VERIFY_SECRET;',
    tests: 'OBELISK_VERIFY_DEFAULT_ENDPOINT missing_config identity_missing',
    adoption: '**Posture:** `phase-1-scaffold-incomplete`\nThe checker does not execute callback behavior.',
    packageJson: 'node scripts/check-obelisk-passport-contract.mjs',
  };

  const badCallback = check({ ...good, callback: 'missing bridge' });
  if (!badCallback.some((x) => x.includes('callback must POST'))) throw new Error('bad callback was not rejected');

  const overclaim = check({ ...good, adoption: '**Posture:** `phase-1-passport-bridge`\nThe checker does not execute callback behavior.' });
  if (!overclaim.some((x) => x.includes('phase-1-scaffold-incomplete'))) throw new Error('integration overclaim was not rejected');

  const providerFlip = check({ ...good, identity: "let activeProvider = 'obelisk'; function readObeliskSession(){} if (raw.sub && raw.token){}" });
  if (!providerFlip.some((x) => x.includes('active provider truth changed'))) throw new Error('unreviewed provider flip was not rejected');

  const pass = check(good);
  if (pass.length) throw new Error('good fixture rejected: ' + pass.join('; '));
  console.log('check-obelisk-passport-contract --self-test: OK (3 negative paths + truthful scaffold)');
}

if (process.argv.includes('--self-test')) {
  try { selfTest(); } catch (error) { console.error('self-test failed:', error.message); process.exit(1); }
} else {
  const failures = check();
  if (failures.length) {
    console.error(`check-obelisk-passport-contract: ${failures.length} failure(s)`);
    for (const failure of failures) console.error('  - ' + failure);
    process.exit(1);
  }
  console.log('check-obelisk-passport-contract: OK (scaffold present; activation explicitly not claimed)');
}
