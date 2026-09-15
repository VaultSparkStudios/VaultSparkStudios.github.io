// page-feedback-payload.unit.spec.js — assets/rate-page.js + assets/micro-feedback.js.
// Both write anonymous rows to Supabase `page_feedback`. The allowed columns and
// CHECK vocabularies are parsed from supabase/migrations/supabase-page-feedback.sql,
// so a widget/schema drift (which would make every insert 400 silently) fails here.
// VSSupabase is stubbed; nothing leaves the fixture origin.
// Run: node --test tests/page-feedback-payload.unit.spec.js
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser, openFixture, html, waitFor, settle, ROOT } from './fixtures/browser-harness.mjs';

const SQL = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', 'supabase-page-feedback.sql'), 'utf8');
const TABLE = /create table if not exists page_feedback \(([\s\S]*?)\n\);/i.exec(SQL);
assert.ok(TABLE, 'page_feedback create table block');
const COLUMNS = TABLE[1].split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.split(/\s+/)[0]);
const INSERTABLE = COLUMNS.filter((c) => c !== 'id' && c !== 'created_at').sort();
function checkValues(column) {
  const m = new RegExp(`${column}\\s+text[^\\n]*?check \\(${column} in \\(([^)]*)\\)\\)`, 'i').exec(TABLE[1]);
  assert.ok(m, `CHECK constraint for ${column}`);
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
}
const REACTIONS = checkValues('reaction');
const BUCKETS = checkValues('visit_depth_bucket');
const UA_KINDS = checkValues('ua_kind');

function assertRowMatchesSchema(row) {
  assert.deepEqual(Object.keys(row).sort(), INSERTABLE, 'payload columns == insertable page_feedback columns');
  assert.equal(typeof row.path, 'string');
  assert.ok(row.path.startsWith('/'));
  assert.ok(REACTIONS.includes(row.reaction), `reaction ${row.reaction} in CHECK ${REACTIONS}`);
  assert.ok(BUCKETS.includes(row.visit_depth_bucket), `bucket ${row.visit_depth_bucket} in CHECK ${BUCKETS}`);
  assert.ok(UA_KINDS.includes(row.ua_kind), `ua_kind ${row.ua_kind} in CHECK ${UA_KINDS}`);
}

// Stub Supabase client. Set localStorage.__stub_fail = '1' to simulate an insert error.
function supabaseStub() {
  window.__inserts = [];
  window.VSSupabase = {
    from(table) {
      return {
        insert(rows) {
          window.__inserts.push({ table, rows: JSON.parse(JSON.stringify(rows)) });
          const fail = localStorage.getItem('__stub_fail') === '1';
          return Promise.resolve(fail ? { error: { message: 'stub failure' } } : { error: null });
        },
      };
    },
  };
}

const RATE = html({ body: '<main>content</main><script src="/assets/rate-page.js"></script>' });
const MICRO = html({
  body: `<div data-micro-feedback-root data-feedback-context="membership"></div>
<script>window.VSPublicIntel = { get: () => Promise.resolve({}), registerEnricher() {} };</script>
<script src="/assets/micro-feedback.js"></script>`,
});
const PAGES = { '/games/': RATE, '/vault-member/': RATE, '/investor-portal/': RATE, '/studio-hub/': RATE, '/membership/': MICRO };

let browser;
before(async () => { browser = await launchBrowser(); });
after(async () => { await browser?.close(); });

async function withFixture(opts, fn) {
  const f = await openFixture(browser, { pages: PAGES, initScripts: [supabaseStub], ...opts });
  try { await fn(f); } finally { await f.close(); }
}
const inserts = (page) => page.evaluate(() => window.__inserts);

test('schema parse sanity: the live CHECK vocabularies are what the widgets target', () => {
  assert.deepEqual(INSERTABLE, ['path', 'reaction', 'ua_kind', 'visit_depth_bucket']);
  assert.deepEqual(REACTIONS, ['useful', 'ok', 'not_useful']);
});

