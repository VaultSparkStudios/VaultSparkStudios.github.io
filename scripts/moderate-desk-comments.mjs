#!/usr/bin/env node
/**
 * moderate-desk-comments.mjs — operator CLI for The Desk community comments (S356).
 *
 * The public site never exposes moderation: comments the filter held (and
 * comments readers reported three times) wait in `public.desk_comments` with
 * status 'held' until an operator acts here.
 *
 * Usage:
 *   node scripts/moderate-desk-comments.mjs list [--status held|published|rejected|removed|reported]
 *                                                [--slug 2026-09-14/a-story] [--limit 50] [--json]
 *   node scripts/moderate-desk-comments.mjs approve   <id> [<id>…]
 *   node scripts/moderate-desk-comments.mjs reject    <id> [<id>…]
 *   node scripts/moderate-desk-comments.mjs remove    <id> [<id>…]
 *   node scripts/moderate-desk-comments.mjs feature   <id> [<id>…]
 *   node scripts/moderate-desk-comments.mjs unfeature <id> [<id>…]
 *   node scripts/moderate-desk-comments.mjs --self-test
 *
 * `list` with no --status shows the review queue (held OR reported).
 * `approve` publishes and clears the report counter, so a previously
 * brigaded comment is not immediately re-held by its existing reports.
 *
 * Credentials: the service-role key resolves through the secrets gateway
 * (CANON-012, capability `supabase.admin`). The key is never printed, never
 * logged, and never passed on argv.
 */

import { pathToFileURL } from 'node:url';

const PROJECT_REF = 'fjnpzjjyhnpmunfoycrp';
const REST_BASE = `https://${PROJECT_REF}.supabase.co/rest/v1`;
const TIMEOUT_MS = 15_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^\d{4}-\d{2}-\d{2}\/[a-z0-9-]{1,120}$/;
const STATUSES = ['held', 'published', 'rejected', 'removed', 'reported'];

const LIST_FIELDS = [
  'id', 'story_slug', 'parent_id', 'author_kind', 'display_name', 'status', 'featured',
  'report_count', 'filter_score', 'filter_reasons', 'body', 'created_at',
].join(',');

/** action → the column patch it applies. */
export const ACTIONS = Object.freeze({
  approve: { status: 'published', report_count: 0 },
  reject: { status: 'rejected' },
  remove: { status: 'removed', featured: false },
  feature: { featured: true },
  unfeature: { featured: false },
});

/* ------------------------------------------------------------------ *
 * Pure helpers — self-tested.
 * ------------------------------------------------------------------ */

export function parseArgs(argv) {
  const out = { command: null, ids: [], status: null, slug: null, limit: 50, json: false, selfTest: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--self-test') out.selfTest = true;
    else if (arg === '--json') out.json = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--status') out.status = argv[++i] || null;
    else if (arg === '--slug') out.slug = argv[++i] || null;
    else if (arg === '--limit') out.limit = Number(argv[++i]);
    else if (arg.startsWith('--')) out.help = true;
    else if (!out.command) out.command = arg;
    else out.ids.push(arg);
  }
  return out;
}

export function listQuery({ status = null, slug = null, limit = 50 } = {}) {
  const params = new URLSearchParams();
  params.set('select', LIST_FIELDS);
  if (status === 'reported') params.set('report_count', 'gt.0');
  else if (status) params.set('status', `eq.${status}`);
  else params.set('or', '(status.eq.held,report_count.gt.0)');
  if (slug) params.set('story_slug', `eq.${slug}`);
  params.set('order', status === 'reported' ? 'report_count.desc,created_at.desc' : 'created_at.desc');
  const capped = Math.min(Math.max(Math.floor(Number(limit) || 50), 1), 500);
  params.set('limit', String(capped));
  return `/desk_comments?${params.toString()}`;
}

export function patchQuery(ids) {
  return `/desk_comments?id=in.(${ids.join(',')})&select=id,status,featured,report_count`;
}

export function invalidIds(ids) {
  return (ids || []).filter((id) => !UUID_RE.test(String(id)));
}

