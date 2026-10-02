// portal-logic.unit.spec.mjs: S368 member portal (onboarding repair, return
// loop, Season 1 finale, dedupe, billing contract, admin + lore out of HTML).
// Pure logic from vault-member/portal-logic.js and assets/seasons-rivals.js,
// plus static contracts on the portal surfaces. No network, no credentials.
// Run: node --test tests/portal-logic.unit.spec.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const L = require(path.join(ROOT, 'vault-member/portal-logic.js'));
const S = require(path.join(ROOT, 'assets/seasons-rivals.js'));
const registry = JSON.parse(read('data/game-registry.json'));
const seasons = JSON.parse(read('data/seasons.json'));

function membershipConfig() {
  const sandbox = {};
  vm.runInNewContext(read('assets/membership-access.js'), { globalThis: sandbox });
  return sandbox.VSMembership.config;
}

// ── ranks ──────────────────────────────────────────────────────────────────
test('rank thresholds mirror the canonical membership ladder', () => {
  const cfg = membershipConfig();
  assert.deepEqual(L.RANK_THRESHOLDS, JSON.parse(JSON.stringify(cfg.rankThresholds)));
  assert.equal(L.rankIndexFor(0), 0);
  assert.equal(L.rankIndexFor(249), 0);
  assert.equal(L.rankIndexFor(250), 1);
  assert.equal(L.rankIndexFor(99999), 7);
  assert.equal(L.rankIndexFor(100000), 8);
  assert.equal(L.rankIndexFor('abc'), 0);
});

test('/member/ renders the canonical 9-rank ladder (no retired 5-tier names)', () => {
  const html = read('member/index.html');
  assert.doesNotMatch(html, /Forge Guard/);
  const cfg = membershipConfig();
  const labels = cfg.ranks.map((r) => r.label);
  const block = html.slice(html.indexOf('var RANKS=['), html.indexOf('];', html.indexOf('var RANKS=[')));
  const rows = [...block.matchAll(/name:'([^']+)',\s*min:(\d+)/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(rows.map((r) => r[0]), JSON.parse(JSON.stringify(labels)));
  assert.deepEqual(rows.map((r) => r[1]), JSON.parse(JSON.stringify(cfg.rankThresholds)));
});

// ── RPC availability ───────────────────────────────────────────────────────
test('isMissingRpc recognises an undeployed function only', () => {
  assert.equal(L.isMissingRpc({ code: 'PGRST202', message: 'Could not find the function public.x' }), true);
  assert.equal(L.isMissingRpc({ status: 404 }), true);
  assert.equal(L.isMissingRpc({ code: '42883', message: 'function x() does not exist' }), true);
  assert.equal(L.isMissingRpc({ message: 'Could not find the function public.get_season_standings(p_limit)' }), true);
  assert.equal(L.isMissingRpc({ code: '42501', message: 'permission denied' }), false);
  assert.equal(L.isMissingRpc({ message: 'Failed to fetch' }), false);
  assert.equal(L.isMissingRpc(null), false);
});

// ── Vault Initiation ───────────────────────────────────────────────────────
test('Vault Initiation is one 5-step quest with progress and a next step', () => {
  const empty = L.initiationSteps({});
  assert.equal(empty.total, 5);
  assert.equal(empty.doneCount, 0);
  assert.equal(empty.complete, false);
  assert.equal(empty.next.key, 'identity');
  assert.deepEqual(empty.steps.map((s) => s.key), ['identity', 'discord', 'challenge', 'social', 'explore']);

  const partial = L.initiationSteps({ bioSet: true, wallVisited: true, gameExplored: true });
  assert.equal(partial.doneCount, 3);
  assert.equal(partial.percent, 60);
  assert.equal(partial.next.key, 'discord');

  const done = L.initiationSteps({ avatarSet: true, discordLinked: true, challengeDone: true, followed: true, referred: true });
  assert.equal(done.complete, true);
  assert.equal(done.next, null);
  assert.equal(done.percent, 100);
});

