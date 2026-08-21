#!/usr/bin/env node
/**
 * NDJSON ledger integrity gate.
 *
 * Why this exists: `portfolio/events.ndjson` carried a glued record at line 892
 * (two session-closed events on one line, committed 2026-07-02 in cf9a7a5d2 by a
 * writer that appended without guaranteeing a trailing newline). The reader
 * wrapped a whole-file parse in one try/catch returning `[]`, so that single bad
 * line made all 892 records invisible to every consumer for 13 days. Nothing
 * failed. Nothing warned. The heartbeat generator prefers the sibling studio-ops
 * ledger and silently fell back to it, so the dead local sink looked alive.
 *
 * The lesson is not "fix that line" — it is that an append-only ledger with no
 * integrity gate will rot silently, and a resilient reader (which we now have)
 * would make that rot even quieter. So the reader tolerates damage to stay
 * useful, and THIS gate is what refuses to let damage be invisible.
 *
 * Enumerates git-tracked *.ndjson (never a filesystem walk — CI checks out only
 * tracked files, and judging files CI cannot see is how local/CI divergence
 * starts).
 *
 * Usage: node scripts/check-ndjson-integrity.mjs [--self-test] [--fix]
 *   --fix: split glued records and drop padding blank lines, in place.
 */
import { execFileSync } from './lib/safe-spawn.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const SELF_TEST = args.includes('--self-test');
const FIX = args.includes('--fix');

/**
 * Classify every line of an ndjson buffer.
 * @returns {{ ok:boolean, records:number, findings:{line:number,kind:string,detail:string}[] }}
 */
export function inspectNdjson(raw) {
  const findings = [];
  let records = 0;
  const lines = raw.split('\n');
  // A trailing newline yields a final empty element — that is correct framing,
  // not a blank line, so drop it before judging.
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  else if (lines.length) findings.push({ line: lines.length, kind: 'no-trailing-newline', detail: 'file does not end with a newline — the next append will glue onto this line' });

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    if (line.trim() === '') {
      findings.push({ line: lineNo, kind: 'blank-line', detail: 'blank line inside the ledger' });
      return;
    }
    try {
      JSON.parse(line);
      records += 1;
    } catch (err) {
      // Distinguish a glued record (recoverable — N complete objects concatenated)
      // from genuine garbage (not recoverable). Only the former is auto-fixable.
      const split = splitConcatenatedJson(line);
      if (split && split.length > 1) {
        findings.push({ line: lineNo, kind: 'glued-records', detail: `${split.length} JSON records concatenated on one line` });
      } else {
        findings.push({ line: lineNo, kind: 'unparseable', detail: err.message.slice(0, 100) });
      }
    }
  });
  return { ok: findings.length === 0, records, findings };
}

/**
 * Split a line holding several concatenated top-level JSON objects.
 * Brace-depth scan, string/escape aware. Returns null unless the WHOLE line is
 * consumed by complete objects — a partial match means genuine garbage, and
 * guessing at garbage is how you turn corruption into fabrication.
 */
export function splitConcatenatedJson(line) {
  const out = [];
  let depth = 0, start = -1, inString = false, escaped = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { if (depth === 0) start = i; depth += 1; continue; }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) { out.push(line.slice(start, i + 1)); start = -1; }
      if (depth < 0) return null;
      continue;
    }
    if (depth === 0 && ch.trim() !== '') return null; // junk between objects
  }
  if (depth !== 0 || !out.length) return null;
  for (const chunk of out) { try { JSON.parse(chunk); } catch { return null; } }
  return out;
}

export function repairNdjson(raw) {
  const lines = raw.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  const out = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    try { JSON.parse(line); out.push(line); continue; } catch { /* fall through */ }
    const split = splitConcatenatedJson(line);
    if (split) out.push(...split);
    else out.push(line); // leave genuine garbage alone — a gate finding, not ours to invent
  }
  return `${out.join('\n')}\n`;
}