test('rate-page: every button posts one schema-valid row and the button set equals the CHECK set', async () => {
  for (const reaction of REACTIONS) {
    await withFixture({}, async (f) => {
      await f.goto('/games/');
      const offered = await f.page.$$eval('.vs-rate-page__btn', (bs) => bs.map((b) => b.dataset.reaction));
      assert.deepEqual([...offered].sort(), [...REACTIONS].sort(), 'widget offers exactly the CHECK vocabulary');
      await f.page.click(`.vs-rate-page__btn[data-reaction="${reaction}"]`);
      await waitFor(async () => (await inserts(f.page)).length === 1, { message: `insert for ${reaction}` });
      const [ins] = await inserts(f.page);
      assert.equal(ins.table, 'page_feedback');
      assert.equal(ins.rows.length, 1);
      assertRowMatchesSchema(ins.rows[0]);
      assert.deepEqual(ins.rows[0], { path: '/games', reaction, visit_depth_bucket: '1', ua_kind: 'desktop' });
      assert.equal(await f.page.textContent('.vs-rate-page__label'), 'thank you ·');
    });
  }
});

test('rate-page: visit depth is coarse-bucketed into the CHECK buckets', async () => {
  const cases = [['1', '1'], ['0', '1'], ['garbage', '1'], ['2', '2-4'], ['4', '2-4'], ['5', '5-10'], ['10', '5-10'], ['11', '10+'], ['9999', '10+']];
  await withFixture({}, async (f) => {
    await f.goto('/games/');
    for (const [depth, bucket] of cases) {
      await f.page.evaluate((d) => { localStorage.clear(); localStorage.setItem('vs_visit_depth', d); }, depth);
      await f.page.reload({ waitUntil: 'load' });
      await f.page.click('.vs-rate-page__btn[data-reaction="ok"]');
      await waitFor(async () => (await inserts(f.page)).length === 1, { message: `insert depth ${depth}` });
      const row = (await inserts(f.page))[0].rows[0];
      assertRowMatchesSchema(row);
      assert.equal(row.visit_depth_bucket, bucket, `depth ${depth}`);
    }
  });
});

test('rate-page: mobile user agents report ua_kind=mobile', async () => {
  const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
  await withFixture({ contextOptions: { userAgent: ua } }, async (f) => {
    await f.goto('/games/');
    await f.page.click('.vs-rate-page__btn[data-reaction="useful"]');
    await waitFor(async () => (await inserts(f.page)).length === 1);
    const row = (await inserts(f.page))[0].rows[0];
    assertRowMatchesSchema(row);
    assert.equal(row.ua_kind, 'mobile');
  });
});

test('rate-page: 24h cooldown hides the widget; an expired rating shows it again', async () => {
  await withFixture({}, async (f) => {
    await f.goto('/games/');
    await f.page.click('.vs-rate-page__btn[data-reaction="useful"]');
    await waitFor(async () => (await inserts(f.page)).length === 1);
    await f.page.reload({ waitUntil: 'load' });
    await settle(150);
    assert.equal(await f.page.locator('.vs-rate-page').count(), 0, 'rated within 24h: not re-asked');

    await f.page.evaluate(() => localStorage.setItem('vs_rate_page_v1', JSON.stringify({ '/games': { at: Date.now() - 25 * 3600e3, reaction: 'ok' } })));
    await f.page.reload({ waitUntil: 'load' });
    assert.equal(await f.page.locator('.vs-rate-page').count(), 1, 'control: cooldown expired');
  });
});

