#!/usr/bin/env node
/**
 * Every Play CTA must point where data/game-registry.json says it points.
 *
 * That registry's own note reads: "Edit this file to change game status or play
 * URLs. build:check validates page HTML against registry." The status half was
 * true (check-game-playability-coherence). The **play URL half was not** — no
 * script in the repo compared a Play CTA href to `registry.games[slug].playUrl`.
 *
 * S294 is what that costs. The founder set the Franchise Architect play
 * destination to its own domain, but eight hand-maintained CTAs across
 * index.html, games/, press/, roadmap/ and the landing page each carried the old
 * on-site path. A registry that is authoritative in the comment and advisory in
 * practice is worse than no registry, because every reader trusts it.
 *
 * The check: for each game with an http(s) `playUrl`, any anchor whose visible
 * text reads like a play action must use that exact URL — and, being external,
 * must carry `target="_blank"` and a `rel` containing `noreferrer` or `noopener`
 * so the convention (set by Call of Doodie) cannot silently drift either.
 *
 * Scoped to games whose playUrl is EXTERNAL. A null playUrl (unreleased) or a
 * relative one is left alone — those are legitimately different shapes and
 * flagging them would only teach people to ignore this gate.
 *
 * Usage:
 *   node scripts/check-play-cta-registry-sync.mjs
 *   node scripts/check-play-cta-registry-sync.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Anchor text that promises the visitor a playable build. */
export const PLAY_TEXT = /\b(play|access beta|launch game|start playing)\b/i;

/** Anchor text that is explicitly ABOUT the game, not a play action. */
export const ABOUT_TEXT = /\b(about|learn more|read more|details|devlog)\b/i;

export function parseAnchors(html) {
  const anchors = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1];
    const href = (attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    const text = m[2].replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;|&#\d+;/gi, ' ').replace(/\s+/g, ' ').trim();
    anchors.push({ href, text, attrs });
  }
  return anchors;
}

export function isPlayAnchor({ text }) {
  if (!text) return false;
  if (ABOUT_TEXT.test(text)) return false;
  return PLAY_TEXT.test(text);
}

/** Does this anchor reference the game at all — by slug path or by its play host? */
export function referencesGame({ href }, slug, playUrl) {
  if (!href) return false;
  if (href.includes(`/${slug}/`)) return true;
  try {
    return new URL(playUrl).host === new URL(href).host;
  } catch {
    return false;
  }
}

/**
 * Two rules, deliberately no more:
 *   1. The href must equal the registry playUrl. That is the founder-owned fact.
 *   2. IF the link opens a new tab, it must carry rel noopener/noreferrer —
 *      reverse-tabnabbing only exists when target="_blank" is present.
 * Whether an external CTA opens a new tab at all is a UX choice that legitimately
 * differs between the card convention (target="_blank") and the hero tiles
 * (same-tab, rel="noopener"). Enforcing one would be this gate inventing a design
 * decision it has no standing to make.
 */