function trackedNdjson() {
  const out = execFileSync('git', ['ls-files', '*.ndjson'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

if (SELF_TEST) {
  const good = '{"a":1}\n{"a":2}\n';
  const glued = '{"a":1}{"a":2}\n{"a":3}\n';
  const blank = '{"a":1}\n\n{"a":2}\n';
  const noNl = '{"a":1}\n{"a":2}';
  const junk = '{"a":1}\nnot json at all\n';
  const nested = JSON.stringify({ a: { b: '}' } }) + JSON.stringify({ c: '{"x":1}' });

  const cases = [
    ['clean ledger passes', inspectNdjson(good).ok && inspectNdjson(good).records === 2],
    ['glued records detected', inspectNdjson(glued).findings.some((f) => f.kind === 'glued-records')],
    ['blank line detected', inspectNdjson(blank).findings.some((f) => f.kind === 'blank-line')],
    ['missing trailing newline detected', inspectNdjson(noNl).findings.some((f) => f.kind === 'no-trailing-newline')],
    ['genuine garbage is unparseable, NOT glued', inspectNdjson(junk).findings.some((f) => f.kind === 'unparseable')],
    ['repair splits glued records', inspectNdjson(repairNdjson(glued)).ok && inspectNdjson(repairNdjson(glued)).records === 3],
    ['repair drops blank lines', inspectNdjson(repairNdjson(blank)).ok && inspectNdjson(repairNdjson(blank)).records === 2],
    ['repair adds trailing newline', inspectNdjson(repairNdjson(noNl)).ok],
    ['repair is idempotent', repairNdjson(repairNdjson(glued)) === repairNdjson(glued)],
    ['repair never invents data from garbage', repairNdjson(junk).includes('not json at all')],
    // Braces inside strings must not fool the splitter — otherwise "repair" corrupts.
    ['splitter is string-aware (braces inside values)', (splitConcatenatedJson(nested) || []).length === 2],
    ['splitter refuses partial/garbage lines', splitConcatenatedJson('{"a":1} trailing junk') === null],
    // The real-world regression: the exact shape that zeroed the ledger.
    ['real S282 shape: two session-closed events glued', (() => {
      const a = JSON.stringify({ ts: '2026-06-22T22:54:55.000Z', type: 'session-closed', signal: 'session 216 closed' });
      const b = JSON.stringify({ ts: '2026-07-02T23:58:10.102Z', type: 'session-closed', signal: 'session 251 closed' });
      const r = repairNdjson(`${a}${b}\n`);
      const insp = inspectNdjson(r);
      return insp.ok && insp.records === 2;
    })()],
  ];

  // appendEvent must not re-glue onto a file lacking a trailing newline.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ndjson-selftest-'));
  try {
    fs.mkdirSync(path.join(tmp, 'portfolio'), { recursive: true });
    const ledger = path.join(tmp, 'portfolio', 'events.ndjson');
    fs.writeFileSync(ledger, '{"a":1}'); // no trailing newline — the hazard
    const { appendEvent, readEventsDetailed } = await import('./lib/studio-events.mjs');
    appendEvent(tmp, { type: 'probe' });
    const after = fs.readFileSync(ledger, 'utf8');
    cases.push(['appendEvent heals a missing trailing newline (no glue)', inspectNdjson(after).ok && inspectNdjson(after).records === 2]);
    // And the reader must never fabricate a zero from one bad line.
    fs.writeFileSync(ledger, '{"a":1}\nGARBAGE\n{"a":2}\n');
    const detailed = readEventsDetailed(tmp);
    cases.push(['readEvents survives a bad line (no silent zero)', detailed.events.length === 2 && detailed.malformed.length === 1]);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  let failed = 0;
  for (const [name, ok] of cases) {
    console.log(`  ${ok ? 'ok' : 'fail'} ${name}`);
    if (!ok) failed += 1;
  }
  console.log(`\ncheck-ndjson-integrity self-test: ${cases.length - failed}/${cases.length} passing`);
  process.exit(failed ? 1 : 0);
}

const files = trackedNdjson();
let bad = 0;
let repaired = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let raw;
  try { raw = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  if (!raw.length) continue;
  let result = inspectNdjson(raw);
  if (!result.ok && FIX) {
    const fixedRaw = repairNdjson(raw);
    const after = inspectNdjson(fixedRaw);
    if (after.ok) {
      fs.writeFileSync(abs, fixedRaw);
      console.log(`  ✎ repaired ${rel} — ${result.findings.length} finding(s) → ${after.records} records`);
      repaired += 1;
      result = after;
    }
  }
  if (!result.ok) {
    bad += 1;
    console.error(`  ✗ ${rel} — ${result.records} parseable record(s), ${result.findings.length} finding(s)`);
    for (const f of result.findings.slice(0, 5)) console.error(`      line ${f.line}: ${f.kind} — ${f.detail}`);
    if (result.findings.length > 5) console.error(`      … ${result.findings.length - 5} more`);
  } else if (!FIX) {
    console.log(`  ✓ ${rel} — ${result.records} record(s)`);
  }
}
if (bad) {
  console.error(`\ncheck-ndjson-integrity: ${bad} corrupt ledger(s) — run with --fix to split glued records + drop blank lines`);
  process.exit(1);
}
console.log(`check-ndjson-integrity: ${files.length} tracked ledger(s) clean${repaired ? ` · ${repaired} repaired` : ''}`);
process.exit(0);