test('rate-page: a failed insert is kept and replayed verbatim on the next visit', async () => {
  await withFixture({}, async (f) => {
    await f.goto('/games/');
    await f.page.evaluate(() => localStorage.setItem('__stub_fail', '1'));
    await f.page.click('.vs-rate-page__btn[data-reaction="not_useful"]');
    await waitFor(async () => f.page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('vs_rate_page_v1') || '{}');
      return !!(s['/games'] && s['/games'].pendingPayload);
    }), { message: 'pending payload stored' });
    const pending = await f.page.evaluate(() => JSON.parse(localStorage.getItem('vs_rate_page_v1'))['/games'].pendingPayload);
    assertRowMatchesSchema(pending);

    await f.page.evaluate(() => localStorage.removeItem('__stub_fail'));
    await f.page.reload({ waitUntil: 'load' });
    await waitFor(async () => (await inserts(f.page)).length === 1, { message: 'replay insert' });
    assert.deepEqual((await inserts(f.page))[0].rows, [pending]);
    await waitFor(async () => f.page.evaluate(() => !JSON.parse(localStorage.getItem('vs_rate_page_v1'))['/games'].pendingPayload), { message: 'pending cleared' });
  });
});

test('rate-page: portals and operator surfaces never mount the widget', async () => {
  await withFixture({}, async (f) => {
    for (const p of ['/vault-member/', '/investor-portal/', '/studio-hub/']) {
      await f.goto(p);
      await settle(100);
      assert.equal(await f.page.locator('.vs-rate-page').count(), 0, p);
    }
  });
});

test('micro-feedback: usefulness maps into the reaction CHECK set; goal/blocker stay local', async () => {
  const expected = { useful: 'useful', mixed: 'ok', not_yet: 'not_useful' };
  await withFixture({}, async (f) => {
    await f.goto('/membership/');
    await f.page.waitForSelector('.micro-feedback-toggle', { timeout: 2000 });
    const offered = await f.page.$$eval('[data-feedback-field="usefulness"]', (bs) => bs.map((b) => b.dataset.feedbackValue));
    assert.deepEqual([...offered].sort(), Object.keys(expected).sort(), 'every usefulness option has an expected mapping');

    for (const usefulness of offered) {
      await f.page.evaluate(() => { localStorage.removeItem('vs_micro_feedback_v1'); window.__inserts.length = 0; });
      await f.page.reload({ waitUntil: 'load' });
      await f.page.click('.micro-feedback-toggle');
      await f.page.click('[data-feedback-field="goal"][data-feedback-value="play_now"]');
      await f.page.click('[data-feedback-field="blocker"][data-feedback-value="need_proof"]');
      await f.page.click(`[data-feedback-field="usefulness"][data-feedback-value="${usefulness}"]`);
      await f.page.click('.micro-feedback-submit');
      await waitFor(async () => (await inserts(f.page)).length === 1, { message: `insert for ${usefulness}` });
      const [ins] = await inserts(f.page);
      assert.equal(ins.table, 'page_feedback');
      assertRowMatchesSchema(ins.rows[0]);
      assert.equal(ins.rows[0].reaction, expected[usefulness]);
      assert.equal(ins.rows[0].path, '/membership');
      const wire = JSON.stringify(ins);
      assert.ok(!/play_now|need_proof/.test(wire), 'goal/blocker answers must not leave the browser');
      const local = await f.page.evaluate(() => JSON.parse(localStorage.getItem('vs_micro_feedback_v1')));
      assert.equal(local.at(-1).goal, 'play_now');
      assert.equal(local.at(-1).blocker, 'need_proof');
    }
  });
});

test('micro-feedback: an incomplete answer set is refused and nothing is sent', async () => {
  await withFixture({}, async (f) => {
    await f.goto('/membership/');
    await f.page.waitForSelector('.micro-feedback-toggle', { timeout: 2000 });
    await f.page.click('.micro-feedback-toggle');
    await f.page.click('[data-feedback-field="usefulness"][data-feedback-value="useful"]');
    await f.page.click('.micro-feedback-submit');
    assert.equal(await f.page.textContent('.micro-feedback-status'), 'Pick one answer in each row.');
    await settle(300);
    assert.equal((await inserts(f.page)).length, 0);
    assert.equal(await f.page.evaluate(() => localStorage.getItem('vs_micro_feedback_v1')), null);
  });
});
