#!/usr/bin/env node
/**
 * Does every canon that names an owner actually HAVE that owner?
 *
 * S300. `CANON_MATRIX.json` classifies each canon's checker. A `{probe:'<id>'}`
 * entry means "a doctor probe with this id verifies this canon", and
 * check-canon-conformance trusts that claim without resolving it — it reports the
 * canon `doctor-owned` and moves on, deliberately, to avoid recursing into the
 * doctor. That trust is load-bearing and, until now, unverified: a matrix entry
 * naming a probe id that exists in NO doctor registry renders identically to one
 * naming a real probe. Both read `doctor-owned`. Both count as covered. Neither
 * shows up in the actionable `unmeasured` gap.
 *
 * A canon that names an owner which does not exist is the same lie as a check
 * that never runs, and it is worse than an honest `unmeasured` — `unmeasured` at
 * least appears in the coverage gap and asks to be fixed.
 *
 * SCOPE — what this gate can and cannot prove:
 *   CAN  · the named probe id is resolvable in a real doctor registry.
 *   CANNOT · that the probe checks what the canon actually claims. CANON-036
 *            ("production must not silently lag main") was owned by a probe that
 *            verifies each project DECLARES a deploy-currency strategy — a proxy,
 *            not the claim. That gap is semantic and needs human review; this
 *            gate deliberately does not pretend to catch it, and says so rather
 *            than implying coverage it does not have.
 *
 * CI SAFETY: the matrix and the studio-ops doctor live in a sibling repo that is
 * absent on CI. Sibling absent → skip + exit 0. A gate that hard-fails on a
 * gitignored/absent sibling input is noise that gets muted, and a muted gate is
 * no gate at all.
 *
 * Usage:
 *   node scripts/check-canon-ownership-reachable.mjs
 *   node scripts/check-canon-ownership-reachable.mjs --json
 *   node scripts/check-canon-ownership-reachable.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops');
const MATRIX = path.join(SIBLING, 'portfolio', 'CANON_MATRIX.json');

/** Doctor registries a matrix probe id may legitimately resolve into. */
const DOCTOR_SOURCES = [
  path.join(ROOT, 'scripts', 'run-doctor.mjs'),
  path.join(SIBLING, 'scripts', 'run-doctor.mjs'),
];

/**
 * Probe ids declared in a doctor source.
 *
 * Matches `id: '<value>'` — the shape every entry in the CHECKS array uses.
 * Parsing source beats importing it: these modules run checks on import-adjacent
 * paths and we only need the identifier set, not the behaviour.
 */
export function extractProbeIds(source) {
  const ids = new Set();
  for (const m of String(source).matchAll(/\bid:\s*'([a-z0-9][a-z0-9-]*)'/g)) ids.add(m[1]);
  return ids;
}

/** Every canon entry whose checker claims a doctor probe owns it. */
export function probeOwnedCanons(matrix) {
  const out = [];
  for (const [canon, entry] of Object.entries(matrix?.entries ?? {})) {
    const probe = entry?.checker?.probe;
    if (typeof probe === 'string' && probe) out.push({ canon, probe, tier: entry.tier ?? 'UNSPECIFIED' });
  }
  return out;
}

/**
 * OWNERSHIP (doctor self-vs-sibling contract): `CANON_MATRIX.json` is owned by
 * studio-ops, so an unreachable owner there is SIBLING debt, not this repo's.
 * Failing this repo's build for a sibling's data defect is how a gate earns a
 * permanent `|| true` — surface it as a warning and ship the fix as Ark cargo
 * (CANON-018), never by editing the sibling's file.
 *
 * Exit contract: 0 = clean · 1 = sibling-owned finding (warn) · 2 = self-owned.
 */
export const EXIT = Object.freeze({ CLEAN: 0, SIBLING_WARN: 1, SELF_FAIL: 2 });

export function evaluate(matrix, knownProbeIds) {
  const owned = probeOwnedCanons(matrix);
  const unreachable = owned.filter(({ probe }) => !knownProbeIds.has(probe));
  // Tier drives urgency, not ownership: an ABSOLUTE canon reporting itself
  // verified by a probe that does not exist is the most consequential shape of
  // this defect, so it is named separately in the detail line.
  const absolute = unreachable.filter((u) => u.tier === 'ABSOLUTE');
  return {
    pass: unreachable.length === 0,
    owner: 'sibling:vaultspark-studio-ops',
    checked: owned.length,
    unreachable,
    absoluteCount: absolute.length,
    detail: unreachable.length === 0
      ? `${owned.length} probe-owned canon(s) resolve to a real doctor probe`
      : `${unreachable.length}/${owned.length} probe-owned canon(s) name a probe that exists in NO doctor`
        + (absolute.length ? ` · ${absolute.length} ABSOLUTE-tier` : '')
        + `: ${unreachable.map((u) => `CANON-${u.canon}→${u.probe}[${u.tier}]`).join(', ')}`,
  };
}

