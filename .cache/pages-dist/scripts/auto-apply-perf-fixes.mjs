#!/usr/bin/env node
/**
 * auto-apply-perf-fixes.mjs (S162 audit · perf-fix-recipe-autoloop)
 *
 * Closes the perf-regression loop by applying SAFE, structured fix actions that
 * `check-perf-budget.mjs` can attach to a recipe. "Safe" here is a hard contract,
 * not a vibe:
 *
 *   1. ADDITIVE      — only adds markup/attributes; never deletes or reorders.
 *   2. IDEMPOTENT    — re-running is a no-op; an action that's already satisfied
 *                      is skipped, never duplicated.
 *   3. REVERSIBLE    — every change is a single git-visible diff; rollback is
 *                      `git checkout <file>`. An ndjson audit trail records each.
 *   4. OPT-IN        — only acts on recipe actions explicitly tagged
 *                      `autoApply: true` with a recognized `type`. Diagnostic
 *                      text candidates are never executed.
 *   5. DRY-RUN FIRST — does nothing without `--apply`. The default prints the
 *                      plan so a human (or founder-twin) approves before writing.
 *
 * Why the guardrails are this strict: on a live, high-traffic site, blindly
 * adding `defer`/`preload` can break script ordering or waste the preload budget
 * — the exact failure class behind past LCP regressions. So this applier handles
 * only two genuinely-safe transforms:
 *
 *   • add-resource-hint  — insert <link rel="preconnect"|"dns-prefetch"> in <head>
 *                          if absent. Purely additive; speeds cold third-party
 *                          connections; cannot break rendering.
 *   • add-attr           — add a boolean/value attribute (e.g. fetchpriority="high",
 *                          decoding="async") to a uniquely-matched element if it
 *                          lacks it. Skipped when the selector matches ≠ 1 node.
 *
 * If no recipe carries structured autoApply actions, this is a reported no-op —
 * which correctly signals "the over-budget routes need human-reviewed structural
 * fixes," not silent inaction.
 *
 * Usage:
 *   node scripts/auto-apply-perf-fixes.mjs            # dry-run (default)
 *   node scripts/auto-apply-perf-fixes.mjs --apply     # write changes
 *   node scripts/auto-apply-perf-fixes.mjs --self-test # appliers + idempotency
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RECIPES = path.join(ROOT, '.cache', 'perf-fix-recipes.json');
const LOG = path.join(ROOT, '.cache', 'perf-autofix-log.ndjson');

const APPLY = process.argv.includes('--apply');
const SELF_TEST = process.argv.includes('--self-test');

const SAFE_TYPES = new Set(['add-resource-hint', 'add-attr']);

// ── Pure transforms (return { changed, html, note }) ───────────────────────────

/** Insert a <link rel="..." href="..."> into <head> if an equivalent isn't present. */
function applyResourceHint(html, action) {
  const rel = String(action.rel || 'preconnect');
  const href = String(action.href || '');
  if (!href) return { changed: false, html, note: 'missing href' };
  // Idempotency: any <link> with the same rel+href already there?
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const present = new RegExp(`<link[^>]*rel=["']${rel}["'][^>]*href=["']${escaped}["']`, 'i').test(html) ||
                  new RegExp(`<link[^>]*href=["']${escaped}["'][^>]*rel=["']${rel}["']`, 'i').test(html);
  if (present) return { changed: false, html, note: 'hint already present' };
  const tag = `  <link rel="${rel}" href="${href}"${action.crossorigin ? ' crossorigin' : ''} />`;
  const headIdx = html.search(/<head[^>]*>/i);
  if (headIdx === -1) return { changed: false, html, note: 'no <head>' };
  const insertAt = html.indexOf('>', headIdx) + 1;
  const next = html.slice(0, insertAt) + '\n' + tag + html.slice(insertAt);
  return { changed: true, html: next, note: `inserted ${rel} ${href}` };
}

