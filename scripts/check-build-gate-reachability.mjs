#!/usr/bin/env node
/**
 * Build verification reachability, separated by invocation mode.
 * Ordinary --check/default checkers retain source-declared dry-run/lifecycle
 * scope. Every git-tracked CLI --self-test dispatch, including scripts/lib,
 * requires an exact invocation or a reviewed source-hash-bound equivalent.
 *
 * The graph recognizes literal node commands, runner tuples, and named spawn
 * helpers. Comments, fixture strings, and imports of direct-only self-tests
 * cannot claim coverage. Unconditional side-effect imports can execute ordinary
 * checks. Dynamic call paths and arbitrary exported fixture functions are not
 * claimed as proven CLI execution; reviewed equivalences bind both source files.
 *
 * Default / --check: enforce check and CLI self-test coverage (exit 0/1).
 * --self-test: deterministic positive and negative parser fixtures.
 * --self-test-census: inspect CLI mode omissions as JSON, exit 1 if any missing.
 * --check-mode-census: inspect ordinary check-mode omissions as JSON.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from './lib/safe-spawn.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY_RUN_MARKER = '@check-mode dry-run';
const SCOPE_RE = /^\s*(?:(?:\/\*+|\/\/|\*)\s*)?@verification-scope\s+([a-z][a-z0-9-]*)/m;
// Reviewed mode equivalences require BOTH exact sources and an executed mode.
// A changed implementation invalidates its disposition; an import alone never
// proves an exported fixture function was called or that its failure propagated.
const MODE_EQUIVALENTS = {
  'lib/invocation-modes.mjs': { required: '--self-test', sourceSha256: '6f308e808479afe9ebca18966989e748c56ade07bbadb8ccc7bbdf76ad6cc263', via: 'lib/build-order.mjs', viaMode: '--self-test', viaSha256: '9021154d7027fd15f409a643ac2ad040a8ac09de469104a5dbb22415be90a77d', reason: 'build-order directly calls invocationModesSelfTest() as a failing cases-array predicate.' },
  'check-journey-conductor-contract.mjs': { required: 'check', sourceSha256: '736037e4a9412185fa4766e287f99661185eed7fa367f2f8138341ae9fe8deee', via: 'check-journey-conductor-contract.mjs', viaMode: '--self-test', viaSha256: '736037e4a9412185fa4766e287f99661185eed7fa367f2f8138341ae9fe8deee', reason: 'The self-test mode adds negative fixtures and unconditionally evaluates the real source contract.' },
};
const sourceHash = source => createHash('sha256').update(source).digest('hex');
export function equivalentMode(name, required, readSource, invocations, equivalents = MODE_EQUIVALENTS) {
  const entry = equivalents[name];
  return Boolean(entry && entry.required === required && entry.reason?.trim()
    && sourceHash(readSource(name)) === entry.sourceSha256
    && sourceHash(readSource(entry.via)) === entry.viaSha256
    && invocations.some(edge => edge.name === entry.via && edge.flags.includes(entry.viaMode)));
}
const TRACKED_FAMILIES = ['build', 'check', 'generate', 'derive', 'enrich'];

/** Gates enumerate git-tracked files, never a filesystem walk — an untracked
 *  scratch copy is not a gate and must not be reported as one. */
function trackedVerificationScripts() {
  const out = execFileSync('git', ['ls-files', ...TRACKED_FAMILIES.map((family) => `scripts/${family}-*.mjs`)], {
    cwd: ROOT, encoding: 'utf8', windowsHide: true,
  });
  return out.trim().split('\n').filter(Boolean).map((p) => basename(p));
}

const read = (name) => {
  try { return readFileSync(join(ROOT, 'scripts', name), 'utf8'); } catch { return ''; }
};

/** Actual script-to-script invocations plus ESM imports. Comments and prose do
 *  not buy reachability: an edge must look like a node command, runner tuple,
 *  run helper, or import. */
