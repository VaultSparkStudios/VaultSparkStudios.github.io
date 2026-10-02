#!/usr/bin/env node
/**
 * build-dispatch-desk-panel.mjs — put The Desk Dispatch on /dispatch/.
 *
 * /dispatch/ is the studio's mailing-list home, but it only offered the Studio
 * Dispatch (Kit, footer form). The Desk's newsletter is a second, separate list
 * (Brevo, double opt-in) and readers looking for "the dispatch" had no way to
 * find it there. This splices a marked block — the shared Desk Dispatch
 * component plus an honest note about the two lists — directly after the
 * Studio Dispatch signup. The backend lists stay separate on purpose.
 *
 * Styles are the news-desk.css dispatch region inlined (single source) and the
 * client is the shared inline script, so /dispatch/ gains no new asset request
 * and rotates no shell hash.
 *
 * Modes: (default) apply · --check (byte-drift gate) · --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deskDispatchCta, deskDispatchCss, DESK_DISPATCH_SCRIPT, selfTest as componentSelfTest } from './lib/desk-dispatch-cta.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = path.join(ROOT, 'dispatch', 'index.html');

export const START = '<!-- desk-dispatch-panel:start -->';
export const END = '<!-- desk-dispatch-panel:end -->';
/** The block goes immediately before the Past editions section. */
export const ANCHOR = '<section class="np-section" aria-labelledby="archive-heading">';

export function renderPanel(css = deskDispatchCss()) {
  return [
    START,
    '    <section class="np-section desk-dispatch-home" aria-labelledby="dispatch-h-dispatch-page">',
    `      <style>${css}\n.desk-dispatch-home .desk-dispatch{margin-top:0}.desk-dispatch-home .np-note{margin-top:1.1rem}.desk-dispatch-lists{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:0 0 1.4rem;padding:0;list-style:none}.desk-dispatch-lists li{padding:1rem 1.1rem;border:1px solid var(--header-border);border-radius:14px;background:var(--bg-soft);color:var(--muted);font-size:.9rem;line-height:1.55}.desk-dispatch-lists strong{display:block;margin-bottom:.25rem;color:var(--text)}@media(max-width:700px){.desk-dispatch-lists{grid-template-columns:minmax(0,1fr)}}</style>`,
    '      <div class="container">',
    '        <h2 class="desk-dispatch-home__title">Two lists, two kinds of email</h2>',
    '        <ul class="desk-dispatch-lists">',
    '          <li><strong>Studio Dispatch</strong>Studio news: games, tools and reveals leaving the forge. Sent when something is real. Signup above and in every page footer.</li>',
    '          <li><strong>The Desk Dispatch</strong>The studio’s AI newsroom: the lead argument, the quiet story and predictions that came due, written by fictional AI correspondents. Its own double opt-in list, below.</li>',
    '        </ul>',
    `        ${deskDispatchCta('dispatch-page', { heading: 'Get The Desk Dispatch.' })}`,
    '        <p class="np-note">The lists are separate: joining one does not add you to the other, and each email carries its own one-click unsubscribe.</p>',
    '      </div>',
    `      ${DESK_DISPATCH_SCRIPT}`,
    '    </section>',
    END,
  ].join('\n');
}

export function stripPanel(html) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1 || b < a) return html;
  return html.slice(0, a).replace(/[ \t]*$/, '') + html.slice(b + END.length).replace(/^\n\n/, '');
}

export function splicePanel(html, block) {
  const clean = stripPanel(html);
  const at = clean.indexOf(ANCHOR);
  if (at === -1) throw new Error(`cannot place the Desk Dispatch panel: anchor not found in dispatch/index.html`);
  const lineStart = clean.lastIndexOf('\n', at) + 1;
  const indent = clean.slice(lineStart, at);
  return `${clean.slice(0, lineStart)}${block}\n\n${indent}${clean.slice(at)}`;
}

function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, Boolean(ok)]);
  const page = `<main>\n    <section class="np-section" aria-label="x"></section>\n\n    ${ANCHOR}\n    </section>\n</main>`;
  const block = renderPanel('.desk-dispatch{}');
  const once = splicePanel(page, block);
  t('inserted before Past editions', once.indexOf(START) < once.indexOf(ANCHOR));
  t('re-running is byte-stable', splicePanel(once, block) === once);
  t('stripping restores the page', stripPanel(once) === page);
  t('exactly one panel after two runs', (splicePanel(once, block).match(/desk-dispatch-panel:start/g) || []).length === 1);
  t('names both lists honestly', block.includes('Studio Dispatch') && block.includes('The Desk Dispatch') && /separate/i.test(block));
  t('uses the shared form + client', block.includes('form class="desk-dispatch-form" data-dispatch data-source="dispatch-page"') && block.includes('/desk/dispatch/subscribe'));
  t('missing anchor fails loudly', (() => { try { splicePanel('<main></main>', block); return false; } catch { return true; } })());
  for (const [name, ok] of cases) if (!ok) console.error(`✗ ${name}`);
  const failed = cases.filter(([, ok]) => !ok).length;
  console.log(`dispatch-desk-panel self-test: ${cases.length - failed}/${cases.length} passed`);
  // The shared component's own contract runs here so one build:check entry covers both.
  const componentOk = componentSelfTest();
  if (failed || !componentOk) process.exit(1);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const html = fs.readFileSync(PAGE, 'utf8');
  const next = splicePanel(html, renderPanel());
  if (process.argv.includes('--check')) {
    if (html !== next) {
      console.error('dispatch-desk-panel: dispatch/index.html drifted — run `node scripts/build-dispatch-desk-panel.mjs`');
      process.exit(1);
    }
    console.log('dispatch-desk-panel: --check ok');
    return;
  }
  fs.writeFileSync(PAGE, next);
  console.log('dispatch-desk-panel: dispatch/index.html updated');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
