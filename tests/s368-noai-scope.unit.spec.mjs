// S368 / D-S368.4 — the `noai` robots header is kept only for AI training
// crawlers; allowed search and user-fetch agents (and browsers) never see it.
//   node --test tests/s368-noai-scope.unit.spec.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeNoAiHeader, AI_TRAINING_UA } from '../cloudflare/security-headers-worker.js';

const req = (ua) => new Request('https://vaultsparkstudios.com/', { headers: { 'User-Agent': ua } });
const res = (tag) => new Response('ok', { headers: tag ? { 'X-Robots-Tag': tag } : {} });

test('training crawlers keep noai', () => {
  for (const ua of ['Mozilla/5.0 (compatible; GPTBot/1.2)', 'ClaudeBot/1.0', 'Mozilla/5.0 PerplexityBot/1.0', 'CCBot/2.0']) {
    assert.equal(scopeNoAiHeader(req(ua), res('noai, noimageai')).headers.get('X-Robots-Tag'), 'noai, noimageai', ua);
  }
});

test('search agents and browsers do not receive noai', () => {
  for (const ua of ['Claude-SearchBot/1.0', 'Claude-User/1.0', 'Perplexity-User/1.0', 'OAI-SearchBot/1.0', 'ChatGPT-User/1.0', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130']) {
    assert.equal(AI_TRAINING_UA.test(ua), false, ua);
    assert.equal(scopeNoAiHeader(req(ua), res('noai, noimageai')).headers.get('X-Robots-Tag'), null, ua);
  }
});

test('other robots directives survive', () => {
  const out = scopeNoAiHeader(req('Claude-User/1.0'), res('noindex, nofollow, noai, noimageai'));
  assert.equal(out.headers.get('X-Robots-Tag'), 'noindex, nofollow');
});

test('responses without noai are returned untouched', () => {
  const r = res(null);
  assert.equal(scopeNoAiHeader(req('Claude-User/1.0'), r), r);
});