export function auditAnchor(anchor, slug, playUrl) {
  const problems = [];
  if (anchor.href !== playUrl) {
    problems.push(`href="${anchor.href}" should be the registry playUrl "${playUrl}"`);
    return problems;
  }
  const newTab = /\btarget\s*=\s*["']_blank["']/i.test(anchor.attrs);
  const safeRel = /\brel\s*=\s*["'][^"']*\b(noreferrer|noopener)\b/i.test(anchor.attrs);
  if (newTab && !safeRel) problems.push('opens a new tab without rel="noreferrer" (reverse-tabnabbing)');
  return problems;
}

function trackedHtml() {
  return execFileSync('git', ['ls-files', '*.html'], { cwd: ROOT, encoding: 'utf8', windowsHide: true })
    .split('\n').map((l) => l.trim()).filter(Boolean);
}

function selfTest() {
  const url = 'https://playfranchisearchitect.com/';
  const good = `<a class="button" href="${url}" target="_blank" rel="noreferrer">Play Beta</a>`;
  const stalePath = '<a class="button" href="/franchise-architect/">Play Beta</a>';
  const noTarget = `<a class="button" href="${url}" rel="noreferrer">Play Beta</a>`;
  const noRel = `<a class="button" href="${url}" target="_blank">Play Beta</a>`;
  const about = '<a class="button-secondary" href="/games/franchise-architect/">About Franchise Architect</a>';
  const nav = '<a href="/games/franchise-architect/">Franchise Architect</a>';

  const a = (html) => parseAnchors(html)[0];
  const cases = [
    ['an anchor parses to href + text', a(good).href === url && a(good).text === 'Play Beta'],
    ['entities are stripped from anchor text', parseAnchors('<a href="/x">&#9654;&nbsp;Play Beta — It\'s Free</a>')[0].text.startsWith('Play Beta')],
    ['a play anchor is detected', isPlayAnchor(a(good))],
    ['an About anchor is NOT a play anchor', !isPlayAnchor(a(about))],
    ['a bare nav link is NOT a play anchor', !isPlayAnchor(a(nav))],
    ['"Access Beta" counts as play', isPlayAnchor({ text: 'Access Beta →' })],
    ['"About" wins over "play" in mixed text', !isPlayAnchor({ text: 'Learn more about playing' })],
    ['a slug path references the game', referencesGame({ href: '/franchise-architect/' }, 'franchise-architect', url)],
    ['the play host references the game', referencesGame({ href: url }, 'franchise-architect', url)],
    ['an unrelated href does not', !referencesGame({ href: '/games/solara/' }, 'franchise-architect', url)],
    ['THE S294 BUG: a stale on-site path is flagged', auditAnchor(a(stalePath), 'franchise-architect', url).some((p) => p.includes('registry playUrl'))],
    ['a correct external CTA passes', auditAnchor(a(good), 'franchise-architect', url).length === 0],
    ['a same-tab external CTA is allowed (UX choice, not a defect)', auditAnchor(a(noTarget), 'franchise-architect', url).length === 0],
    ['a new tab WITHOUT a safe rel is flagged', auditAnchor(a(noRel), 'franchise-architect', url).some((p) => p.includes('tabnabbing'))],
    ['rel="noopener" satisfies the new-tab rule', auditAnchor(a(`<a href="${url}" target="_blank" rel="noopener">Play</a>`), 'franchise-architect', url).length === 0],
    ['a same-tab CTA with no rel at all is fine', auditAnchor(a(`<a href="${url}">Play</a>`), 'franchise-architect', url).length === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-play-cta-registry-sync --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-play-cta-registry-sync --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'game-registry.json'), 'utf8')).games || {};
  const external = Object.entries(registry).filter(([, g]) => typeof g.playUrl === 'string' && /^https?:\/\//.test(g.playUrl));
  const findings = [];
  let checked = 0;

  for (const rel of trackedHtml()) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const html = fs.readFileSync(abs, 'utf8');
    const anchors = parseAnchors(html);
    for (const [slug, game] of external) {
      for (const anchor of anchors) {
        if (!isPlayAnchor(anchor)) continue;
        if (!referencesGame(anchor, slug, game.playUrl)) continue;
        checked += 1;
        for (const problem of auditAnchor(anchor, slug, game.playUrl)) {
          findings.push(`${rel}: ${slug} play CTA "${anchor.text}" — ${problem}`);
        }
      }
    }
  }

  if (findings.length) {
    console.error('check-play-cta-registry-sync: Play CTA(s) disagree with data/game-registry.json:');
    for (const f of findings) console.error(`  ✗ ${f}`);
    console.error('  the registry is the single source of truth for play URLs — change it there, then match every CTA.');
    process.exit(1);
  }
  console.log(`check-play-cta-registry-sync: ${checked} play CTA(s) across ${external.length} externally-hosted game(s) match the registry`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