/** Add attr="value" to a single element matched by a simple tag+marker, if absent. */
function applyAddAttr(html, action) {
  const { tagMatch, attr, value } = action;
  if (!tagMatch || !attr) return { changed: false, html, note: 'missing tagMatch/attr' };
  // tagMatch is a literal substring identifying exactly one opening tag (e.g.
  // an id= or a unique src=). We require exactly one match to stay safe.
  const escaped = tagMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<([a-zA-Z0-9]+)([^>]*${escaped}[^>]*)>`, 'g');
  const matches = [...html.matchAll(re)];
  if (matches.length !== 1) return { changed: false, html, note: `tagMatch matched ${matches.length} nodes (need exactly 1)` };
  const m = matches[0];
  if (new RegExp(`\\b${attr}\\b`, 'i').test(m[2])) return { changed: false, html, note: 'attr already present' };
  const attrStr = value === true || value === undefined ? ` ${attr}` : ` ${attr}="${value}"`;
  const replaced = `<${m[1]}${m[2]}${attrStr}>`;
  const next = html.slice(0, m.index) + replaced + html.slice(m.index + m[0].length);
  return { changed: true, html: next, note: `added ${attr}${value && value !== true ? '="' + value + '"' : ''}` };
}

function applyAction(html, action) {
  if (action.type === 'add-resource-hint') return applyResourceHint(html, action);
  if (action.type === 'add-attr') return applyAddAttr(html, action);
  return { changed: false, html, note: `unsupported type ${action.type}` };
}

// ── Recipe walk ─────────────────────────────────────────────────────────────

function collectActions(recipeDoc) {
  const out = [];
  for (const entry of recipeDoc.entries || []) {
    for (const recipe of entry.recipes || []) {
      for (const action of recipe.actions || []) {
        if (action && action.autoApply === true && SAFE_TYPES.has(action.type)) {
          out.push({ route: entry.route, profile: entry.profile, action });
        }
      }
    }
  }
  return out;
}

function targetFileFor(action, route) {
  // Explicit file wins; else derive the page index.html from the route.
  if (action.file) return path.join(ROOT, action.file);
  const clean = route === '/' ? '' : route.replace(/^\/|\/$/g, '');
  return path.join(ROOT, clean, 'index.html');
}

function logEntry(rec) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...rec }) + '\n');
  } catch { /* logging is best-effort */ }
}

function run() {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(RECIPES, 'utf8')); }
  catch { console.log('auto-apply-perf-fixes: no .cache/perf-fix-recipes.json — nothing to do'); return 0; }

  const actions = collectActions(doc);
  if (!actions.length) {
    console.log('auto-apply-perf-fixes: 0 structured autoApply actions in recipes.');
    console.log('  (Over-budget routes, if any, need human-reviewed structural fixes — by design.)');
    return 0;
  }

  let applied = 0, skipped = 0;
  for (const { route, action } of actions) {
    const file = targetFileFor(action, route);
    if (!fs.existsSync(file)) { console.log(`  ⤫ ${route}: ${path.relative(ROOT, file)} not found`); skipped += 1; continue; }
    const html = fs.readFileSync(file, 'utf8');
    const res = applyAction(html, action);
    const rel = path.relative(ROOT, file);
    if (!res.changed) { console.log(`  ⤳ ${route} [${action.type}]: skip — ${res.note}`); skipped += 1; continue; }
    if (APPLY) {
      fs.writeFileSync(file, res.html);
      logEntry({ route, file: rel, type: action.type, note: res.note, applied: true });
      console.log(`  ✓ ${route} [${action.type}]: ${res.note} → ${rel}`);
      applied += 1;
    } else {
      console.log(`  • ${route} [${action.type}]: WOULD ${res.note} → ${rel}`);
      applied += 1;
    }
  }
  console.log(`\nauto-apply-perf-fixes: ${APPLY ? 'applied' : 'planned'} ${applied}, skipped ${skipped}${APPLY ? '' : '  (dry-run — pass --apply to write)'}`);
  return 0;
}

// ── Self-test ─────────────────────────────────────────────────────────────────

function selfTest() {
  let pass = 0, total = 0;
  const t = (name, cond) => { total += 1; if (cond) { pass += 1; console.log(`✓ ${name}`); } else console.log(`✘ ${name}`); };

  const baseHtml = '<!doctype html><html><head><title>x</title></head><body><img id="hero" src="/h.webp"></body></html>';

  // resource-hint: applies once, idempotent on re-run
  let r1 = applyResourceHint(baseHtml, { rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: true });
  t('resource-hint adds link', r1.changed && /rel="preconnect" href="https:\/\/js\.stripe\.com" crossorigin/.test(r1.html));
  let r2 = applyResourceHint(r1.html, { rel: 'preconnect', href: 'https://js.stripe.com', crossorigin: true });
  t('resource-hint idempotent', !r2.changed);

  // add-attr: adds to unique element, idempotent, refuses ambiguous
  let a1 = applyAddAttr(baseHtml, { tagMatch: 'id="hero"', attr: 'fetchpriority', value: 'high' });
  t('add-attr adds fetchpriority', a1.changed && /id="hero"[^>]*fetchpriority="high"/.test(a1.html));
  let a2 = applyAddAttr(a1.html, { tagMatch: 'id="hero"', attr: 'fetchpriority', value: 'high' });
  t('add-attr idempotent', !a2.changed);
  let ambiguous = '<img class="card" src="/a.webp"><img class="card" src="/b.webp">';
  let a3 = applyAddAttr(ambiguous, { tagMatch: 'class="card"', attr: 'loading', value: 'lazy' });
  t('add-attr refuses ambiguous match', !a3.changed && /matched 2 nodes/.test(a3.note));

  // collectActions filters non-safe / non-optIn
  const doc = { entries: [{ route: '/', recipes: [{ actions: [
    { type: 'add-attr', autoApply: true, tagMatch: 'id="hero"', attr: 'decoding', value: 'async' },
    { type: 'add-attr', autoApply: false, tagMatch: 'x', attr: 'y' },
    { type: 'delete-everything', autoApply: true },
  ] }] }] };
  t('collectActions keeps only safe opt-in', collectActions(doc).length === 1);

  console.log(`\n${pass}/${total} passed`);
  process.exit(pass === total ? 0 : 1);
}

if (SELF_TEST) selfTest();
else process.exit(run());