export function edgesFrom(src) {
  const next = new Set(invocationEdges(src).map(edge => edge.name));
  const tokens = sourceTokens(src);
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index].value === 'import' && !tokens[index].string && tokens[index + 1]?.string) {
      const name = scriptName(tokens[index + 1].value.replace(/^\.\//, ''));
      if (name) next.add(name);
    }
  }
  return next;
}
/** Every script reachable from `npm run build:check`, to a fixpoint. */
export function reachableFrom(seedSteps, readSource) {
  const seen = new Set();
  const queue = [];
  for (const step of seedSteps) {
    for (const m of step.matchAll(/scripts\/([a-z0-9][a-z0-9.-]*\.mjs)/g)) {
      if (!seen.has(m[1])) { seen.add(m[1]); queue.push(m[1]); }
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    for (const nxt of edgesFrom(readSource(cur))) {
      if (!seen.has(nxt)) { seen.add(nxt); queue.push(nxt); }
    }
  }
  return seen;
}

export function classify({ scripts, readSource, reachable, invocations }) {
  const rows = [];
  for (const name of scripts) {
    const src = readSource(name);
    const declarations = sourceTokens(src, true).filter(token => token.comment).map(token => token.value).join('\n');
    const scope = declarations.match(SCOPE_RE)?.[1] || null;
    if (scope && scope !== 'build') { rows.push({ name, verdict: `scoped-${scope}` }); continue; }
    const isDefaultCheck = name.startsWith('check-');
    if (!isDefaultCheck && !src.includes('--check')) continue;
    if (/^\s*(?:(?:\/\*+|\/\/|\*)\s*)?@check-mode\s+dry-run\b/m.test(declarations)) { rows.push({ name, verdict: 'declared-dry-run' }); continue; }
    const measured = invocations ? (invocations.some(edge => edge.name === name && !edge.flags.includes('--self-test') && (isDefaultCheck || edge.flags.includes('--check'))) || equivalentMode(name, 'check', readSource, invocations)) : reachable.has(name);
    rows.push({ name, verdict: measured ? 'reachable' : 'unreachable' });
  }
  return rows;
}

/** Tokenize the small static invocation grammar, keeping string literals opaque.
 * Comments and fixture strings cannot manufacture dispatches or runner edges.
 * Dynamic invocation expressions are intentionally unproven. */
export function sourceTokens(source, includeComments = false) {
  const tokens = [], text = String(source);
  let index = 0;
  while (index < text.length) {
    const char = text[index], next = text[index + 1], start = index;
    if (/\s/.test(char)) { index++; continue; }
    if (char === '/' && next === '/') { while (index < text.length && !/[\r\n]/.test(text[index])) index++; if (includeComments) tokens.push({ value: text.slice(start, index), comment: true }); continue; }
    if (char === '/' && next === '*') { const end = text.indexOf('*/', index + 2); index = end < 0 ? text.length : end + 2; if (includeComments) tokens.push({ value: text.slice(start, index), comment: true }); continue; }
    if (["'", '"', '`'].includes(char)) {
      index++;
      while (index < text.length) { if (text[index] === '\\') { index += 2; continue; } if (text[index++] === char) break; }
      tokens.push({ value: text.slice(start + 1, index - 1), string: true, start }); continue;
    }
    const previous = tokens.findLast(token => !token.comment)?.value;
    if (char === '/' && (!previous || ['=', '(', '[', ',', ':', '!', '?', ';', '{', '}', 'return', '=>', '>', '|', '&'].includes(previous))) {
      index++; let inClass = false;
      while (index < text.length) {
        if (text[index] === '\\') { index += 2; continue; }
        if (text[index] === '[') inClass = true;
        if (text[index] === ']') inClass = false;
        if (text[index++] === '/' && !inClass) break;
      }
      while (/[a-z]/i.test(text[index] || '0')) index++;
      tokens.push({ value: '<regexp>', string: false, start }); continue;
    }
    const word = text.slice(index).match(/^[A-Za-z_$][\w$]*/)?.[0];
    const value = word || char;
    tokens.push({ value, string: false, start }); index += value.length;
  }
  return tokens;
}
function literalFlags(tokens) { return tokens.filter(t => t.string && /^--[a-z][\w-]*$/.test(t.value)).map(t => t.value); }
const SCRIPT_PATH = /^(?:scripts\/)?((?:lib\/)?[a-z0-9][a-z0-9.-]*\.mjs)$/;
function scriptName(value) { return String(value).match(SCRIPT_PATH)?.[1] || null; }
export function hasSelfTestDispatch(source) {
  const tokens = sourceTokens(source);
  return tokens.some((token, index) => token.value === '--self-test' && token.string
    && tokens[index - 1]?.value === '(' && ['includes', 'has'].includes(tokens[index - 2]?.value)
    && tokens[index - 3]?.value === '.');
}
function closeAt(tokens, start) {
  const pair = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (let index = start; index < tokens.length; index++) {
    if (tokens[index].string) continue;
    const value = tokens[index].value;
    if (pair[value]) stack.push(pair[value]);
    else if (value === stack.at(-1)) { stack.pop(); if (!stack.length) return index; }
  }
  return start;
}
export function invocationEdges(source) {
  const tokens = sourceTokens(source), edges = [];
  const add = (name, flags) => { if (name) edges.push({ name, flags: [...new Set(flags)].sort() }); };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    // Declarations do not prove calls: function/class bodies and callbacks are
    // deliberately outside this bounded literal runner graph.
    if (!token.string && ['function', 'class'].includes(token.value)) {
      let body = index + 1;
      while (body < tokens.length && tokens[body].value !== '{') {
        if (tokens[body].value === '(') body = closeAt(tokens, body);
        body++;
      }
      if (body < tokens.length) index = closeAt(tokens, body);
      continue;
    }
    if (!token.string && token.value === '=' && tokens[index + 1]?.value === '>') {
      let body = index + 2;
      if (tokens[body]?.value === '{') index = closeAt(tokens, body);
      else {
        while (body < tokens.length && ![',', ';', ')', ']', '}'].includes(tokens[body].value)) {
          if (!tokens[body].string && ['(', '[', '{'].includes(tokens[body].value)) body = closeAt(tokens, body);
          body++;
        }
        index = body - 1;
      }
      continue;
    }
    // Existing proof runner's [script, [args]] table, and labeled smoke tuples.
    if (token.string && scriptName(token.value) && tokens[index + 1]?.value === ',') {
      if (tokens[index + 2]?.value === '[') {
        const end = closeAt(tokens, index + 2);
        add(scriptName(token.value), literalFlags(tokens.slice(index + 3, end)));
      } else if (tokens[index - 1]?.value === ',' && tokens[index + 2]?.string && tokens[index + 2].value.startsWith('--')) {
        add(scriptName(token.value), [tokens[index + 2].value]);
      }
    }
    if (token.string || !['run', 'runNode', 'runScript', 'step', 'spawnSync', 'execFileSync', 'execSync'].includes(token.value) || tokens[index + 1]?.value !== '(') continue;
    const end = closeAt(tokens, index + 1);
    const args = tokens.slice(index + 2, end);
    const target = args.find(t => t.string && scriptName(t.value));
    if (target) add(scriptName(target.value), literalFlags(args));
    else for (const arg of args.filter(t => t.string)) {
      for (const edge of commandInvocations(arg.value)) add(edge.name, edge.flags);
    }
  }
  return edges;
}
export function commandInvocations(command) {
  const rows = [], segments = [[]];
  let word = '', quote = null, active = false;
  const flush = () => { if (active) segments.at(-1).push(word); word = ''; active = false; };
  const text = String(command);
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; active = true; continue; }
    if (/\s/.test(char)) { flush(); continue; }
    if (char === ';' || (char === '&' && text[index + 1] === '&')) {
      flush(); segments.push([]); if (char === '&') index++; continue;
    }
    // Shell expansion/escaping/redirection is not modeled: abstain.
    if ('\\$|<>&'.includes(char) || char.charCodeAt(0) === 96) return [];
    active = true; word += char;
  }
  if (quote) return [];
  flush();
  for (const argv of segments) {
    if (argv[0] !== 'node') continue;
    let target = 1;
    while (/^--[\w-]+$/.test(argv[target] || '')) target++;
    if (!argv[target]?.startsWith('scripts/')) continue;
    const name = scriptName(argv[target]);
    if (name) rows.push({ name, flags: argv.slice(target + 1).filter(arg => /^--[a-z][\w-]*$/.test(arg)) });
  }
  return rows;
}
export function reachableModes(seedSteps, readSource) {
  const seen = new Map(), queue = seedSteps.flatMap(commandInvocations);
  while (queue.length) {
    const edge = queue.shift();
    const key = `${edge.name} ${[...edge.flags].sort().join(' ')}`;
    if (seen.has(key)) continue;
    seen.set(key, edge);
    // A self-test/check invocation cannot vouch for a runner's ordinary table.
    // Imported modules are not execution edges: import-safe self-tests need an
    // actual CLI call, not merely an import that happens to inherit argv.
    const tokens = sourceTokens(readSource(edge.name));
    for (let index = 0; index < tokens.length; index++) {
      if (tokens[index].value !== 'import' || tokens[index].string || !tokens[index + 1]?.string) continue;
      const name = scriptName(tokens[index + 1].value.replace(/^\.\//, ''));
      const childSource = name ? readSource(name) : '';
      // An unconditional side-effect import of an ordinary checker executes it.
      // Direct-only dispatches and self-test libraries do not get this credit.
      if (name && childSource && !hasSelfTestDispatch(childSource) && !/\b(?:RUN_DIRECT|isDirect|isMain)\b|import\.meta\.main/.test(childSource)) queue.push({ name, flags: edge.flags.filter(flag => flag !== '--self-test') });
    }
    if (edge.flags.includes('--self-test') || edge.flags.includes('--check')) continue;
    queue.push(...invocationEdges(readSource(edge.name)));
  }
  return [...seen.values()];
}
export function selfTestCoverage({ scripts, readSource, invocations }) {
  return scripts.filter(name => hasSelfTestDispatch(readSource(name))).map(name => ({
    name, verdict: invocations.some(edge => edge.name === name && edge.flags.includes('--self-test')) ? 'reachable' : equivalentMode(name, '--self-test', readSource, invocations) ? 'reviewed-equivalent' : 'unreachable',
  }));
}

function selfTest() {
  const cases = [];
  const src = (map) => (n) => map[n] || '';

  // Direct wiring.
  let r = reachableFrom(['node scripts/a.mjs --check'], src({ 'a.mjs': 'const C=--check' }));
  cases.push(['directly wired gate is reachable', r.has('a.mjs')]);

  // One hop through a STEPS table — the case a substring scan of
  // build:check:steps gets wrong 16 times over.
  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': "const STEPS=[['child.mjs', ['--check']]];",
    'child.mjs': 'const C = process.argv.includes("--check")',
  }));
  cases.push(['gate reached via a runner STEPS table is reachable', r.has('child.mjs')]);

  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': "const STEPS=[['default-check.mjs', []]];",
    'default-check.mjs': 'process.exit(findings.length ? 1 : 0)',
  }));
  cases.push(['default-check runner tuple is reachable without a flag', r.has('default-check.mjs')]);

  // ESM-import indirection: the child inherits argv, so it is measured.
  r = reachableFrom(['node scripts/parent.mjs --check'], src({
    'parent.mjs': "import './imported.mjs';", 'imported.mjs': '--check',
  }));
  cases.push(['gate reached by argv-inheriting import is reachable', r.has('imported.mjs')]);

  r = reachableFrom(['node scripts/runner.mjs'], src({
    'runner.mjs': '// docs mention ghost.mjs but never invoke it',
  }));
  cases.push(['documentation-only script names do NOT buy reachability', !r.has('ghost.mjs')]);

  // The defect this gate exists to catch.
  r = reachableFrom(['node scripts/a.mjs --check'], src({ 'a.mjs': '--check' }));
  cases.push(['orphan gate is NOT reachable', !r.has('orphan.mjs')]);

  const readOrphan = src({ 'orphan.mjs': 'const C = process.argv.includes("--check")' });
  let rows = classify({ scripts: ['orphan.mjs'], readSource: readOrphan, reachable: r });
  cases.push(['orphan gate classifies unreachable', rows[0].verdict === 'unreachable']);

  // Declared dry-runs are exempt by their own source, not by an allowlist here.
  rows = classify({
    scripts: ['dry.mjs'],
    readSource: src({ 'dry.mjs': `/* ${DRY_RUN_MARKER} */ --check` }),
    reachable: new Set(),
  });
  cases.push(['declared dry-run is exempt', rows[0].verdict === 'declared-dry-run']);

  rows = classify({
    scripts: ['check-release-only.mjs'],
    readSource: src({ 'check-release-only.mjs': '/* @verification-scope release */ process.exit(1)' }),
    reachable: new Set(),
  });
  cases.push(['source-declared lifecycle gate is outside build scope', rows[0].verdict === 'scoped-release']);

  rows = classify({
    scripts: ['check-default.mjs'],
    readSource: src({ 'check-default.mjs': 'process.exit(findings.length ? 1 : 0)' }),
    reachable: new Set(),
  });
  cases.push(['unreachable default check gate is caught', rows[0].verdict === 'unreachable']);

  // A build script with no --check at all is not a gate and is never reported.
  rows = classify({ scripts: ['plain.mjs'], readSource: src({ 'plain.mjs': 'writeFileSync()' }), reachable: new Set() });
  cases.push(['script without --check is not reported', rows.length === 0]);

  cases.push(['a fixture string is not a self-test dispatch', !hasSelfTestDispatch('const fixture = "if (args.has(\'--self-test\')) run()";')]);
  cases.push(['actual library dispatch is detected', hasSelfTestDispatch("if (isMain && process.argv.includes('--self-test')) selfTest();")]);
  const modeSources = src({
    'runner.mjs': "// node scripts/comment.mjs --self-test\n/* ['comment2.mjs', ['--self-test']] */\nimport './lib/import-only.mjs';\nconst STEPS = [['child.mjs', ['--self-test']], ['wrong.mjs', ['--check']]];",
    'child.mjs': "if (process.argv.includes('--self-test')) selfTest();",
    'wrong.mjs': "if (process.argv.includes('--self-test')) selfTest();",
    'lib/import-only.mjs': "if (isMain && process.argv.includes('--self-test')) selfTest();",
  });
  const modes = reachableModes(['node scripts/runner.mjs'], modeSources);
  cases.push(['commented commands and tuples are not executions', !modes.some(edge => edge.name.startsWith('comment'))]);
  cases.push(['nested invocation preserves self-test mode', modes.some(edge => edge.name === 'child.mjs' && edge.flags.includes('--self-test'))]);
  cases.push(['import without invocation does not execute a library self-test', !modes.some(edge => edge.name === 'lib/import-only.mjs')]);
  cases.push(['check invocation does not satisfy self-test', selfTestCoverage({ scripts: ['wrong.mjs'], readSource: modeSources, invocations: modes })[0].verdict === 'unreachable']);
  cases.push(['wrapper self-test does not execute normal runner table', reachableModes(['node scripts/runner.mjs --self-test'], modeSources).length === 1]);
  cases.push(['library path remains distinct from same basename', commandInvocations('node scripts/lib/cache.mjs --self-test')[0].name === 'lib/cache.mjs']);
  cases.push(['nested spawn preserves flags', invocationEdges("spawnSync(process.execPath, [resolve(root, 'scripts/lib/cache.mjs'), '--self-test'], {});")[0]?.flags.includes('--self-test')]);
  const equivalenceSource = src({ 'lib/test.mjs': "if (process.argv.includes('--self-test')) selfTest();", 'harness.mjs': 'testFixtures();' });
  const equivalents = { 'lib/test.mjs': { required: '--self-test', sourceSha256: sourceHash(equivalenceSource('lib/test.mjs')), via: 'harness.mjs', viaMode: '--self-test', viaSha256: sourceHash(equivalenceSource('harness.mjs')), reason: 'Reviewed failing fixture call in the harness.' } };
  cases.push(['reviewed equivalent requires executed harness mode', !equivalentMode('lib/test.mjs', '--self-test', equivalenceSource, [], equivalents)]);
  cases.push(['source-identical reviewed in-process invocation counts', equivalentMode('lib/test.mjs', '--self-test', equivalenceSource, [{ name: 'harness.mjs', flags: ['--self-test'] }], equivalents)]);
  cases.push(['changed harness invalidates reviewed equivalence', !equivalentMode('lib/test.mjs', '--self-test', name => equivalenceSource(name) + '// changed', [{ name: 'harness.mjs', flags: ['--self-test'] }], equivalents)]);
  cases.push(['fixture metadata cannot exempt its owner', classify({ scripts: ['check-example.mjs'], readSource: () => 'const fixture = "/* @verification-scope release */";', invocations: [] })[0].verdict === 'unreachable']);
  cases.push(['self-test invocation cannot vouch for ordinary check mode', classify({ scripts: ['build-example.mjs'], readSource: () => "if (process.argv.includes('--check')) check();", invocations: [{ name: 'build-example.mjs', flags: ['--self-test'] }] })[0].verdict === 'unreachable']);
  cases.push(['comment command cannot vouch for legacy check graph', !edgesFrom('// node scripts/ghost.mjs --check').has('ghost.mjs')]);
  const uncalled = src({
    'runner.mjs': "function selfTest(){const CASES=[['ghost.mjs',['--self-test']]];} console.log('normal');",
    'ghost.mjs': "if(process.argv.includes('--self-test')) throw new Error('must run');",
  });
  cases.push(['uncalled fixture function cannot claim self-test coverage', selfTestCoverage({ scripts: ['ghost.mjs'], readSource: uncalled, invocations: reachableModes(['node scripts/runner.mjs'], uncalled) })[0].verdict === 'unreachable']);
  cases.push(['uncalled function spawn is unproven', invocationEdges("function unused(){spawnSync('node',['scripts/ghost.mjs','--self-test']);}").length === 0]);
  cases.push(['arrow block spawn is unproven', invocationEdges("const unused=()=>{run('ghost.mjs',['--self-test']);};").length === 0]);
  cases.push(['arrow expression spawn is unproven but following top-level call survives', ((edges) => edges.length > 0 && edges.every(edge => edge.name === 'real.mjs' && edge.flags.includes('--check')))(invocationEdges("const unused=()=>run('ghost.mjs',['--self-test']); run('real.mjs',['--check']);"))]);
  cases.push(['flag substring in option value does not claim a mode', commandInvocations('node scripts/ghost.mjs --label=--self-test')[0].flags.length === 0]);
  cases.push(['quoted prose is one argv word, not a mode', commandInvocations('node scripts/ghost.mjs "label --self-test"')[0].flags.length === 0]);
  cases.push(['quoted exact mode and script are recognized', commandInvocations('node "scripts/ghost.mjs" "--self-test"')[0].flags.includes('--self-test')]);
  cases.push(['quoted separator cannot inject another command', commandInvocations('node scripts/real.mjs "label; node scripts/ghost.mjs --self-test"').length === 1]);
  cases.push(['unterminated quote is unproven', commandInvocations('node scripts/ghost.mjs "--self-test').length === 0]);
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-build-gate-reachability --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const steps = [
  pkg.scripts?.['build:check'] || '',
  ...(pkg.scripts?.['build:check:steps'] || '').split('&&').map((s) => s.trim()),
];
if (process.argv.includes('--self-test-census')) {
  const corpus = execFileSync('git', ['ls-files', 'scripts/*.mjs', 'scripts/lib/*.mjs'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim().split('\n').filter(Boolean).map(name => name.replace(/^scripts\//, ''));
  const commands = steps;
  const coverage = selfTestCoverage({ scripts: corpus, readSource: read, invocations: reachableModes(commands, read) });
  console.log(JSON.stringify({ total: coverage.length, unreachable: coverage.filter(row => row.verdict === 'unreachable') }, null, 2));
  process.exit(coverage.some(row => row.verdict === 'unreachable') ? 1 : 0);
}
if (process.argv.includes('--check-mode-census')) {
  const checkRows = classify({ scripts: trackedVerificationScripts(), readSource: read, invocations: reachableModes(steps, read) });
  console.log(JSON.stringify(checkRows.filter(row => row.verdict === 'unreachable'), null, 2));
  process.exit(0);
}
const invocations = reachableModes(steps, read);
const rows = classify({ scripts: trackedVerificationScripts(), readSource: read, invocations });
const corpus = execFileSync('git', ['ls-files', 'scripts/*.mjs', 'scripts/lib/*.mjs'], { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim().split('\n').filter(Boolean).map(name => name.replace(/^scripts\//, ''));
const tests = selfTestCoverage({ scripts: corpus, readSource: read, invocations });
const orphans = [...rows.filter(row => row.verdict === 'unreachable').map(row => ({ ...row, mode: 'check' })), ...tests.filter(row => row.verdict === 'unreachable').map(row => ({ ...row, mode: '--self-test' }))];
const dry = rows.filter((r) => r.verdict === 'declared-dry-run');
const scoped = rows.filter((r) => r.verdict.startsWith('scoped-'));

if (orphans.length) {
  console.error('✗ check-build-gate-reachability: verification gate(s) no build:check path invokes —');
  console.error('  a gate nothing asks reads exactly like a gate that passed.');
  for (const o of orphans) console.error(`    · scripts/${o.name} [${o.mode}]`);
  console.error('  fix: wire it into package.json build:check:steps (or a runner already in it),');
  console.error(`  or, if it is a report-only dry-run, declare "${DRY_RUN_MARKER}" in its source.`);
  process.exit(1);
}
console.log(`✓ check-build-gate-reachability: ${rows.length - dry.length - scoped.length}/${rows.length - dry.length - scoped.length} build-scope check modes reachable · ${dry.length} declared dry-run(s) · ${scoped.length} lifecycle-scoped`);

console.log("self-test modes: " + tests.filter(row => row.verdict === 'reachable').length + '/' + tests.length + ' CLI-reachable · ' + tests.filter(row => row.verdict === 'reviewed-equivalent').length + ' source-bound in-process equivalent(s) · 0 silently exempted');
