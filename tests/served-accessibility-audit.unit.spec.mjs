import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditServed, readOnlyRequest, main, ORIGIN, ROUTES, OUTPUT } from '../scripts/audit-served-accessibility.mjs';

function fixture({ violations = [], challengeAt = -1, badStatusAt = -1, errorAt = -1 } = {}) {
  const visits = [], contexts = [], reports = [];
  const calls = { analyzed: 0, contextClosed: 0, browserClosed: 0 };
  const launchBrowser = async () => ({
    async newContext(options) {
      const index = contexts.length;
      contexts.push(options);
      let url;
      return {
        async route(pattern, handler) {
          assert.equal(pattern, '**/*');
          assert.equal(handler, readOnlyRequest);
        },
        async newPage() {
          return {
            index,
            setDefaultTimeout() {},
            async goto(target) {
              url = target;
              visits.push(target);
              return { status: () => index === badStatusAt ? 403 : 200 };
            },
            url: () => url,
            title: async () => index === challengeAt ? 'Just a moment…' : 'VaultSpark Studios',
            locator: () => ({ count: async () => 0 }),
          };
        },
        close: async () => { calls.contextClosed++; },
      };
    },
    close: async () => { calls.browserClosed++; },
  });
  return {
    visits, contexts, reports, calls,
    options: {
      launchBrowser,
      async analyze(page) {
        calls.analyzed++;
        if (page.index === errorAt) throw Error('private diagnostic omitted');
        return { violations };
      },
      writeReport: async report => reports.push(report),
    },
  };
}

test('supplement scans all six fixed served routes including Contact in clean public contexts', async () => {
  assert.deepEqual(ROUTES, ['/', '/games/', '/community/', '/leaderboards/', '/journal/', '/contact/']);
  assert.equal(OUTPUT, 'axe-results/served-accessibility.json');
  const f = fixture();
  const report = await auditServed(f.options);
  assert.deepEqual(f.visits, ROUTES.map(route => ORIGIN + route));
  assert(f.contexts.every(options => JSON.stringify(options) === '{"serviceWorkers":"block"}'));
  assert.deepEqual(f.calls, { analyzed: 6, contextClosed: 6, browserClosed: 1 });
  assert.equal(report.complete, true);
  assert.equal(report.failed, false);
  assert.equal(f.reports.length, 1);
});

test('every violation impact and iframe finding is retained and makes the result fail', async () => {
  const impacts = ['minor', 'moderate', 'serious', 'critical', null];
  const violations = impacts.map((impact, i) => ({
    id: 'fixture-rule-' + i, impact, description: 'fixture',
    nodes: [{ target: ['iframe'], html: '<iframe></iframe>' }],
  }));
  const report = await auditServed(fixture({ violations }).options);
  assert.equal(report.complete, true);
  assert.equal(report.failed, true);
  for (const row of report.results) {
    assert.deepEqual(row.violations.map(violation => violation.impact), impacts);
    assert.deepEqual(row.violations[0].nodes[0].target, ['iframe']);
  }
});

test('challenge, HTTP and analyzer errors leave six records but incomplete coverage', async () => {
  const f = fixture({ challengeAt: 0, badStatusAt: 1, errorAt: 2 });
  const report = await auditServed(f.options);
  assert.equal(report.results.length, 6);
  assert.equal(report.complete, false);
  assert.equal(report.failed, true);
  assert.equal(report.results[0].error, 'served_page_unavailable_or_challenged');
  assert.equal(report.results[1].error, 'served_page_unavailable_or_challenged');
  assert.equal(report.results[2].error, 'served_audit_failed');
  assert(!JSON.stringify(report).includes('private diagnostic'));
  assert.equal(f.calls.analyzed, 4);
  assert.equal(f.calls.contextClosed, 6);
  assert.equal(f.calls.browserClosed, 1);
});

test('read-only network guard refuses writes, malformed URLs and cleartext', async () => {
  for (const [method, url] of [
    ...['POST', 'PUT', 'PATCH', 'DELETE'].map(method => [method, ORIGIN + '/contact/submit']),
    ['GET', 'http://localhost/'], ['GET', 'invalid-url'],
  ]) {
    let blocked = false;
    await readOnlyRequest({
      request: () => ({ method: () => method, url: () => url }),
      abort: async () => { blocked = true; },
      continue: async () => assert.fail('unsafe request continued'),
    });
    assert.equal(blocked, true);
  }
  for (const method of ['GET', 'HEAD']) {
    let continued = false;
    await readOnlyRequest({
      request: () => ({ method: () => method, url: () => ORIGIN + '/assets/style.css' }),
      abort: async () => assert.fail('safe read blocked'),
      continue: async () => { continued = true; },
    });
    assert.equal(continued, true);
  }
});

test('CLI is inert without explicit fixed audit mode and has no auth/form paths', async () => {
  assert.equal((await main(['--help'])).network, false);
  await assert.rejects(main([]), /explicit_served_production_audit_required/);
  await assert.rejects(main(['--audit-served-production', '--origin=https://elsewhere.invalid']));
  const source = fs.readFileSync(new URL('../scripts/audit-served-accessibility.mjs', import.meta.url), 'utf8');
  assert(!/VAULT_TEST|loginVault|storageState|\.click\(|\.fill\(|\.withTags\(|\.exclude\(/.test(source));
});
