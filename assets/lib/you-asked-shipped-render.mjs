/* you-asked-shipped-render.mjs — the ONE renderer for the "You asked → we shipped"
 * closed-loop box (S277 CLS root-fix).
 *
 * WHY THIS EXISTS: the box used to be injected post-paint by assets/you-asked-shipped.js
 * (fetch → append a whole <section>), which shifted the /changelog/ timeline down and
 * measured ~0.50 of a 0.73 CLS. This module renders the SAME markup at BUILD time so the
 * box is present at first paint — zero CLS — and the client script now skips when the SSR
 * box exists. Node (scripts/build-you-asked-shipped.mjs) and any future browser consumer
 * share this single source so the two paths can never diverge (the divergence class the
 * studio keeps re-learning — see decisions-corpus / shared-reader pattern).
 *
 * Public-safe + honest-dark: receipts carry only aggregate counts + commit summaries;
 * renders nothing (returns '') when no themed receipt has a feedback signal.
 *
 * Pure: no I/O, no Date.now(). "ago" is computed relative to an explicit `nowMs` (the
 * caller passes the feed's own generatedAt) so the build output is deterministic and the
 * --check drift gate is stable.
 */

/** HTML-escape a text value for safe SSR interpolation (client used textContent). */
export function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Relative-time label — byte-for-byte identical rules to the legacy client ago(). */
export function ago(ts, nowMs) {
  const t = Date.parse(ts);
  if (!t) return '';
  const s = (nowMs - t) / 1000;
  if (s < 86400) return 'today';
  const d = Math.round(s / 86400);
  if (d < 14) return d + 'd ago';
  if (d < 60) return Math.round(d / 7) + 'w ago';
  return Math.round(d / 30) + 'mo ago';
}

/** Select + order the receipts the box shows — same predicate/sort/cap as the client. */
export function qualifying(data) {
  const recs = ((data && data.receipts) || []).filter(
    (rec) => (rec.feedbackSignals || 0) > 0 && (rec.shippedCommits || []).length > 0
  );
  recs.sort((a, b) => (b.feedbackSignals || 0) - (a.feedbackSignals || 0));
  return recs.slice(0, 5);
}

/** The inline style block — identical declarations to the legacy client ensureStyles(). */
export const YAS_STYLE =
  '<style id="vs-yas-style">' +
  '.vs-yas{margin:2.5rem 0;padding:1.4rem;border:1px solid var(--line,rgba(255,255,255,.08));border-radius:18px;background:linear-gradient(135deg,rgba(255,196,0,.05),rgba(126,201,255,.03))}' +
  '.vs-yas__eyebrow{font-size:.7rem;text-transform:uppercase;letter-spacing:.09em;color:var(--gold,#ffc400);font-weight:700}' +
  '.vs-yas__title{font-family:Georgia,serif;font-size:1.4rem;margin:.3rem 0 .35rem}' +
  '.vs-yas__note{font-size:.8rem;color:var(--muted,#a8b4d0);margin:0 0 1rem}' +
  '.vs-yas__note a{color:var(--gold,#ffc400)}' +
  '.vs-yas__row{display:flex;align-items:flex-start;gap:.8rem;padding:.75rem 0;border-top:1px solid var(--line,rgba(255,255,255,.06))}' +
  '.vs-yas__ask{flex:0 0 auto;min-width:120px}' +
  '.vs-yas__ask-k{display:block;font-size:.72rem;color:var(--dim,#6272a0);text-transform:uppercase;letter-spacing:.06em}' +
  '.vs-yas__theme{font-weight:700;color:var(--text,#eef2ff)}' +
  '.vs-yas__signals{font-size:.78rem;color:var(--muted,#a8b4d0)}' +
  '.vs-yas__arrow{flex:0 0 auto;color:var(--gold,#ffc400);align-self:center;font-weight:700}' +
  '.vs-yas__ships{flex:1 1 auto;min-width:0}' +
  '.vs-yas__ship{font-size:.86rem;color:var(--muted,#a8b4d0);line-height:1.5}' +
  '.vs-yas__ship-when{color:var(--dim,#6272a0);font-size:.76rem}' +
  '</style>';

function renderRow(rec, nowMs) {
  const n = rec.feedbackSignals || 0;
  const theme = esc(rec.label || rec.theme || 'Feedback');
  const ships = (rec.shippedCommits || [])
    .slice(0, 3)
    .map((c) => {
      const when = ago(c.ts, nowMs);
      const whenSpan = when ? ' <span class="vs-yas__ship-when">· ' + esc(when) + '</span>' : '';
      return '<div class="vs-yas__ship">✦ ' + esc(c.summary || 'shipped') + ' ' + whenSpan + '</div>';
    })
    .join('');
  return (
    '<div class="vs-yas__row">' +
    '<div class="vs-yas__ask">' +
    '<span class="vs-yas__ask-k">You asked</span>' +
    '<div class="vs-yas__theme">' + theme + '</div>' +
    '<div class="vs-yas__signals">' + n + (n === 1 ? ' signal' : ' signals') + '</div>' +
    '</div>' +
    '<div class="vs-yas__arrow" aria-hidden="true">→</div>' +
    '<div class="vs-yas__ships">' + ships + '</div>' +
    '</div>'
  );
}

/**
 * Render the full closed-loop box as an HTML string, or '' for honest-dark (no receipts).
 * @param {object} data  parsed api/ship-receipts.json
 * @param {number} nowMs reference epoch for "ago" (pass Date.parse(data.generatedAt))
 */
export function renderYasBox(data, nowMs) {
  const recs = qualifying(data);
  if (!recs.length) return '';
  return (
    YAS_STYLE +
    '<section class="vs-yas" data-yas-ssr>' +
    '<div class="vs-yas__eyebrow">Closed loops</div>' +
    '<h2 class="vs-yas__title">You asked → we shipped.</h2>' +
    // S344 — these rows are drawn from the studio's own release history, so they
    // carry working vocabulary a visitor has no reason to know ("closeout",
    // "handoff"). One line of orientation, with the definition a click away, is the
    // difference between a reader feeling let in and feeling locked out — and it is
    // what check-vocabulary-consistency asks for: explain the term where it is used,
    // not only in chrome the gate rightly ignores.
    '<p class="vs-yas__note">Straight from our release log — so the wording is ours. <a href="/how-we-build/">How we build</a> explains the terms.</p>' +
    recs.map((rec) => renderRow(rec, nowMs)).join('') +
    '</section>'
  );
}