test('fresh initiates are the first three days unless the quest is done', () => {
  const now = Date.parse('2026-10-02T12:00:00Z');
  assert.equal(L.isFreshInitiate({ createdAt: '2026-10-01T12:00:00Z', points: 10 }, now), true, 'new members start with 10 points and are still fresh');
  assert.equal(L.isFreshInitiate({ createdAt: '2026-09-20T12:00:00Z' }, now), false);
  assert.equal(L.isFreshInitiate({ createdAt: '2026-10-02T00:00:00Z', prefs: { initiation_done: true } }, now), false);
  assert.equal(L.isFreshInitiate({ createdAt: 'nope' }, now), false);
  assert.equal(L.isFreshInitiate(null, now), false);
});

// ── Since your last visit ──────────────────────────────────────────────────
test('since-last-visit diffs only what changed after last_seen', () => {
  const lastSeen = '2026-10-01T00:00:00Z';
  const diff = L.sinceLastVisit({
    lastSeen,
    events: [
      { points: 10, created_at: '2026-10-01T09:00:00Z', label: 'Daily Login' },
      { points: 20, created_at: '2026-10-01T10:00:00Z', label: 'Read: file' },
      { points: 50, created_at: '2026-09-30T10:00:00Z', label: 'old' },
      { points: -5, created_at: '2026-10-01T11:00:00Z', label: 'spend' },
    ],
    kudos: [{ created_at: '2026-10-01T12:00:00Z', from_username: 'Rook' }, { created_at: '2026-09-29T00:00:00Z' }],
    files: [{ published_at: '2026-10-01T08:00:00Z', locked: false }, { published_at: '2026-10-01T08:00:00Z', locked: true }],
    prevPoints: 240,
    points: 270,
    rankNames: ['Spark Initiate', 'Vault Runner'],
  });
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.pointsEarned, 30);
  const keys = diff.items.map((i) => i.key);
  assert.deepEqual(keys, ['points', 'kudos', 'files', 'rank']);
  assert.match(diff.items[0].text, /\+30 Vault Points from 2 actions/);
  assert.match(diff.items[1].text, /1 kudos received.*@Rook/);
  assert.match(diff.items[2].text, /2 new classified files \(1 open to you\)/);
  assert.equal(diff.items[2].tab, 'archive');
  assert.match(diff.items[3].text, /Ranked up to Vault Runner/);
});

test('since-last-visit is hidden on a first visit or when nothing changed', () => {
  assert.equal(L.sinceLastVisit({ lastSeen: null, events: [{ points: 5, created_at: '2026-10-02' }] }).hasChanges, false);
  const quiet = L.sinceLastVisit({ lastSeen: '2026-10-02T00:00:00Z', events: [], kudos: [], files: [], prevPoints: 100, points: 100 });
  assert.equal(quiet.hasChanges, false);
  assert.deepEqual(quiet.items, []);
});

// ── Season ─────────────────────────────────────────────────────────────────
test('data/seasons.json keeps the announced Season 1 window and rewards', () => {
  const s1 = seasons.seasons.find((s) => s.id === 'season-1-2026');
  assert.equal(s1.startedAt, '2026-09-02T00:00:00Z');
  assert.equal(s1.endsAt, '2026-10-14T00:00:00Z');
  assert.deepEqual(s1.rewards.map((r) => [r.tier, r.vaultPoints]), [['top-10', 1500], ['top-50', 500], ['participant', 100]]);
});

test('season phase follows the clock, so Oct 14 flips Season 1 to ended', () => {
  const s1 = S.pickSeason(seasons);
  assert.equal(s1.id, 'season-1-2026');
  assert.equal(S.seasonPhase(s1, Date.parse('2026-10-02T00:00:00Z')), 'active');
  assert.equal(S.seasonPhase(s1, Date.parse('2026-10-13T23:59:59Z')), 'active');
  assert.equal(S.seasonPhase(s1, Date.parse('2026-10-14T00:00:00Z')), 'ended');
  assert.equal(S.seasonPhase(s1, Date.parse('2026-08-01T00:00:00Z')), 'upcoming');
  assert.equal(S.seasonPhase(null), 'none');
  assert.equal(S.seasonReward(s1, 'participant'), 100);
  assert.equal(S.seasonReward(s1, 'nope'), null);
  assert.equal(S.fmtDuration(Date.parse('2026-10-14T00:00:00Z') - Date.parse('2026-10-02T10:00:00Z')), '11d 14h');
  assert.equal(S.fmtDuration(-1), 'Season ended');
});

