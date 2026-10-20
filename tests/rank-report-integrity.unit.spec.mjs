import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { fetchClimbers, validateRankReport } from '../scripts/build-rank-climbers.mjs';

const now = Date.parse('2026-10-20T12:00:00.000Z');
const report = () => ({ schemaVersion: '1.0', generatedAt: new Date(now).toISOString(),
  period: 'October 2026', climbers: [{ handle: 'PublicMember', rank: 'Vault Runner', points: 50 }], totalClimbers: 1 });

test('rank reports require an observed timestamp, consistent counts and real rank data', () => {
  assert.equal(validateRankReport(report(), now).totalClimbers, 1);
  assert.doesNotThrow(() => validateRankReport({ ...report(), climbers: [], totalClimbers: 0 }, now));
  assert.throws(() => validateRankReport({ ...report(), generatedAt: '2026-02-30T12:00:00.000Z' },
    Date.parse('2026-03-02T12:00:00.000Z')), /INVALID rank report timestamp/);
  for (const generatedAt of [null, '', 'not-a-date', '2026-02-30T12:00:00.000Z', new Date(now + 1).toISOString(), new Date(now - 48 * 3600000 - 1).toISOString()]) {
    assert.throws(() => validateRankReport({ ...report(), generatedAt }, now), /timestamp|STALE/);
  }
  assert.doesNotThrow(() => validateRankReport({ ...report(), generatedAt: new Date(now - 48 * 3600000).toISOString() }, now));
  for (const patch of [{ schemaVersion: '2.0' }, { period: '' }, { climbers: 'broken' }, { totalClimbers: 0 },
    { totalClimbers: '1' }, { climbers: Array(11).fill(report().climbers[0]), totalClimbers: 11 }]) {
    assert.throws(() => validateRankReport({ ...report(), ...patch }, now), /INVALID/);
  }
  for (const row of [null, {}, { handle: ' ', rank: 'Vault Runner', points: 50 },
    { handle: 'Member', rank: 'The Sparked', points: 50 }, { handle: 'Member', rank: 'Vault Runner', points: '50' },
    { handle: 'Member', rank: 'Vault Runner', points: NaN }, { handle: 'Member', rank: 'Vault Runner', points: Infinity },
    { handle: 'Member', rank: 'Spark Initiate', points: 49 }]) {
    assert.throws(() => validateRankReport({ ...report(), climbers: [row] }, now), /climber/);
  }
});

test('provider data keeps opt-in query and credentials while malformed rows reject', async () => {
  const resolveKey = async () => ({ key: 'public-fixture', isServiceRole: false });
  const fetchRows = rows => async (url, options) => {
    assert.match(url, /public_profile=eq.true/);
    assert.match(url, /points=gt.49/);
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, json: async () => rows };
  };
  assert.deepEqual(await fetchClimbers({ resolveKey, fetchImpl: fetchRows([]) }), []);
  assert.deepEqual(await fetchClimbers({ resolveKey, fetchImpl: fetchRows([{ username: null, points: 100 }]) }),
    [{ handle: 'VaultMember', rank: 'Rift Scout', points: 100 }]);
  for (const row of [null, {}, { username: {}, points: 50 }, { username: 'member', points: '50' },
    { username: 'member', points: Infinity }, { username: 'member', points: 49 }]) {
    await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: fetchRows([row]) }), /previous report preserved/);
  }
  await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
  await assert.rejects(fetchClimbers({ resolveKey, fetchImpl: async () => { throw Error('offline'); } }), /offline/);
});

test('actual offline CLI rejects invalid reports without rewriting their evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-rank-integrity-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts'));
    fs.mkdirSync(path.join(dir, 'api'));
    const cli = path.join(dir, 'scripts/build-rank-climbers.mjs');
    fs.copyFileSync(new URL('../scripts/build-rank-climbers.mjs', import.meta.url), cli);
    const target = path.join(dir, 'api/rank-climbers.json');
    const valid = { ...report(), generatedAt: new Date().toISOString() };
    const cases = [
      [valid, 0], [{ ...valid, climbers: [], totalClimbers: 0 }, 0],
      [{ ...valid, generatedAt: 'not-a-date' }, 1], [{ ...valid, generatedAt: '2099-01-01T00:00:00.000Z' }, 1],
      [{ ...valid, generatedAt: new Date(Date.now() - 49 * 3600000).toISOString() }, 1],
      [{ ...valid, climbers: 'broken', totalClimbers: 42 }, 1],
      [{ ...valid, climbers: [{ handle: 'Member', points: 50, rank: 'The Sparked' }] }, 1]
    ];
    for (const [data, status] of cases) {
      const before = JSON.stringify(data);
      fs.writeFileSync(target, before);
      const result = spawnSync(process.execPath, [cli, '--check'], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, status, result.stderr);
      assert.equal(fs.readFileSync(target, 'utf8'), before);
    }
    fs.writeFileSync(target, '{');
    assert.equal(spawnSync(process.execPath, [cli, '--check'], { windowsHide: true, timeout: 15000 }).status, 1);
    fs.unlinkSync(target);
    assert.equal(spawnSync(process.execPath, [cli, '--check'], { windowsHide: true, timeout: 15000 }).status, 1);
    const preload = path.join(dir, 'provider.mjs');
    const previous = JSON.stringify(valid);
    fs.writeFileSync(target, previous);
    for (const body of ['null', '[{"username":"member","points":"50"}]', '{"unexpected":"object"}']) {
      fs.writeFileSync(preload, `globalThis.fetch = async () => ({ok:true,json:async()=>(${body})});`);
      const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cli], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /Supabase rank (row is invalid|response is not an array)/);
      assert.equal(fs.readFileSync(target, 'utf8'), previous);
    }
    fs.writeFileSync(preload, `globalThis.fetch = async () => {throw Error('provider unavailable');};`);
    const unavailable = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cli], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    assert.equal(unavailable.status, 1);
    assert.match(unavailable.stderr, /provider unavailable/);
    assert.equal(fs.readFileSync(target, 'utf8'), previous);
    fs.writeFileSync(preload, `globalThis.fetch = async () => ({ok:true,json:async()=>[]});`);
    const built = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, cli], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
    assert.equal(built.status, 0, built.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')).climbers, []);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
