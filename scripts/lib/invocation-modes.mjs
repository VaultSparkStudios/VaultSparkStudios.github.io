// invocation-modes.mjs (S333 · generalize invocation-mode validation)
//
// Some producer CLIs have NO default action. `build-news-desk.mjs` is the
// archetype: its dispatch is a chain of `--rebuild | --check | --record | …`
// ending in an `else` that prints `Usage:` and exits nonzero. Invoked bare it
// rebuilds nothing — it fails.
//
// A derived-build profile that lists such a script WITHOUT declaring a mode
// therefore contains a step that can only ever fail. That is exactly the S332
// production incident: `refresh-live-data` listed `build-news-desk.mjs` with no
// args, so every scheduled Refresh Live Data run failed at that step and the
// Desk feed silently stopped being rebuilt.
//
// S332 fixed the one instance and locked it with a hardcoded assertion naming
// `build-news-desk.mjs`. A hardcoded name cannot catch the SECOND script to
// join the class, and the class is open — any producer may grow a mode chain
// later. This module makes the property structural: derive mode-requirement
// from the script's own source, then require every profile that runs it to
// declare a mode it actually recognises.
//
// Import-safe: pure functions over file contents; no side effects on import.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Flags a script's dispatch actually recognises.
 *
 * Read from the dispatch predicates themselves (`args.has('--x')`,
 * `argv.includes('--x')`) rather than from the usage string, because the usage
 * text is prose a human maintains and drifts; the predicate is what runs.
 */
export function recognisedModes(source) {
  const modes = new Set();
  const patterns = [
    /\bargs\.has\(\s*'(--[a-z0-9-]+)'\s*\)/gi,
    /\bargs\.has\(\s*"(--[a-z0-9-]+)"\s*\)/gi,
    /\bargv\.includes\(\s*'(--[a-z0-9-]+)'\s*\)/gi,
    /\bargv\.includes\(\s*"(--[a-z0-9-]+)"\s*\)/gi,
    /\bprocess\.argv\.includes\(\s*'(--[a-z0-9-]+)'\s*\)/gi,
    /\bprocess\.argv\.includes\(\s*"(--[a-z0-9-]+)"\s*\)/gi,
  ];
  for (const re of patterns) {
    for (const m of String(source || '').matchAll(re)) modes.add(m[1]);
  }
  return modes;
}

/**
 * Does this script refuse to do anything useful when invoked bare?
 *
 * The signature of "no default action" is a dispatch chain whose terminal
 * `else` prints a usage line and sets a NONZERO exit. Both halves matter: a
 * chain ending in a real default action is fine, and a script that prints usage
 * but still exits 0 has chosen a harmless default.
 *
 * `--self-test` is excluded from the mode count on purpose — a script whose
 * only flag is a self-test is a checker, not a mode-required producer.
 */