test('pickSeason falls back to the latest ended season, never invents one', () => {
  const feed = { seasons: [
    { id: 'a', active: false, startedAt: '2026-01-01T00:00:00Z', endsAt: '2026-02-01T00:00:00Z' },
    { id: 'b', active: false, startedAt: '2026-03-01T00:00:00Z', endsAt: '2026-04-01T00:00:00Z' },
    { id: 'pre', active: false, startedAt: null, endsAt: null },
  ] };
  assert.equal(S.pickSeason(feed).id, 'b');
  assert.equal(S.pickSeason({ seasons: [] }), null);
  assert.equal(S.pickSeason(null), null);
});

test('standings view finds you inside or outside the top 10', () => {
  const rows = Array.from({ length: 14 }, (_, i) => ({ position: i + 1, username: 'm' + i, season_xp: 1000 - i, is_me: i === 12 }));
  const view = L.standingsView(rows, 10);
  assert.equal(view.top.length, 10);
  assert.equal(view.position, 13);
  assert.equal(view.meInTop, false);
  assert.equal(view.seasonXp, 988);
  const inTop = L.standingsView(rows.map((r) => ({ ...r, is_me: r.position === 2 })), 10);
  assert.equal(inTop.meInTop, true);
  assert.equal(L.standingsView(null).me, null);
});

test('season results prefer live standings, then the snapshot, then season XP', () => {
  assert.deepEqual(L.seasonResult({ liveMe: { position: 4, season_xp: 900 } }), { source: 'standings', position: 4, seasonXp: 900 });
  const snap = L.seasonResult({ liveMe: null, snapshot: { position: 7, season_xp: 600, at: '2026-10-13T00:00:00Z' }, seasonXp: 650 });
  assert.equal(snap.source, 'snapshot');
  assert.equal(snap.position, 7);
  assert.deepEqual(L.seasonResult({ seasonXp: 320 }), { source: 'xp', position: null, seasonXp: 320 });
  assert.equal(L.seasonResult({}).source, 'none');
});

test('nearest rival is the smallest positive gap and never yourself', () => {
  const rows = [
    { username: 'Far', points: 900 },
    { username: 'Near', points: 410 },
    { username: 'Me', points: 400 },
    { username: 'Below', points: 100 },
    { username: 'Tie', points: 400 },
  ];
  assert.equal(S.findNearestRival(400, rows, 'me').username, 'Near');
  assert.equal(S.findNearestRival(5000, rows), null);
  assert.equal(S.findNearestRival(0, [{ username: 'x', points: 10, is_me: true }]), null);
  assert.equal(S.findNearestRival(0, null), null);
});

// ── Billing contract (create-checkout) ─────────────────────────────────────
test('checkout responses map to the billing contract; code wins over error text', () => {
  assert.deepEqual(L.classifyCheckoutResponse(200, { url: 'https://checkout.stripe.com/x' }), { kind: 'redirect', url: 'https://checkout.stripe.com/x' });
  const already = L.classifyCheckoutResponse(409, { code: 'already_subscribed', error: 'Member already has an active subscription' });
  assert.equal(already.kind, 'already_subscribed');
  assert.equal(already.message, 'You already have this membership.');
  const change = L.classifyCheckoutResponse(409, { code: 'plan_change_via_billing', portal: true, current_plan: 'vault_sparked', requested_plan: 'vault_sparked_pro', error: 'Use billing' });
  assert.equal(change.kind, 'plan_change_via_billing');
  assert.match(change.message, /new plan replaces the old one/);
  const annual = L.classifyCheckoutResponse(400, { code: 'annual_not_offered', error: 'Annual billing is not offered' });
  assert.equal(annual.kind, 'annual_not_offered');
  assert.equal(annual.message, 'Monthly plans only for now.');
  assert.equal(L.classifyCheckoutResponse(400, { error: 'invalid_promo_code' }).kind, 'invalid_promo');
  assert.equal(L.classifyCheckoutResponse(410, { code: 'gift_unavailable' }).kind, 'gift_unavailable');
  assert.equal(L.classifyCheckoutResponse(500, null).kind, 'error');
});

