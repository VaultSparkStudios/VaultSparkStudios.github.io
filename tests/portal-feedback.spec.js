const { test } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../vault-member/portal-feedback.js'), 'utf8');
async function fixture(page, { failFirst = false } = {}) {
  await page.route('**/*', route => route.abort());
  await page.setContent('<!doctype html><html><body><section id="member-studio-feedback"></section></body></html>');
  await page.evaluate(({ failFirst }) => {
    window.calls = [];
    window.VSSupabase = { from(table) {
      if (table !== 'page_feedback') throw Error('wrong table');
      return { async insert(rows) {
        window.calls.push(rows);
        const p = rows[0];
        if (Object.keys(p).sort().join(',') !== 'path,reaction' || p.path !== '/vault-member/' || !['useful','ok','not_useful'].includes(p.reaction)) return {error:{message:'schema mismatch'}};
        if (failFirst && window.calls.length === 1) return {error:{message:'temporary provider failure'}};
        return {error:null};
      }};
    }};
  }, { failFirst });
  await page.addScriptTag({content:source});
  return page;
}
for (const [choice, reaction] of [['useful','useful'],['mixed','ok'],['not_useful','not_useful']]) {
  test('browser submits schema-compatible '+choice+' without identifiers', async ({ page }) => {
    await fixture(page);
      await page.locator('[data-member-studio-vote="'+choice+'"]').click();
      await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.startsWith('Signal received.'));
      assert.deepEqual(await page.evaluate(() => window.calls), [[{path:'/vault-member/',reaction}]]);
      assert.equal(await page.locator('button:disabled').count(),3);
  });
}
test('schema-shaped stub rejects the original unsupported payload', async ({ page }) => {
 await fixture(page);  assert.equal(await page.evaluate(async () => !!(await window.VSSupabase.from('page_feedback').insert([{page_path:'/vault-member/',question:'member_studio_direction',answer:'mixed',session_id:null}])).error),true);
});
test('invalid mutated choice never reaches the provider',async({ page })=>{
 await fixture(page);  await page.locator('button').first().evaluate(button=>button.dataset.memberStudioVote='unexpected');
  await page.locator('button').first().click();
  await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.startsWith('Could not send'));
  assert.equal(await page.evaluate(()=>window.calls.length),0);
  assert.equal(await page.locator('button:enabled').count(),3);
});
test('failed request permits retry and success disables duplicate votes',async({ page })=>{
 await fixture(page,{failFirst:true});  await page.locator('[data-member-studio-vote="mixed"]').click();
  await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.startsWith('Could not send'));
  assert.equal(await page.locator('button:enabled').count(),3);
  await page.locator('[data-member-studio-vote="mixed"]').click();
  await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.startsWith('Signal received.'));
  assert.equal(await page.evaluate(()=>window.calls.length),2);
  assert.equal(await page.locator('button:disabled').count(),3);
});