export function excerpt(text, max = 110) {
  const flat = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function formatRow(row) {
  const flags = [
    row.status,
    row.author_kind,
    row.featured ? 'featured' : null,
    row.parent_id ? 'reply' : null,
    Number(row.report_count) ? `reports=${row.report_count}` : null,
    row.filter_score == null ? null : `score=${row.filter_score}`,
    Array.isArray(row.filter_reasons) && row.filter_reasons.length ? row.filter_reasons.join('+') : null,
  ].filter(Boolean).join(' · ');
  return [
    `${row.id}  ${row.created_at}`,
    `  ${row.story_slug}  ${row.display_name}`,
    `  ${flags}`,
    `  "${excerpt(row.body)}"`,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * Supabase (service role).
 * ------------------------------------------------------------------ */

async function serviceKey() {
  const { getSecret } = await import('./lib/secrets.mjs');
  const key = await getSecret('SUPABASE_SERVICE_ROLE_KEY', 'supabase.admin');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY unavailable through the secrets gateway (capability supabase.admin)');
  return key;
}

export async function rest(key, pathAndQuery, init = {}, fetchImpl = fetch) {
  const response = await fetchImpl(`${REST_BASE}${pathAndQuery}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`supabase ${response.status}: ${text.slice(0, 300)}`);
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

/* ------------------------------------------------------------------ *
 * Self-test.
 * ------------------------------------------------------------------ */

/** One request/response round trip against a mocked fetch — no network, no key. */
async function transportChecks() {
  const calls = [];
  const mock = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify([{ id: 'x', status: 'published', featured: false, report_count: 0 }]), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  const rows = await rest('test-key-not-a-secret', patchQuery(['x']), {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(ACTIONS.approve),
  }, mock);

  let denied = false;
  try {
    await rest('test-key-not-a-secret', '/desk_comments', {}, async () => new Response('nope', { status: 401 }));
  } catch (error) {
    denied = /supabase 401/.test(error.message);
  }

  const sent = calls[0] || { url: '', init: {} };
  return [
    ['rest targets the pinned project REST base', sent.url.startsWith(`https://${PROJECT_REF}.supabase.co/rest/v1/desk_comments`)],
    ['rest sends the key as apikey + bearer, never in the URL', sent.init.headers.apikey === 'test-key-not-a-secret'
      && sent.init.headers.Authorization === 'Bearer test-key-not-a-secret'
      && !sent.url.includes('test-key-not-a-secret')],
    ['rest returns the parsed representation', Array.isArray(rows) && rows[0].status === 'published'],
    ['rest turns a non-2xx into an error, never a silent null', denied],
  ];
}

async function selfTest() {
  const checks = [
    ['parseArgs reads a command and ids', (() => {
      const a = parseArgs(['approve', 'a', 'b']);
      return a.command === 'approve' && a.ids.join(',') === 'a,b';
    })()],
    ['parseArgs reads flags', (() => {
      const a = parseArgs(['list', '--status', 'held', '--limit', '5', '--json']);
      return a.status === 'held' && a.limit === 5 && a.json === true;
    })()],
    ['listQuery defaults to the review queue', listQuery().includes('or=%28status.eq.held%2Creport_count.gt.0%29')],
    ['listQuery honours an explicit status', listQuery({ status: 'published' }).includes('status=eq.published')],
    ['listQuery maps reported to the counter', listQuery({ status: 'reported' }).includes('report_count=gt.0')],
    ['listQuery caps the limit', listQuery({ limit: 5000 }).includes('limit=500')],
    ['listQuery filters by slug', listQuery({ slug: '2026-09-14/a-story' }).includes('story_slug=eq.2026-09-14')],
    ['patchQuery builds an in-list', patchQuery(['x', 'y']) === '/desk_comments?id=in.(x,y)&select=id,status,featured,report_count'],
    ['invalidIds rejects non-uuids', invalidIds(['not-a-uuid', '1e2d3c4b-5a69-4788-99aa-bbccddeeff00']).length === 1],
    ['approve clears the report counter', ACTIONS.approve.report_count === 0 && ACTIONS.approve.status === 'published'],
    ['remove also unfeatures', ACTIONS.remove.featured === false],
    ['excerpt collapses whitespace and truncates', excerpt('a\n\n  b', 10) === 'a b' && excerpt('x'.repeat(50), 10).endsWith('…')],
    ['formatRow surfaces reasons', formatRow({ id: 'i', created_at: 't', story_slug: 's', display_name: 'n', status: 'held', author_kind: 'guest', filter_reasons: ['link'], body: 'b' }).includes('link')],
  ];
  checks.push(...(await transportChecks()));
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`${ok ? '✓' : '✗'} ${name}`);
    if (!ok) failed++;
  }
  console.log(`moderate-desk-comments --self-test: ${checks.length - failed}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

/* ------------------------------------------------------------------ *
 * Main.
 * ------------------------------------------------------------------ */

const USAGE = `usage:
  moderate-desk-comments.mjs list [--status ${STATUSES.join('|')}] [--slug <date>/<slug>] [--limit N] [--json]
  moderate-desk-comments.mjs ${Object.keys(ACTIONS).join('|')} <comment-id> [<comment-id>…]
  moderate-desk-comments.mjs --self-test`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) return await selfTest();
  if (args.help || !args.command) {
    console.log(USAGE);
    process.exit(args.command ? 0 : 2);
  }

  if (args.command === 'list') {
    if (args.status && !STATUSES.includes(args.status)) {
      console.error(`unknown --status ${args.status} (expected ${STATUSES.join(', ')})`);
      process.exit(2);
    }
    if (args.slug && !SLUG_RE.test(args.slug)) {
      console.error('--slug must look like 2026-09-14/a-story');
      process.exit(2);
    }
    const key = await serviceKey();
    const rows = await rest(key, listQuery(args)) || [];
    if (args.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    if (!rows.length) {
      console.log(`no comments matched (${args.status || 'review queue'}).`);
      return;
    }
    for (const row of rows) console.log(`${formatRow(row)}\n`);
    console.log(`${rows.length} comment(s).`);
    return;
  }

  const patch = ACTIONS[args.command];
  if (!patch) {
    console.error(`unknown command ${args.command}\n${USAGE}`);
    process.exit(2);
  }
  if (!args.ids.length) {
    console.error(`${args.command} needs at least one comment id`);
    process.exit(2);
  }
  const bad = invalidIds(args.ids);
  if (bad.length) {
    console.error(`not comment ids: ${bad.join(', ')}`);
    process.exit(2);
  }

  const key = await serviceKey();
  const rows = await rest(key, patchQuery(args.ids), {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  }) || [];
  if (!rows.length) {
    console.error('no rows changed — check the ids');
    process.exit(1);
  }
  for (const row of rows) {
    console.log(`${args.command}: ${row.id} → status=${row.status} featured=${row.featured} reports=${row.report_count}`);
  }
  console.log(`${rows.length} comment(s) updated.`);
}

// Import-safe: the unit suite imports the pure helpers without running main().
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(`moderate-desk-comments: ${error.message}`);
    process.exit(1);
  });
}
