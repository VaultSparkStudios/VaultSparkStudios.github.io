#!/usr/bin/env node
/**
 * check-theme-boot-contract.mjs — S304 (plan item 1).
 *
 * THE GAP IT CLOSES: the pre-paint theme boot script was broken for ~100
 * sessions (`classList.remove.apply(element, r)` → Illegal invocation, eaten
 * by the boot's own try/catch) because nothing ever EXECUTED the snippet —
 * every gate inspected text, and theme-toggle.js repaired the symptom after
 * paint. This gate runs the actual generated snippet in a stub DOM whose
 * classList methods enforce browser `this` semantics, so that exact class of
 * regression fails the build instead of shipping for months.
 *
 * Modes:
 *   --self-test   fixture + MUTATION case (re-introduce the historical bug and
 *                 assert this gate catches it), exit 0/1
 *   (default)     execute the boot from real generated pages, exit 0/1
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.includes('--self-test');

/** Pages the gate executes against: the homepage (canonical shell) and atlas
 * (the page with NO theme-toggle.js — the boot is its only theme mechanism). */
const PAGES = ['index.html', 'atlas/index.html'];

const BOOT_RE = /<script>(!function\(\)\{try\{var t=localStorage\.getItem\('vs_theme'\)[\s\S]*?\}\(\);)<\/script>/;

export function extractBoot(html) {
  const match = BOOT_RE.exec(html);
  return match ? match[1] : null;
}

/**
 * Stub DOM with REAL browser `this` semantics on classList methods: calling
 * remove/add with any `this` other than the classList object throws
 * `TypeError: Illegal invocation`, exactly like a DOMTokenList. Without this,
 * the historical bug would pass the stub while failing every browser.
 */
export function stubDom({ stored = {} } = {}) {
  function makeElement() {
    const el = { classes: ['dark-mode'], dataset: {} };
    const classList = {};
    classList.remove = function (...names) {
      if (this !== classList) throw new TypeError('Illegal invocation');
      el.classes = el.classes.filter((c) => !names.includes(c));
    };
    classList.add = function (...names) {
      if (this !== classList) throw new TypeError('Illegal invocation');
      for (const n of names) if (!el.classes.includes(n)) el.classes.push(n);
    };
    el.classList = classList;
    return el;
  }
  const documentElement = makeElement();
  const body = makeElement();
  return {
    document: { documentElement, body },
    localStorage: { getItem: (k) => (k in stored ? stored[k] : null) },
    documentElement,
    body,
  };
}

/** Execute a boot snippet against the stub; returns the final element state. */
export function runBoot(snippet, { stored } = {}) {
  const dom = stubDom({ stored });
  new Function('document', 'localStorage', snippet)(dom.document, dom.localStorage);
  return dom;
}

export function verdictFor(snippet) {
  const problems = [];
  // 1 — a stored non-default theme must land PRE-PAINT, with no repair script.
  const light = runBoot(snippet, { stored: { vs_theme: 'light' } });
  for (const [name, el] of [['documentElement', light.documentElement], ['body', light.body]]) {
    if (!el.classes.includes('light-mode')) problems.push(`${name} missing light-mode after boot (classes: ${el.classes.join(',') || 'none'})`);
    if (el.classes.includes('dark-mode')) problems.push(`${name} still carries dark-mode after boot`);
    if (el.dataset.theme !== 'light') problems.push(`${name}.dataset.theme is ${JSON.stringify(el.dataset.theme)}, expected "light"`);
  }
  // 2 — the default path stays dark and never throws.
  const dark = runBoot(snippet, { stored: {} });
  if (!dark.body.classes.includes('dark-mode')) problems.push('default boot lost dark-mode');
  return problems;
}

function selfTest() {
  let pass = 0, fail = 0;
  const ok = (cond, label) => { if (cond) pass++; else { fail++; console.error(`  ✗ ${label}`); return; } console.log(`  ✓ ${label}`); };

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const snippet = extractBoot(html);
  ok(!!snippet, 'boot snippet extracted from the real homepage');
  ok(verdictFor(snippet).length === 0, 'the real generated boot applies a stored theme pre-paint');

  // THE MUTATION: re-introduce the historical bug byte-for-byte and assert the
  // gate FAILS it. A gate that passes its own target defect is decorative.
  const broken = snippet
    .replaceAll('.apply(document.documentElement.classList,r)', '.apply(document.documentElement,r)')
    .replaceAll('.apply(document.body.classList,r)', '.apply(document.body,r)');
  ok(broken !== snippet, 'mutation actually altered the snippet');
  const brokenProblems = verdictFor(broken);
  ok(brokenProblems.length > 0, 'THE HISTORICAL BUG IS CAUGHT: wrong-this apply fails the gate');
  ok(brokenProblems.some((p) => p.includes('dark-mode')), 'the failure names the symptom (stale dark-mode)');

  // The stub itself enforces browser semantics.
  let threw = false;
  try { const d = stubDom(); d.documentElement.classList.remove.apply(d.documentElement, ['x']); } catch (e) { threw = /Illegal invocation/.test(String(e)); }
  ok(threw, 'stub DOM throws Illegal invocation on wrong-this, like a real DOMTokenList');

  console.log(`check-theme-boot-contract --self-test: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

function main() {
  const failures = [];
  for (const rel of PAGES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) { failures.push(`${rel}: page missing`); continue; }
    const snippet = extractBoot(fs.readFileSync(abs, 'utf8'));
    if (!snippet) { failures.push(`${rel}: boot snippet not found (BOOT_RE mismatch — generator changed shape?)`); continue; }
    for (const p of verdictFor(snippet)) failures.push(`${rel}: ${p}`);
  }
  if (failures.length) {
    console.error(`✗ check-theme-boot-contract: ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`✓ check-theme-boot-contract: boot executes correctly on ${PAGES.length} page(s) (stored theme lands pre-paint)`);
}

if (SELF_TEST) selfTest(); else main();