function selfTest() {
  const matrix = {
    entries: {
      '036': { tier: 'STRONG', checker: { probe: 'deploy-currency' } },
      '031': { tier: 'ABSOLUTE', checker: { probe: 'canon-031-lint' } },
      '099': { tier: 'STRONG', checker: { probe: 'probe-that-never-existed' } },
      '011': { tier: 'STRONG', checker: { manual: 'judgment' } },
      '077': { tier: 'STRONG' },
      '044': { tier: 'STRONG', checker: { script: 'scripts/x.mjs' } },
    },
  };
  const known = new Set(['deploy-currency', 'canon-031-lint']);

  const source = `
    const CHECKS = [
      { id: 'manifest', label: 'x' },
      { id:   'deploy-currency-live', label: 'y' },
      { notAnId: 'nope' },
    ];`;
  const ids = extractProbeIds(source);
  const result = evaluate(matrix, known);

  const cases = [
    ['only probe-checkers are collected', probeOwnedCanons(matrix).length === 3],
    ['manual checkers are not probe-owned', !probeOwnedCanons(matrix).some((o) => o.canon === '011')],
    ['absent checkers are not probe-owned', !probeOwnedCanons(matrix).some((o) => o.canon === '077')],
    ['script checkers are not probe-owned', !probeOwnedCanons(matrix).some((o) => o.canon === '044')],

    // THE LIVE CLASS this gate exists for.
    ['a phantom probe owner FAILS', result.pass === false],
    ['the failure names the canon and the phantom probe', result.detail.includes('CANON-099') && result.detail.includes('probe-that-never-existed')],
    ['real probe owners are not flagged', !result.unreachable.some((u) => u.canon === '036' || u.canon === '031')],

    // Flips the other way — a gate that only ever fails is not a gate.
    ['all-resolvable PASSES', evaluate({ entries: { '036': { checker: { probe: 'deploy-currency' } } } }, known).pass === true],
    ['a matrix with no probe owners passes vacuously', evaluate({ entries: { '011': { checker: { manual: 'x' } } } }, known).pass === true],
    ['an empty matrix does not throw', evaluate({}, known).pass === true],

    ['probe ids are extracted from doctor source', ids.has('manifest') && ids.has('deploy-currency-live')],
    ['non-id keys are not mistaken for probe ids', !ids.has('nope')],
    ['extraction tolerates irregular spacing', extractProbeIds("{ id:'a-b' }").has('a-b')],

    // Ownership + tier surfacing (the live finding was 3 ABSOLUTE-tier phantoms).
    ['the finding is attributed to the sibling owner', result.owner === 'sibling:vaultspark-studio-ops'],
    ['ABSOLUTE-tier phantoms are counted separately', evaluate({ entries: { '023': { tier: 'ABSOLUTE', checker: { probe: 'ghost' } } } }, known).absoluteCount === 1],
    ['the detail names the tier', evaluate({ entries: { '023': { tier: 'ABSOLUTE', checker: { probe: 'ghost' } } } }, known).detail.includes('[ABSOLUTE]')],
    ['a STRONG-only phantom reports zero ABSOLUTE', result.absoluteCount === 0],
    ['sibling-warn and self-fail are distinct exit codes', EXIT.SIBLING_WARN === 1 && EXIT.SELF_FAIL === 2 && EXIT.CLEAN === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-canon-ownership-reachable --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log(`check-canon-ownership-reachable --self-test: ${cases.length}/${cases.length} passed`);
}

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const json = process.argv.includes('--json');

  if (!fs.existsSync(MATRIX)) {
    const skip = { pass: true, skipped: true, detail: 'canon matrix sibling absent (skipped)' };
    console.log(json ? JSON.stringify(skip) : `canon-ownership: skipped · ${skip.detail}`);
    return;
  }

  const knownProbeIds = new Set();
  let registriesRead = 0;
  for (const source of DOCTOR_SOURCES) {
    if (!fs.existsSync(source)) continue;
    registriesRead += 1;
    for (const id of extractProbeIds(fs.readFileSync(source, 'utf8'))) knownProbeIds.add(id);
  }
  if (!registriesRead) {
    const skip = { pass: true, skipped: true, detail: 'no doctor registry readable (skipped)' };
    console.log(json ? JSON.stringify(skip) : `canon-ownership: skipped · ${skip.detail}`);
    return;
  }

  const matrix = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));
  const result = evaluate(matrix, knownProbeIds);
  if (json) { console.log(JSON.stringify(result)); return; }
  console.log(`canon-ownership: ${result.pass ? 'ok' : 'SIBLING-WARN'} · ${result.detail}`);
  if (!result.pass) {
    console.log('  → studio-ops owns CANON_MATRIX.json; ship a canon-update via Studio Ark (CANON-018), do not edit the sibling directly.');
    process.exit(EXIT.SIBLING_WARN);
  }
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
