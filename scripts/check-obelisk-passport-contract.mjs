#!/usr/bin/env node
/**
 * Obelisk Passport contract gate.
 *
 * Keeps the public login/callback pages, Cloudflare verifier route, identity
 * wrapper, adoption posture, and unit tests aligned. This does not assert the
 * provider is fully flipped; it proves this repo's browser-safe integration
 * remains wired and fail-closed until verifier credentials arrive.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function assert(ok, message, failures) {
  if (!ok) failures.push(message);
}

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
    assert(/vs_obelisk_session/.test(html), `${name}: callback must store minimal verified session`, failures);
    assert(/identityId/.test(html) && /capabilities/.test(html), `${name}: callback must preserve identity id + capabilities`, failures);
  }

  assert(/url\.pathname === '\/api\/obelisk-verify'/.test(files.worker), 'Worker route /api/obelisk-verify is not wired', failures);
  assert(/verifyObeliskSession\(\{ token: body\?\.token, env \}\)/.test(files.worker), 'Worker route must call verifyObeliskSession with env', failures);
  assert(/OBELISK_VERIFY_SECRET/.test(files.workerLib), 'worker-lib must fail closed on missing Obelisk verifier secret', failures);
  assert(/OBELISK_VERIFY_DEFAULT_ENDPOINT/.test(files.tests), 'unit tests must pin the default verifier endpoint', failures);
  assert(/missing_config/.test(files.tests) && /identity_missing/.test(files.tests), 'unit tests must cover fail-closed verifier outcomes', failures);
  assert(/readObeliskSession/.test(files.identity), 'VSIdentity must read Obelisk Passport bridge state', failures);
  assert(/verifierBridge/.test(files.identity), 'VSIdentity capabilities must expose verifierBridge', failures);
  assert(/\*\*Posture:\*\* `phase-1-passport-bridge`/.test(files.adoption), 'Obelisk adoption posture must be phase-1-passport-bridge', failures);
  assert(/check-obelisk-passport-contract\.mjs/.test(files.packageJson), 'build:check must include this contract gate', failures);

  return failures;
}

function selfTest() {
  const good = {
    identity: 'function readObeliskSession(){} const x={verifierBridge:true};',
    callback: "fetch('/api/obelisk-verify'); sessionStorage.setItem('vs_obelisk_session', JSON.stringify({identityId:d.identityId, capabilities:d.capabilities}));",
    passportCallback: "fetch('/api/obelisk-verify'); sessionStorage.setItem('vs_obelisk_session', JSON.stringify({identityId:d.identityId, capabilities:d.capabilities}));",
    login: '<script src="https://obeliskgate.com/auth-client.js" data-obelisk-return="https://vaultsparkstudios.com/auth/callback" data-obelisk-project="VaultSpark Studios"></script>',
    passportLogin: '<script src="https://obeliskgate.com/auth-client.js" data-obelisk-return="https://vaultsparkstudios.com/auth/callback" data-obelisk-project="VaultSpark Studios"></script>',
    worker: "if (url.pathname === '/api/obelisk-verify') { const result = await verifyObeliskSession({ token: body?.token, env }); }",
    workerLib: 'const secret = env.OBELISK_VERIFY_SECRET;',
    tests: 'OBELISK_VERIFY_DEFAULT_ENDPOINT missing_config identity_missing',
    adoption: '**Posture:** `phase-1-passport-bridge`',
    packageJson: 'node scripts/check-obelisk-passport-contract.mjs',
  };
  const fail = check({ ...good, callback: 'missing bridge' });
  if (!fail.some((x) => x.includes('callback must POST'))) {
    console.error('self-test failed: bad callback was not rejected');
    process.exit(1);
  }
  const pass = check(good);
  if (pass.length) {
    console.error('self-test failed: good fixture rejected');
    for (const f of pass) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('check-obelisk-passport-contract --self-test: OK');
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  const failures = check();
  if (failures.length) {
    console.error(`check-obelisk-passport-contract: ${failures.length} failure(s)`);
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
  console.log('check-obelisk-passport-contract: OK (Passport bridge wired, fail-closed, and gated)');
}