test('portal checkout never retries without the promo on a plan-state answer', () => {
  const core = read('vault-member/portal-core.js');
  assert.match(core, /outcome\.kind === 'invalid_promo' \|\| unreadable/);
  assert.match(core, /outcome\.kind === 'plan_change_via_billing'[\s\S]{0,260}this\.openCustomerPortal\(/);
  assert.match(core, /outcome\.kind === 'already_subscribed'/);
  assert.match(core, /outcome\.kind === 'annual_not_offered'/);
  assert.match(core, /promo_code: promo/);
});

// ── Your Games ─────────────────────────────────────────────────────────────
test('Your Games statuses match data/game-registry.json; sealed games never show', () => {
  const games = L.buildGameList(registry);
  const bySlug = Object.fromEntries(games.map((g) => [g.slug, g]));
  for (const [slug, g] of Object.entries(registry.games)) {
    if (g.status === 'sealed') { assert.equal(bySlug[slug], undefined, slug + ' is sealed and hidden'); continue; }
    const shown = bySlug[slug];
    assert.ok(shown, slug + ' is listed');
    const expected = g.status === 'sparked' ? 'Sparked'
      : g.status === 'vaulted' ? 'Vaulted'
      : g.playUrl ? 'Playable Beta' : 'In the Forge';
    assert.equal(shown.status.label, expected, slug);
  }
  assert.equal(games[0].status.key, 'sparked', 'Sparked games lead');
  assert.equal(bySlug['project-unknown'], undefined);
});

test('Your Games descriptions follow D-S368.3', () => {
  const games = Object.fromEntries(L.buildGameList(registry).map((g) => [g.slug, g]));
  assert.match(games.solara.description, /roguelite RPG with a shared world/i);
  assert.doesNotMatch(games.solara.description, /MMORPG/i);
  assert.match(games['the-exodus'].description, /engine-building card game for 2.4 players/i);
  assert.match(games.mindframe.description, /metacognition platform/i);
  assert.equal(games.mindframe.status.label, registry.games.mindframe.status === 'forge' ? 'In the Forge' : games.mindframe.status.label);
  assert.equal(games['gridiron-gm'].status.label, 'Vaulted');
  assert.doesNotMatch(games['gridiron-gm'].description, /return|coming back|soon/i);
  // Registry-provided copy wins over the fallback.
  const custom = L.buildGameList({ games: { solara: { name: 'Solara', status: 'forge', description: 'From the registry' } } });
  assert.equal(custom[0].description, 'From the registry');
  // Non-https play links are dropped.
  const unsafe = L.buildGameList({ games: { x: { name: 'X', status: 'forge', playUrl: 'javascript:alert(1)' } } });
  assert.equal(unsafe[0].playUrl, null);
  assert.equal(unsafe[0].status.label, 'In the Forge');
});

// ── Referral + excerpts ────────────────────────────────────────────────────
test('one referral link format, matching /invite/', () => {
  assert.equal(L.referralLink('Vault Runner'), 'https://vaultsparkstudios.com/vault-member/?ref=Vault%20Runner');
  assert.match(read('assets/invite-page.js'), /vaultsparkstudios\.com\/vault-member\/\?ref=/);
  assert.doesNotMatch(read('vault-member/portal-core.js'), /vaultsparkstudios\.com\/join\/\?ref=/);
});

test('textExcerpt strips markup and trims on a word boundary', () => {
  assert.equal(L.textExcerpt('<p>Hello <strong>vault</strong> &amp; friends</p>'), 'Hello vault & friends');
  assert.equal(L.textExcerpt('<script>alert(1)</script><p>Safe</p>'), 'Safe');
  const long = L.textExcerpt('<p>' + 'word '.repeat(80) + '</p>', 40);
  assert.ok(long.length <= 41);
  assert.ok(long.endsWith('…'));
});

// ── Static contracts on the portal surfaces ────────────────────────────────
test('public portal HTML ships no admin controls and no classified lore', () => {
  const html = read('vault-member/index.html');
  for (const id of ['dash-pane-admin', 'tab-dash-admin', 'admin-pulse-btn', 'admin-key-btn', 'admin-file-btn', 'admin-csv-btn', 'inv-req-list', 'create-poll-form']) {
    assert.ok(!html.includes('id="' + id + '"'), id + ' is not in the public HTML');
  }
  assert.doesNotMatch(html, /Vault Command/);
  assert.doesNotMatch(html, /First Fault|EYES ONLY|three simultaneous manifestations|The Cartographers/);
  const tpl = read('vault-member/admin/vault-command.tpl');
  assert.match(tpl, /data-vault-command/);
  for (const id of ['admin-pulse-btn', 'admin-key-btn', 'admin-file-btn', 'create-poll-form', 'inv-req-list', 'fan-art-queue']) {
    assert.ok(tpl.includes('id="' + id + '"'), id + ' lives in the gated template');
  }
  const auth = read('vault-member/portal-auth.js');
  assert.match(auth, /rpc\('is_vault_admin'\)[\s\S]{0,200}data !== true\) return;[\s\S]{0,200}mountVaultCommand\(\)/);
});

