#!/usr/bin/env node
/* check-rum-allowlist.mjs — S188 RUM allowlist integrity gate.

   The /v/rum beacon transport drops any ux event whose name is not in the
   Worker's RUM_UX_EVENTS allowlist. In S186 a whole feature's telemetry was
   lost this way: ignis-hint dispatched a vs:ux CustomEvent no transport listened
   to. The inverse failure is just as quiet — an allowlisted name nothing emits
   is dead config that reads as "instrumented".

   This gate keeps the two sets in sync structurally:
     • emitted-but-not-allowlisted  → ERROR (beacon silently dropped at the edge)
     • allowlisted-but-never-emitted → WARN  (dead allowlist entry)

   Source of truth:
     allowlist  = RUM_UX_EVENTS Set literal in cloudflare/security-headers-worker.js
     emissions  = emitUx('name') / emitUx("name") literals in assets/*.js (source,
                  not generated shell/bundle copies)

   Import-safe: side effects run only when invoked directly. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = join(ROOT, 'cloudflare', 'security-headers-worker.js');
const ASSETS_DIR = join(ROOT, 'assets');
// Root-level source files that also emit RUM events (service worker lives here)
const ROOT_SOURCE_FILES = ['sw.js'];

// Names the gate should not flag as "dead" even when no asset emits them — e.g.
// events emitted from edge functions or HTML inline (none today; kept explicit).
const EMIT_EXEMPT = new Set([]);

/** Extract the string members of the RUM_UX_EVENTS Set literal. */
export function parseAllowlist(workerSrc) {
  const m = workerSrc.match(/RUM_UX_EVENTS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!m) return [];
  const names = [];
  const re = /['"]([a-z0-9][a-z0-9:_-]*)['"]/gi;
  let g;
  while ((g = re.exec(m[1]))) names.push(g[1]);
  return Array.from(new Set(names));
}

/** Extract RUM event emissions from a source string. Matches any emit-shaped
   call — emit('x'), emitUx('x'), rumBeacon('x') — since the local helper name
   varies by file (footer-dispatch uses emitUx; nav-sheet uses emit; sw.js uses
   rumBeacon). Returns { names, prefixes }:
     names    = concrete static event names
     prefixes = dynamic stems like 'nav-sheet:' from emit('nav-sheet:' + cause),
                which COVER any allowlist entry that starts with them.
   A literal is treated as a dynamic prefix when it ends in ':' or is immediately
   followed by a '+' concatenation. Only meaningful for files on the /v/rum
   transport; callers gate on that to avoid matching unrelated event emitters.

   Also credits the RAW-BEACON form `event: 'name'` — some modules (S229
   inp-telemetry.js) build the JSON body inline and post it via
   navigator.sendBeacon('/v/rum', …) instead of an emit*() helper. Without this
   the scanner falsely reports the allowlist entry as dead config — a trap that
   invites "cleanup" that would silently break edge acceptance of the event. */
export function parseEmissions(src) {
  const names = [];
  const prefixes = [];
  // Matches emitUx('x'), emit('x'), rumBeacon('x') and their variants
  const re = /\b(?:emit\w*|rumBeacon)\(\s*['"]([a-z0-9][a-z0-9:_-]*)['"]\s*(\+)?/gi;
  let g;
  while ((g = re.exec(src))) {
    const token = g[1];
    const concatenated = g[2] === '+';
    if (concatenated || token.endsWith(':')) prefixes.push(token);
    else names.push(token);
  }
  // Raw sendBeacon body: { event: 'inp:slow_interaction', … }. Bounded to
  // /v/rum files by the caller, so a stray `event:` elsewhere can't leak in.
  const beaconRe = /\bevent\s*:\s*['"]([a-z0-9][a-z0-9:_-]*)['"]/gi;
  while ((g = beaconRe.exec(src))) {
    const token = g[1];
    if (token.endsWith(':')) prefixes.push(token);
    else names.push(token);
  }
  // Bounded one-hop dataflow: a local helper may emit a named parameter and
  // callers may supply a static event string (for example wire(..., uxEvent)
  // -> emitUx(uxEvent)). Resolve only direct function declarations and literal
  // arguments; never guess through expressions or cross-file calls.
  const forwardedRe = /\b(?:emit\w*|rumBeacon)\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
  while ((g = forwardedRe.exec(src))) {
    const parameter = g[1];
    const declarations = [...src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)];
    for (const declaration of declarations) {
      const params = declaration[2].split(',').map((part) => part.trim());
      const position = params.indexOf(parameter);
      if (position < 0) continue;
      const helper = declaration[1];
      const calls = new RegExp('\\b' + helper + '\\s*\\(', 'g');
      let call;
      while ((call = calls.exec(src))) {
        if (/function\\s+$/.test(src.slice(Math.max(0, call.index - 20), call.index))) continue;
        let cursor = calls.lastIndex;
        let depth = 1;
        let quote = '';
        let escaped = false;
        for (; cursor < src.length && depth; cursor++) {
          const char = src[cursor];
          if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
          } else if (char === '"' || char === "'") quote = char;
          else if (char === '(') depth++;
          else if (char === ')') depth--;
        }
        if (depth) continue;
        const raw = src.slice(calls.lastIndex, cursor - 1);
        const args = [];
        let start = 0;
        let nested = 0;
        quote = '';
        escaped = false;
        for (let index = 0; index <= raw.length; index++) {
          const char = raw[index] || ',';
          if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = '';
          } else if (char === '"' || char === "'") quote = char;
          else if (char === '(' || char === '[' || char === '{') nested++;
          else if (char === ')' || char === ']' || char === '}') nested--;
          else if (char === ',' && nested === 0) { args.push(raw.slice(start, index).trim()); start = index + 1; }
        }
        const literal = args[position]?.match(/^['"]([a-z0-9][a-z0-9:_-]*)['"]\s*(\+)?/i);
        if (literal) {
          if (literal[2] || literal[1].endsWith(':')) prefixes.push(literal[1]);
          else names.push(literal[1]);
        }
      }
    }
  }
  return { names, prefixes };
}

function isSourceAsset(file) {
  if (!file.endsWith('.js')) return false;
  if (file.endsWith('.bundle.js')) return false;        // generated bundle
  if (/\.shell-[0-9a-f]+\.js$/.test(file)) return false; // hashed shell copies
  if (file.startsWith('ambient.shell')) return false;
  if (file.startsWith('ambient-core.shell')) return false;
  if (file.startsWith('ambient-feature.shell')) return false;
  return true;
}

/** Core analysis — pure, testable. emissionMap: file → { names, prefixes }.
   Returns { missing, dead }. A dynamic prefix covers any allowlist entry that
   starts with it (so emit('nav-sheet:' + cause) keeps nav-sheet:close alive). */
export function analyze(allowlist, emissionMap) {
  const allowSet = new Set(allowlist);
  const emittedSet = new Set();
  const prefixSet = new Set();
  for (const { names = [], prefixes = [] } of Object.values(emissionMap)) {
    names.forEach((n) => emittedSet.add(n));
    prefixes.forEach((p) => prefixSet.add(p));
  }
  const coveredByPrefix = (name) => Array.from(prefixSet).some((p) => name.startsWith(p));

  const missing = []; // emitted concrete name but not allowlisted → silently dropped
  for (const [file, { names = [] }] of Object.entries(emissionMap)) {
    for (const n of names) {
      if (!allowSet.has(n)) missing.push({ name: n, file });
    }
  }
  const dead = allowlist.filter((n) => !emittedSet.has(n) && !coveredByPrefix(n) && !EMIT_EXEMPT.has(n));
  return { missing, dead };
}

function runSelfTest() {
  let fail = 0;
  const assert = (cond, msg) => { if (!cond) { console.error('  ✗ ' + msg); fail++; } };

  // parseAllowlist
  const al = parseAllowlist("const RUM_UX_EVENTS = new Set([\n 'a:x', 'b:y', // note\n 'c:z',\n]);");
  assert(al.length === 3 && al.includes('a:x') && al.includes('c:z'), 'parseAllowlist extracts 3 names ignoring comments');

  // parseEmissions — static names, dupes, helper-name variance
  const em = parseEmissions("emitUx('a:x'); foo(); emit(\"b:y\"); emitUx('a:x');");
  assert(em.names.length === 3 && em.names.filter((n) => n === 'a:x').length === 2 && em.prefixes.length === 0, 'parseEmissions finds static literals (emit + emitUx) incl dupes');

  // parseEmissions — dynamic prefix from concatenation
  const ep = parseEmissions("emit('nav-sheet:' + cause); emit('nav-sheet:open');");
  assert(ep.prefixes.length === 1 && ep.prefixes[0] === 'nav-sheet:' && ep.names.length === 1 && ep.names[0] === 'nav-sheet:open', 'parseEmissions splits dynamic prefix from static name');

  // parseEmissions — raw sendBeacon body (S229 inp-telemetry.js form)
  const eb = parseEmissions("var body = JSON.stringify({ event: 'inp:slow_interaction', route: r }); navigator.sendBeacon('/v/rum', body);");
  assert(eb.names.includes('inp:slow_interaction'), 'parseEmissions credits raw-beacon event: literal');

  const ef = parseEmissions("function wire(form, uxEvent) { emitUx(uxEvent); } wire(node, 'studio-dispatch:subscribe');");
  assert(ef.names.includes('studio-dispatch:subscribe'), 'parseEmissions resolves a direct helper parameter from a literal caller');
  const en = parseEmissions("function wire(form, uxEvent) { emitUx(uxEvent); } wire(node, eventName);");
  assert(!en.names.includes('eventName'), 'parseEmissions does not guess through dynamic caller arguments');

  // analyze — clean
  let r = analyze(['a:x', 'b:y'], { 'f.js': { names: ['a:x', 'b:y'], prefixes: [] } });
  assert(r.missing.length === 0 && r.dead.length === 0, 'analyze clean → no missing, no dead');

  // analyze — emitted-but-not-allowlisted (the S186 bug)
  r = analyze(['a:x'], { 'f.js': { names: ['a:x', 'ghost:z'], prefixes: [] } });
  assert(r.missing.length === 1 && r.missing[0].name === 'ghost:z' && r.missing[0].file === 'f.js', 'analyze flags emitted-but-not-allowlisted as missing');

  // analyze — allowlisted-but-never-emitted (dead config)
  r = analyze(['a:x', 'dead:q'], { 'f.js': { names: ['a:x'], prefixes: [] } });
  assert(r.dead.length === 1 && r.dead[0] === 'dead:q', 'analyze flags allowlisted-but-never-emitted as dead');

  // analyze — dynamic prefix keeps matching allowlist entries alive
  r = analyze(['nav:open', 'nav:close', 'nav:drag-close'], { 'f.js': { names: ['nav:open'], prefixes: ['nav:'] } });
  assert(r.dead.length === 0 && r.missing.length === 0, 'analyze: dynamic prefix covers allowlist entries (no dead, no missing)');

  if (fail === 0) { console.log('✓ check-rum-allowlist --self-test: 9/9 passed'); process.exit(0); }
  console.error('✗ check-rum-allowlist --self-test: ' + fail + ' failed'); process.exit(1);
}

function runScan() {
  const allowlist = parseAllowlist(readFileSync(WORKER, 'utf8'));
  if (!allowlist.length) {
    console.error('✗ check-rum-allowlist: could not parse RUM_UX_EVENTS from worker — refusing to pass blind');
    process.exit(1);
  }
  const emissionMap = {};
  for (const file of readdirSync(ASSETS_DIR).filter(isSourceAsset)) {
    const src = readFileSync(join(ASSETS_DIR, file), 'utf8');
    if (!src.includes('/v/rum')) continue; // only files on the RUM beacon transport
    const emitted = parseEmissions(src);
    if (emitted.names.length || emitted.prefixes.length) emissionMap[file] = emitted;
  }
  // Also scan root-level source files (sw.js uses rumBeacon() not emitUx())
  for (const file of ROOT_SOURCE_FILES) {
    const absPath = join(ROOT, file);
    if (!existsSync(absPath)) continue;
    const src = readFileSync(absPath, 'utf8');
    const emitted = parseEmissions(src);
    if (emitted.names.length || emitted.prefixes.length) emissionMap[file] = emitted;
  }

  const { missing, dead } = analyze(allowlist, emissionMap);

  for (const m of missing) {
    console.error('✗ ' + m.file + ': emits "' + m.name + '" but it is NOT in RUM_UX_EVENTS — the /v/rum beacon is silently dropped. Add it to the Worker allowlist.');
  }
  for (const d of dead) {
    console.warn('⚠ allowlist has "' + d + '" but no asset emits it (dead config — remove it or wire the emit).');
  }

  if (missing.length) {
    console.error('✗ check-rum-allowlist: ' + missing.length + ' emitted event(s) not allowlisted — fix before push');
    process.exit(1);
  }
  const callSites = Object.values(emissionMap).reduce((n, e) => n + e.names.length + e.prefixes.length, 0);
  console.log('✓ check-rum-allowlist: ' + allowlist.length + ' allowlisted · ' + callSites + ' emit call-site(s) · all in sync' + (dead.length ? ' (' + dead.length + ' dead warning)' : ''));
  process.exit(0);
}

const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('check-rum-allowlist.mjs');
if (invokedDirectly) {
  if (process.argv.includes('--self-test')) runSelfTest();
  else runScan();
}
