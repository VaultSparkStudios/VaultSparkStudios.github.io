import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, listQuery, patchQuery, ACTIONS, rest } from '../scripts/moderate-desk-comments.mjs';

test('valid list filters and action IDs retain their distinct request semantics', async () => {
  const id = '1e2d3c4b-5a69-4788-99aa-bbccddeeff00';
  const list = parseArgs(['list', '--status', 'reported', '--slug', '2026-09-14/a-story', '--limit', '5', '--json']);
  const query = new URL('https://example.test' + listQuery(list));
  assert.equal(query.searchParams.get('report_count'), 'gt.0');
  assert.equal(query.searchParams.get('story_slug'), 'eq.2026-09-14/a-story');
  assert.equal(query.searchParams.get('limit'), '5');
  for (const command of Object.keys(ACTIONS)) {
    const action = parseArgs([command, id]);
    let observed;
    await rest('test-key', patchQuery(action.ids), { method: 'PATCH', body: JSON.stringify(ACTIONS[action.command]) }, async (url, init) => {
      observed = { url, init };
      return new Response('[]', {status:200});
    });
    assert.equal(new URL(observed.url).searchParams.get('id'), `in.(${id})`);
    assert.equal(observed.init.method, 'PATCH');
    assert.deepEqual(JSON.parse(observed.init.body), ACTIONS[command]);
  }
});