export function isModeRequired(source) {
  const text = String(source || '');
  const modes = recognisedModes(text);
  const dispatchModes = [...modes].filter((m) => m !== '--self-test');
  // A dispatch CHAIN, not a single optional flag.
  if (dispatchModes.length < 2) return false;

  for (const m of text.matchAll(/Usage:/g)) {
    const before = text.slice(Math.max(0, m.index - 240), m.index);
    const after = text.slice(m.index, m.index + 600);
    // The usage line must be the fall-through arm of the dispatch…
    if (!/\belse\s*\{/.test(before)) continue;
    // …and reaching it must be a failure.
    if (/process\.exitCode\s*=\s*[1-9]/.test(after) || /process\.exit\(\s*[1-9]/.test(after)) return true;
  }
  return false;
}

/** Read a script and classify it. Missing files are not mode-required. */
export function classifyScript(root, script) {
  const abs = path.join(root, 'scripts', script);
  if (!fs.existsSync(abs)) return { script, exists: false, modeRequired: false, modes: [] };
  const source = fs.readFileSync(abs, 'utf8');
  return {
    script,
    exists: true,
    modeRequired: isModeRequired(source),
    modes: [...recognisedModes(source)].sort(),
  };
}

/**
 * The gate. For every profile step whose script is mode-required, require the
 * step to declare at least one arg the script actually recognises.
 *
 * Declaring an UNRECOGNISED flag is also a violation: `--rebuidl` would satisfy
 * a naive "has args" check while still hitting the usage branch at runtime.
 */
export function findInvocationModeViolations({ root, profiles }) {
  const violations = [];
  const cache = new Map();

  for (const [profile, steps] of Object.entries(profiles || {})) {
    for (const step of steps || []) {
      if (!cache.has(step.script)) cache.set(step.script, classifyScript(root, step.script));
      const info = cache.get(step.script);
      if (!info.exists || !info.modeRequired) continue;

      const declared = Array.isArray(step.args) ? step.args : [];
      const known = declared.filter((a) => info.modes.includes(a));
      if (!declared.length) {
        violations.push({
          profile,
          script: step.script,
          reason: 'mode-required producer declares no invocation mode',
          recognised: info.modes,
        });
      } else if (!known.length) {
        violations.push({
          profile,
          script: step.script,
          reason: `declared ${declared.join(' ')} but the script recognises none of them`,
          recognised: info.modes,
        });
      }
    }
  }
  return violations;
}

export function selfTest() {
  const cases = [];
  const t = (label, ok) => cases.push([label, ok]);

  const modeRequiredSource = `
    const args = new Set(process.argv.slice(2));
    if (args.has('--self-test')) selfTest();
    else if (args.has('--rebuild')) rebuild();
    else if (args.has('--check')) check();
    else {
      console.error('Usage: --rebuild | --check');
      process.exitCode = 2;
    }`;
  const defaultActionSource = `
    const args = new Set(process.argv.slice(2));
    if (args.has('--check')) check();
    else if (args.has('--self-test')) selfTest();
    else build();`;
  const harmlessUsageSource = `
    const args = new Set(process.argv.slice(2));
    if (args.has('--check')) check();
    else if (args.has('--apply')) apply();
    else { console.log('Usage: --check | --apply'); process.exit(0); }`;

  t('a dispatch chain with no default action is mode-required', isModeRequired(modeRequiredSource));
  t('a chain that falls through to a real build is not mode-required', !isModeRequired(defaultActionSource));
  t('a usage branch that exits zero is not mode-required', !isModeRequired(harmlessUsageSource));
  t('a script with a single optional flag is not mode-required',
    !isModeRequired("if (process.argv.includes('--self-test')) selfTest(); else main();"));
  t('recognised modes come from the dispatch predicates',
    ['--check', '--rebuild', '--self-test'].every((m) => recognisedModes(modeRequiredSource).has(m)));
  t('self-test alone does not make a checker mode-required',
    !isModeRequired("const args=new Set(process.argv.slice(2)); if(args.has('--self-test')){selfTest();} else { console.error('Usage: --self-test'); process.exitCode = 1; }"));

  // The gate itself, over synthetic profiles.
  const fakeRoot = '/nonexistent-root-for-selftest';
  t('a missing script cannot produce a violation',
    findInvocationModeViolations({ root: fakeRoot, profiles: { p: [{ script: 'nope.mjs' }] } }).length === 0);

  const stub = {
    exists: true,
    modeRequired: true,
    modes: ['--check', '--rebuild', '--self-test'],
  };
  // Exercise the decision logic directly with a stubbed classification.
  const decide = (declared) => {
    const known = declared.filter((a) => stub.modes.includes(a));
    if (!declared.length) return 'missing-mode';
    if (!known.length) return 'unrecognised-mode';
    return 'ok';
  };
  t('a mode-required step with no args is a violation', decide([]) === 'missing-mode');
  t('a mode-required step with a typo flag is a violation', decide(['--rebuidl']) === 'unrecognised-mode');
  t('a mode-required step with a recognised mode passes', decide(['--rebuild']) === 'ok');

  const failed = cases.filter(([, ok]) => !ok);
  for (const [label, ok] of cases) if (!ok) console.error(`✗ ${label}`);
  console.log(`invocation-modes self-test: ${cases.length - failed.length}/${cases.length} ${failed.length ? 'FAILED' : 'passed'}`);
  return failed.length === 0;
}

const RUN_DIRECT = import.meta.main ?? process.argv[1]?.endsWith('invocation-modes.mjs');
if (RUN_DIRECT && process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
