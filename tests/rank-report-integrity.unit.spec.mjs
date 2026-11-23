import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { fetchClimbers, validateRankReport } from '../scripts/build-rank-climbers.mjs';

const rankConfig = JSON.parse(fs.readFileSync(new URL('../config/membership-entitlements.json', import.meta.url), 'utf8'));
const firstPoints = rankConfig.rankThresholds[1], secondPoints = rankConfig.rankThresholds[2];
const firstRank = rankConfig.ranks[1].label, secondRank = rankConfig.ranks[2].label, finalRank = rankConfig.ranks.at(-1).label;
const now = Date.parse('2026-10-20T12:00:00.000Z');
const report = () => ({ schemaVersion: '1.0', generatedAt: new Date(now).toISOString(),
  period: 'October 2026', climbers: [{ handle: 'PublicMember', rank: firstRank, points: firstPoints }], totalClimbers: 1 });

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
  for (const row of [null, {}, { handle: ' ', rank: firstRank, points: firstPoints },
    { handle: 'Member', rank: finalRank, points: firstPoints }, { handle: 'Member', rank: firstRank, points: String(firstPoints) },
    { handle: 'Member', rank: firstRank, points: NaN }, { handle: 'Member', rank: firstRank, points: Infinity },
    { handle: 'Member', rank: rankConfig.ranks[0].label, points: firstPoints - 1 }]) {
    assert.throws(() => validateRankReport({ ...report(), climbers: [row] }, now), /climber/);
  }
});

test('provider data keeps opt-in query and credentials while malformed rows reject', async () => {
  const resolveKey = async () => ({ key: 'public-fixture', isServiceRole: false });
  const fetchRows = rows => async (url, options) => {
    assert.match(url, /public_profile=eq.true/);
    assert.equal(new URL(url).searchParams.get('points'), 'gte.' + firstPoints);
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, json: async () => rows };
  };
  assert.deepEqual(await fetchClimbers({ resolveKey, fetchImpl: fetchRows([]) }), []);
  assert.deepEqual(await fetchClimbers({ resolveKey, fetchImpl: fetchRows([{ username: null, points: secondPoints }]) }),
    [{ handle: 'VaultMember', rank: secondRank, points: secondPoints }]);
  for (const row of [null, {}, { username: {}, points: firstPoints }, { username: 'member', points: String(firstPoints) },
    { username: 'member', points: Infinity }, { username: 'member', points: firstPoints - 1 }]) {
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
    fs.mkdirSync(path.join(dir, 'config'));
    fs.copyFileSync(new URL('../config/membership-entitlements.json', import.meta.url), path.join(dir, 'config/membership-entitlements.json'));
    const cli = path.join(dir, 'scripts/build-rank-climbers.mjs');
    fs.copyFileSync(new URL('../scripts/build-rank-climbers.mjs', import.meta.url), cli);
    const target = path.join(dir, 'api/rank-climbers.json');
    const valid = { ...report(), generatedAt: new Date().toISOString() };
    const cases = [
      [valid, 0], [{ ...valid, climbers: [], totalClimbers: 0 }, 0],
      [{ ...valid, generatedAt: 'not-a-date' }, 1], [{ ...valid, generatedAt: '2099-01-01T00:00:00.000Z' }, 1],
      [{ ...valid, generatedAt: new Date(Date.now() - 49 * 3600000).toISOString() }, 1],
      [{ ...valid, climbers: 'broken', totalClimbers: 42 }, 1],
      [{ ...valid, climbers: [{ handle: 'Member', points: firstPoints, rank: finalRank }] }, 1]
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


test('report rank boundaries and provider eligibility use the full canonical scale',async()=>{
 const resolveKey=async()=>({key:'public-fixture',isServiceRole:false});
 for(let i=1;i<rankConfig.ranks.length;i++){
  const points=rankConfig.rankThresholds[i],rank=rankConfig.ranks[i].label;
  const rows=await fetchClimbers({resolveKey,fetchImpl:async(url)=>{const q=new URL(url).searchParams;assert.equal(q.get('public_profile'),'eq.true');assert.equal(q.get('points'),'gte.'+firstPoints);assert.equal(q.get('select'),'username,points');assert.equal(q.get('limit'),'10');assert.equal(q.get('order'),'points.desc');return {ok:true,json:async()=>[{username:' OptIn ',points}]};}});
  assert.deepEqual(rows,[{handle:'OptIn',rank,points}]);assert.doesNotThrow(()=>validateRankReport({...report(),climbers:rows},now));
  if(i>1)assert.doesNotThrow(()=>validateRankReport({...report(),climbers:[{handle:'OptIn',rank:rankConfig.ranks[i-1].label,points:points-1}]},now));
  assert.throws(()=>validateRankReport({...report(),climbers:[{handle:'OptIn',rank:rankConfig.ranks[i-1].label,points}]},now),/climber/);
 }
 await assert.rejects(fetchClimbers({resolveKey,fetchImpl:async()=>({ok:true,json:async()=>[{username:'OptIn',points:firstPoints-0.5}]})}),/previous report preserved/);
});
test('isolated CLI observes changed canonical authority and refuses missing or malformed facts without rewriting reports',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vss-rank-authority-'));
 try{
  for(const d of ['scripts','config','api'])fs.mkdirSync(path.join(dir,d));
  const cli=path.join(dir,'scripts/build-rank-climbers.mjs'),configPath=path.join(dir,'config/membership-entitlements.json'),target=path.join(dir,'api/rank-climbers.json');
  fs.copyFileSync(new URL('../scripts/build-rank-climbers.mjs',import.meta.url),cli);
  const changed=structuredClone(rankConfig);changed.rankThresholds=changed.rankThresholds.map((n,i)=>i?n+i*17:n);changed.ranks[1].label='Changed canonical fixture rank';
  fs.writeFileSync(configPath,JSON.stringify(changed));
  const valid={...report(),generatedAt:new Date().toISOString(),climbers:[{handle:'OptIn',points:changed.rankThresholds[1],rank:changed.ranks[1].label}]};
  const before=JSON.stringify(valid);fs.writeFileSync(target,before);
  const check=()=>spawnSync(process.execPath,[cli,'--check'],{encoding:'utf8',windowsHide:true,timeout:15000});
  const accepted=check();assert.equal(accepted.status,0,accepted.stderr);assert.equal(fs.readFileSync(target,'utf8'),before);
  for(const bad of [{...changed,rankThresholds:[0]}, {...changed,rankThresholds:changed.rankThresholds.map(()=>0)}, {...changed,ranks:changed.ranks.map(()=>({label:''}))}]){fs.writeFileSync(configPath,JSON.stringify(bad));const result=check();assert.equal(result.status,1);assert.match(result.stderr,/canonical membership rank authority/);assert.equal(fs.readFileSync(target,'utf8'),before);}
  fs.unlinkSync(configPath);assert.equal(check().status,1);assert.equal(fs.readFileSync(target,'utf8'),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