test('dashboard duplicates are consolidated', () => {
  const html = read('vault-member/index.html');
  assert.doesNotMatch(html, /Connected Games|Studio Pipeline|id="studio-access-panel"/);
  assert.equal((html.match(/id="your-games-panel"/g) || []).length, 1);
  assert.equal((html.match(/id="referralLink"/g) || []).length, 1);
  assert.equal((html.match(/id="invite-code-value"/g) || []).length, 1);
  assert.doesNotMatch(html, /Referral Rewards/, 'Claim Center referral card removed');
  assert.doesNotMatch(html, /id="rankProgressBar"|id="rank-comparison"/, 'rank progress lives in the profile bar + Claim Center');
  assert.doesNotMatch(html, /Vault Dispatch Preferences|Monthly Newsletter<\/h3>/);
  assert.equal((html.match(/id="toggle-newsletter"/g) || []).length, 1);
  assert.equal((html.match(/id="toggle-updates"/g) || []).length, 1);
  assert.doesNotMatch(html, /Fantasy MMORPG/);
  assert.doesNotMatch(html, /id="onboarding-overlay"|id="cvault-panel"/);
  assert.match(html, /id="vault-initiation"/);
  assert.match(html, /id="since-last-visit"/);
  assert.match(html, /id="season-standings-panel"/);
  assert.match(html, /id="season-strip"/);
  assert.match(html, /id="nearest-rival"/);
});

test('portal scripts load pure logic before the code that uses it', () => {
  const html = read('vault-member/index.html');
  const order = ['/assets/seasons-rivals.js', 'portal-logic.js', 'portal-core.js', 'portal-auth.js', 'portal-loop.js', 'portal-settings.js'];
  const idx = order.map((src) => html.indexOf('src="' + src + '"'));
  idx.forEach((i, n) => assert.ok(i > 0, order[n] + ' is loaded'));
  for (let n = 1; n < idx.length; n += 1) assert.ok(idx[n] > idx[n - 1], order[n] + ' loads after ' + order[n - 1]);
});

test('field-name and call-signature bugs stay fixed', () => {
  const features = read('vault-member/portal-features.js');
  assert.match(features, /data\.user_xp/);
  assert.doesNotMatch(features, /member_xp/);
  assert.doesNotMatch(read('vault-member/portal-init.js'), /_currentMember\.id\b/);
  const challenges = read('vault-member/portal-challenges.js');
  assert.doesNotMatch(challenges, /award_points', \{ p_user_id/);
  assert.match(challenges, /p_reason:\s+'challenge_streak_' \+ newStreak/);
  assert.doesNotMatch(challenges, /from\('challenge_submissions'\)/);
  assert.match(challenges, /rpc\('record_challenge_streak'\)/);
  const dash = read('vault-member/portal-dashboard.js');
  assert.match(dash, /rpc\('record_login_streak'\)/);
  assert.match(dash, /p_once_per: 'day'/);
  const auth = read('vault-member/portal-auth.js');
  assert.doesNotMatch(auth, /member\.points <= 0/);
  assert.doesNotMatch(auth, /maybeStartOnboarding/);
  assert.match(auth, /last_ceremony_rank/);
  assert.doesNotMatch(read('vault-member/portal-init.js'), /maybeShowTour/);
});

test('investor gate keeps non-investors signed in and has a real logo', () => {
  const src = read('assets/investor-auth.js');
  assert.doesNotMatch(src, /\/assets\/logo\.png/);
  assert.ok(fs.existsSync(path.join(ROOT, 'assets/vaultspark-icon.webp')));
  const gate = src.slice(src.indexOf('async function initInvestorAuth'), src.indexOf('// ── Public API'));
  assert.doesNotMatch(gate, /signOut\(/, 'the gate never signs a member out');
  assert.match(gate, /APPLY_URL \+ '\?reason=not_investor'/);
  assert.match(src, /async signOut\(\)/, 'explicit sign-out remains available');
});
