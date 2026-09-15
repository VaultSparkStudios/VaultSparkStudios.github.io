#!/usr/bin/env node
/**
 * generate-news-art-codex.mjs — LOCAL Desk art worker (founder's Windows machine only).
 *
 * WHY. The scheduled publisher has no image model, so stories ship with the
 * procedural fallback from scripts/generate-news-art.mjs. Real illustrations
 * must cost nothing extra: this worker drives the Codex CLI (`codex exec`,
 * feature `image_generation`) authenticated with the founder's ChatGPT plan. It
 * REFUSES to run under API-key auth, and strips OPENAI_API_KEY / CODEX_API_KEY
 * from the child environment, so a run can never bill an API account.
 *
 * WHAT IT DOES. Finds committed stories whose art is fallback (structurally: a
 * `procedural-fallback` receipt that still binds the file, or raster entropy
 * below FALLBACK_ENTROPY_CEILING — never a file-size guess, never the reviewer
 * string alone), generates one illustration per story into a staging directory
 * (default .cache/desk-art-staging/<date>--<slug>/art.png), and appends a result
 * row to <staging>/results.ndjson. It never touches data/news-desk/**,
 * assets/og/news/** or pages: acceptance is a separate, reviewed step —
 * scripts/ingest-news-art.mjs.
 *
 * CONFINEMENT. The prompt carries model-written, externally-sourced story text
 * (scene + satire derived from third-party headlines) and Codex can run
 * commands, so preflight() PROVES the sandbox confines a write before any story
 * text is sent and refuses to run otherwise (fail closed). Codex runs in a
 * scratch directory outside the repo (os.tmpdir()) so it never ingests this
 * repo's AGENTS.md, the run is workspace-write, and the sandboxed shell is
 * denied network access unless --allow-network is passed. See
 * docs/DESK_ART_WORKER.md for what was verified on win32 and what was not.
 * Resumable: a valid staged art.png is skipped unless --force.
 *
 * Usage:
 *   node scripts/generate-news-art-codex.mjs --dry-run                 # list fallback targets
 *   node scripts/generate-news-art-codex.mjs --since 2026-09-01        # fallback stories on/after a date
 *   node scripts/generate-news-art-codex.mjs --story 2026-09-12/<slug> # explicit (repeatable / comma list)
 *   node scripts/generate-news-art-codex.mjs --limit 3 --force
 *   node scripts/generate-news-art-codex.mjs --self-test               # mocked spawn, temp fixtures
 * Options: --staging <dir> · --timeout-min <n> (default 9) · --retries <n> (default 1)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { EDITORIAL_OVERLAY_ZONES } from './lib/news-memes.mjs';
import {
  FALLBACK_KIND,
  REAL_ART_ENTROPY_FLOOR,
  PANEL_WIDTH,
  PANEL_HEIGHT,
  classifyArtKind,
  measureArt,
  renderFallbackArtSvg,
  renderSyntheticRasterFixture,
} from './generate-news-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_STAGING_DIR = path.join(ROOT, '.cache', 'desk-art-staging');
export const DEFAULT_WORK_ROOT = path.join(os.tmpdir(), 'vaultspark-desk-art');
export const DEFAULT_TIMEOUT_MS = 9 * 60 * 1000;
export const DEFAULT_RETRIES = 1;
export const CODEX_EXEC_BASE_ARGS = Object.freeze([
  'exec',
  '--strict-config',   // an unknown -c key must fail loudly, never silently un-sandbox a run
  '--skip-git-repo-check',
  '--ephemeral',       // a throwaway illustration run leaves no session files behind
  '--color', 'never',
  '--sandbox', 'workspace-write', // must write art.png; nothing outside its scratch cwd
]);
export const GENERATOR_LABEL = 'codex exec image_generation (ChatGPT plan)';
export const SANDBOX_PROBE_MARKER = 'DESK-ART-SANDBOX-PROBE';
const BILLING_ENV_KEYS = ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL'];

/**
 * The exact argv for one generation run.
 *
 * VERIFIED against the installed codex-cli 0.153.4 on win32 — every flag below
 * was read from `codex exec --help`, and every `-c` key was accepted under
 * `--strict-config` (which rejects unknown fields, so a typo cannot pass):
 *   --sandbox <read-only|workspace-write|danger-full-access>  ... documented values
 *   -c sandbox_workspace_write.network_access=false ... recognized field; takes the
 *      sandboxed shell off the network. `codex exec` has no network flag of its own.
 *   -c windows.sandbox="unelevated"|"elevated" ... the only two accepted variants.
 * Nothing is asserted here that the CLI did not accept.
 */
export function codexExecArgs({ sandboxMode = null, network = false } = {}) {
  const args = [...CODEX_EXEC_BASE_ARGS];
  if (!network) args.push('-c', 'sandbox_workspace_write.network_access=false');
  if (sandboxMode) args.push('-c', `windows.sandbox="${sandboxMode}"`);
  args.push('-');
  return args;
}

/**
 * The model_provider name from config.toml, or null.
 * `codex login status` only describes the stored credential; a custom provider
 * can still aim the run at a different, billable endpoint. That file can hold
 * tokens, so ONLY the provider name is extracted and nothing else is returned.
 */
export function codexConfigProvider(text) {
  const match = /^[ \t]*model_provider[ \t]*=[ \t]*["']([^"'\r\n]+)["']/m.exec(String(text || ''));
  return match ? match[1].trim() : null;
}

export function defaultCodexConfigText() {
  try {
    const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const file = path.join(home, 'config.toml');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  } catch { return ''; }
}

/**
 * A write probe run under `codex sandbox`. Confinement is measured, not assumed:
 * the probe tries to write inside its own cwd and reports what happened.
 */
export function sandboxProbeCommand({ mode = null, cwd } = {}) {
  const script = `const fs=require('fs'),p=require('path');let r;try{fs.writeFileSync(p.join(process.cwd(),'sandbox-probe.txt'),'x');r='WROTE'}catch(e){r='DENIED:'+(e.code||'error')}console.log('${SANDBOX_PROBE_MARKER}='+r)`;
  const args = ['sandbox'];
  if (mode) args.push('-c', `windows.sandbox="${mode}"`);
  args.push('node', '-e', script);
  return { cmd: 'codex', args, cwd };
}

/** enforced = the sandbox refused the write · not-enforced = it allowed it · unavailable = it never started. */
export function classifySandboxProbe(result) {
  const text = `${result?.stdout || ''}\n${result?.stderr || ''}`;
  if (text.includes(`${SANDBOX_PROBE_MARKER}=DENIED`)) return 'enforced';
  if (text.includes(`${SANDBOX_PROBE_MARKER}=WROTE`)) return 'not-enforced';
  return 'unavailable';
}

export const storyId = (date, slug) => `${date}--${slug}`;
export function parseStoryId(value) {
  const match = /^(\d{4}-\d{2}-\d{2})(?:\/|--)([a-z0-9][a-z0-9-]*)$/.exec(String(value || '').trim());
  if (!match) throw new Error(`"${value}" is not a <date>/<slug> story id`);
  return { date: match[1], slug: match[2], id: storyId(match[1], match[2]) };
}

export function parseArgs(argv) {
  const opts = { stories: [], since: null, dryRun: false, selfTest: false, force: false, limit: null, staging: DEFAULT_STAGING_DIR, timeoutMs: DEFAULT_TIMEOUT_MS, retries: DEFAULT_RETRIES, network: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value == null || value.startsWith('--')) throw new Error(`${flag} requires a value`);
      i += 1;
      return value;
    };
    if (flag === '--story') opts.stories.push(...next().split(',').map((s) => s.trim()).filter(Boolean));
    else if (flag === '--since') opts.since = next();
    else if (flag === '--dry-run') opts.dryRun = true;
    else if (flag === '--self-test') opts.selfTest = true;
    else if (flag === '--force') opts.force = true;
    // Escape hatch only: the sandboxed shell is off the network by default.
    else if (flag === '--allow-network') opts.network = true;
    else if (flag === '--limit') opts.limit = Number(next());
    else if (flag === '--staging') opts.staging = path.resolve(next());
    else if (flag === '--timeout-min') opts.timeoutMs = Number(next()) * 60 * 1000;
    else if (flag === '--retries') opts.retries = Number(next());
    else throw new Error(`unknown argument ${flag}`);
  }
  if (opts.since && !/^\d{4}-\d{2}-\d{2}$/.test(opts.since)) throw new Error('--since must be YYYY-MM-DD');
  if (opts.limit != null && !(Number.isInteger(opts.limit) && opts.limit > 0)) throw new Error('--limit must be a positive integer');
  if (!(opts.timeoutMs > 0)) throw new Error('--timeout-min must be positive');
  if (!(Number.isInteger(opts.retries) && opts.retries >= 0)) throw new Error('--retries must be a non-negative integer');
  return opts;
}

function loadPublicDays(daysDir) {
  if (!fs.existsSync(daysDir)) return [];
  return fs.readdirSync(daysDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(daysDir, f), 'utf8')))
    .filter((day) => day && day.simulated === false)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Stories to illustrate. Default: every fallback story. --since narrows by date.
 * --story names stories explicitly (targeted even when their art is real, so an
 * operator can deliberately re-roll a painting); unknown ids throw.
 */
export async function findTargets({ root = ROOT, stories = [], since = null, measure = measureArt } = {}) {
  const days = loadPublicDays(path.join(root, 'data', 'news-desk', 'days'));
  const explicit = new Map(stories.map((value) => { const parsed = parseStoryId(value); return [parsed.id, parsed]; }));
  const seen = new Set();
  const targets = [];
  for (const day of days) {
    for (const story of day.stories || []) {
      const id = storyId(day.date, story.slug);
      const named = explicit.has(id);
      if (named) seen.add(id);
      if (explicit.size && !named) continue;
      if (since && day.date < since) continue;
      const artPath = path.resolve(root, String(story.visual?.artSource || `data/news-desk/art/${id}.png`));
      let kind = 'missing';
      let entropy = null;
      if (fs.existsSync(artPath)) {
        const m = await measure(artPath);
        entropy = m.entropy;
        kind = classifyArtKind({ pixelInspection: story.visual?.pixelInspection, entropy: m.entropy, sha256: m.sha256 });
      }
      if (!named && kind !== FALLBACK_KIND && kind !== 'missing') continue;
      targets.push({ id, date: day.date, slug: story.slug, story, artPath, kind, entropy, reason: named ? 'explicit' : kind });
    }
  }
  const unknown = [...explicit.keys()].filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`unknown stories: ${unknown.join(', ')}`);
  return targets;
}

const clean = (value, max = 900) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);

/** The founder-proven prompt, with safe zones derived from the real overlay geometry. */
export function buildPrompt(story) {
  const zones = EDITORIAL_OVERLAY_ZONES;
  const topPct = Math.round((zones.topBar.height / zones.height) * 100);
  const captionPct = Math.round(((zones.height - zones.captionBox.y) / zones.height) * 100);
  const satire = story.visual?.satire || {};
  return [
    'Generate ONE original editorial illustration and save it as a PNG file named art.png in the current working directory.',
    'Requirements: landscape 16:9 (at least 1536x864), richly detailed ink-and-paint graphic-novel style, like a satirical newspaper editorial illustration; dark moody palette with warm gold accents.',
    `Keep the top ${topPct}% of the frame free of key subjects (a label bar sits there). Keep the bottom ${captionPct}% calmer, darker and less busy (a caption panel sits there). Place the main subject in the band between them, roughly centered.`,
    'ABSOLUTELY NO text, letters, numbers, logos, brand marks, watermarks, captions or UI in the image. If the scene mentions labels, signs, names or markings, depict them as unlabeled shapes, colors and objects instead.',
    'Do not depict real, identifiable people or their likeness; satirize institutions and systems, never individuals.',
    `Story headline (for context only, do not render text): ${clean(story.headline, 300)}`,
    `Scene: ${clean(story.visual?.scene)}`,
    `Satirical idea: ${clean(satire.target, 400)} / ${clean(satire.setup, 400)} / ${clean(satire.payoff, 400)}`,
    'After saving, reply with only the filename.',
    '',
  ].join('\n');
}

/** Child env with billing credentials removed (ChatGPT-plan auth only). */
export function codexChildEnv(baseEnv = process.env) {
  const env = { ...baseEnv };
  for (const key of BILLING_ENV_KEYS) delete env[key];
  return env;
}

export function codexSpawnOptions({ cwd, input, timeoutMs, env = process.env, platform = process.platform }) {
  return {
    cwd,
    input,
    timeout: timeoutMs,
    encoding: 'utf8',
    windowsHide: true,
    // codex is an npm .cmd shim on Windows; Node refuses to spawn .cmd without a
    // shell. The argument vector is fixed (no user input); the prompt goes on stdin.
    shell: platform === 'win32',
    env: codexChildEnv(env),
    maxBuffer: 64 * 1024 * 1024,
  };
}

function defaultRun(cmd, args, { cwd = os.tmpdir(), input = undefined, timeoutMs = 60_000 } = {}) {
  const result = spawnSync(cmd, args, codexSpawnOptions({ cwd, input, timeoutMs }));
  const timedOut = result.error?.code === 'ETIMEDOUT';
  if (timedOut && process.platform === 'win32' && result.pid) {
    // Best effort: the shell is killed on timeout but the codex grandchild may
    // survive. A late write lands in an abandoned attempt dir and is ignored.
    spawnSync('taskkill', ['/PID', String(result.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  }
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '', timedOut, error: result.error ? result.error.message : null };
}

/**
 * Refuse unless codex exists, is logged in with ChatGPT (not an API key), has no
 * custom model_provider, image_generation is enabled, AND the sandbox actually
 * confines a write probe.
 *
 * The sandbox check is not decoration. buildPrompt() feeds this agent
 * model-written, externally-sourced story text (scene + satire, derived from
 * third-party headlines) and the agent can run commands, so an unconfined run
 * would hand prompt-injected instructions a shell. Confinement is therefore
 * PROVEN before any story text is sent, and a failure to prove it fails closed.
 */
export function preflight(run = defaultRun, {
  platform = process.platform,
  readConfig = defaultCodexConfigText,
  modes = null,
  probeDir = null,
} = {}) {
  const reasons = [];
  const version = run('codex', ['--version'], { timeoutMs: 60_000 });
  if (version.status !== 0) {
    return { ok: false, reasons: [`codex CLI not runnable (${version.error || `exit ${version.status}`})`], sandboxMode: null, sandboxState: 'unknown' };
  }
  const login = run('codex', ['login', 'status'], { timeoutMs: 60_000 });
  const loginText = `${login.stdout}\n${login.stderr}`;
  if (/api[\s_-]*key/i.test(loginText)) reasons.push('codex is authenticated with an API key — refusing (art must use the ChatGPT plan at zero marginal cost); run `codex logout` then `codex login`');
  else if (login.status !== 0 || !/chatgpt/i.test(loginText)) reasons.push('codex is not logged in using ChatGPT (`codex login status` must say "Logged in using ChatGPT")');
  const features = run('codex', ['features', 'list'], { timeoutMs: 60_000 });
  if (!/^image_generation\b.*\btrue\s*$/m.test(`${features.stdout}`)) reasons.push('codex feature image_generation is not enabled (`codex features list`)');

  const provider = codexConfigProvider(readConfig());
  if (provider && provider.toLowerCase() !== 'openai') {
    reasons.push(`config.toml sets model_provider = "${provider}" — refusing: Desk art runs on the ChatGPT plan through OpenAI, and a custom provider can bill an account`);
  }

  let sandboxMode = null;
  let sandboxState = 'unavailable';
  let createdDir = null;
  try {
    const dir = probeDir || (createdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-art-sandbox-probe-')));
    // The configured default first, then the explicit Windows backends: on this
    // machine the configured "elevated" backend fails to start while
    // "unelevated" enforces, so the mode that actually confines is discovered
    // rather than assumed, and is then passed to every generation run.
    for (const mode of modes || (platform === 'win32' ? [null, 'unelevated', 'elevated'] : [null])) {
      const probe = sandboxProbeCommand({ mode, cwd: dir });
      const verdict = classifySandboxProbe(run(probe.cmd, probe.args, { cwd: probe.cwd, timeoutMs: 120_000 }));
      if (verdict === 'enforced') { sandboxMode = mode; sandboxState = 'enforced'; break; }
      if (verdict === 'not-enforced') sandboxState = 'not-enforced';
    }
  } finally {
    if (createdDir) { try { fs.rmSync(createdDir, { recursive: true, force: true }); } catch { /* temp dir */ } }
  }
  if (sandboxState !== 'enforced') {
    reasons.push(sandboxState === 'not-enforced'
      ? 'the Codex sandbox allowed a write it should have blocked — refusing to feed externally-sourced story text to an agent that can run commands unconfined'
      : 'the Codex sandbox could not start (`codex sandbox` failed) — refusing to run unconfined; run `codex doctor` and repair the sandbox helpers');
  }
  return { ok: reasons.length === 0, version: version.stdout.trim(), reasons, sandboxMode, sandboxState, provider: provider || null };
}

async function validateGenerated(file) {
  const m = await measureArt(file);
  const errors = [];
  if (m.format !== 'png') errors.push(`not a PNG (decoded as ${m.format})`);
  if (!(m.width >= PANEL_WIDTH && m.height >= PANEL_HEIGHT)) errors.push(`too small (${m.width}x${m.height}; need ≥${PANEL_WIDTH}x${PANEL_HEIGHT})`);
  if (!(m.entropy >= REAL_ART_ENTROPY_FLOOR)) errors.push(`entropy ${m.entropy} below real-art floor ${REAL_ART_ENTROPY_FLOOR}`);
  return { m, errors };
}

function findProducedPng(dir) {
  const preferred = path.join(dir, 'art.png');
  if (fs.existsSync(preferred)) return preferred;
  const pngs = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /\.png$/i.test(f)).map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    : [];
  return pngs[0] || null;
}

/** Generate (or resume) one story's staged illustration. */
export async function generateOne(target, {
  stagingDir = DEFAULT_STAGING_DIR,
  workRoot = DEFAULT_WORK_ROOT,
  run = defaultRun,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
  force = false,
  codexVersion = null,
  execArgs = codexExecArgs(),
  now = () => new Date(),
} = {}) {
  const itemDir = path.join(stagingDir, target.id);
  const staged = path.join(itemDir, 'art.png');
  fs.mkdirSync(itemDir, { recursive: true });
  if (fs.existsSync(staged) && !force) {
    const { m, errors } = await validateGenerated(staged);
    if (!errors.length) return { id: target.id, status: 'skipped-staged', sha256: m.sha256, width: m.width, height: m.height, entropy: m.entropy };
    fs.renameSync(staged, path.join(itemDir, `art.invalid-${now().getTime()}.png`));
  }
  const prompt = buildPrompt(target.story);
  fs.writeFileSync(path.join(itemDir, 'prompt.txt'), prompt);
  const errors = [];
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const workDir = path.join(workRoot, target.id, `attempt-${attempt}-${now().getTime()}`);
    fs.mkdirSync(workDir, { recursive: true });
    const started = Date.now();
    const result = run('codex', [...execArgs], { cwd: workDir, input: prompt, timeoutMs });
    const log = `exit=${result.status} timedOut=${Boolean(result.timedOut)} error=${result.error || ''}\n--- stdout ---\n${String(result.stdout).slice(-20000)}\n--- stderr ---\n${String(result.stderr).slice(-20000)}\n`;
    fs.writeFileSync(path.join(itemDir, `codex-attempt-${attempt}.log`), log);
    let failure = null;
    const produced = findProducedPng(workDir);
    if (result.timedOut) failure = `timeout after ${Math.round(timeoutMs / 1000)}s`;
    else if (!produced) failure = `no PNG produced (exit ${result.status})`;
    else {
      const check = await validateGenerated(produced);
      if (check.errors.length) failure = check.errors.join('; ');
      else {
        fs.copyFileSync(produced, staged);
        const meta = {
          id: target.id, sha256: check.m.sha256, width: check.m.width, height: check.m.height, entropy: check.m.entropy, bytes: check.m.bytes,
          attempt, seconds: Math.round((Date.now() - started) / 1000), generatedAt: now().toISOString(), generator: GENERATOR_LABEL, codexVersion,
          promptSha256: crypto.createHash('sha256').update(prompt).digest('hex'),
        };
        fs.writeFileSync(path.join(itemDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
        return { status: 'generated', ...meta };
      }
    }
    errors.push(`attempt ${attempt}: ${failure}`);
  }
  return { id: target.id, status: 'failed', errors };
}

/** Root .gitignore does not list the staging dir; make it self-ignoring. */
export function ensureSelfIgnoringDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const marker = path.join(dir, '.gitignore');
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '# Local Desk art staging (scripts/generate-news-art-codex.mjs) — never committed.\n*\n');
}

async function main(opts) {
  const targets = (await findTargets({ stories: opts.stories, since: opts.since })).slice(0, opts.limit || undefined);
  if (opts.dryRun) {
    console.log(`generate-news-art-codex --dry-run: ${targets.length} target(s)`);
    for (const target of targets) {
      const staged = fs.existsSync(path.join(opts.staging, target.id, 'art.png')) ? ' [staged]' : '';
      console.log(`  ${target.id}  kind=${target.kind} entropy=${target.entropy ?? 'n/a'} reason=${target.reason}${staged}`);
    }
    return 0;
  }
  if (!targets.length) {
    console.log('generate-news-art-codex: no fallback art to replace.');
    return 0;
  }
  const check = preflight();
  if (!check.ok) {
    for (const reason of check.reasons) console.error(`✗ preflight: ${reason}`);
    return 2;
  }
  ensureSelfIgnoringDir(opts.staging);
  const resultsFile = path.join(opts.staging, 'results.ndjson');
  const execArgs = codexExecArgs({ sandboxMode: check.sandboxMode, network: opts.network });
  console.log(`generate-news-art-codex: ${targets.length} target(s) · ${check.version} · staging ${path.relative(ROOT, opts.staging) || opts.staging}`);
  console.log(`  sandbox: ${check.sandboxState}${check.sandboxMode ? ` (windows.sandbox="${check.sandboxMode}")` : ' (configured default)'} · shell network: ${opts.network ? 'ALLOWED (--allow-network)' : 'denied'}`);
  const ok = [];
  let failed = 0;
  for (const [index, target] of targets.entries()) {
    console.log(`[${index + 1}/${targets.length}] ${target.id} …`);
    const row = await generateOne(target, { stagingDir: opts.staging, timeoutMs: opts.timeoutMs, retries: opts.retries, force: opts.force, codexVersion: check.version, execArgs });
    fs.appendFileSync(resultsFile, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
    if (row.status === 'failed') {
      failed += 1;
      console.error(`  ✗ ${row.errors.join(' | ')}`);
    } else {
      ok.push(target.id);
      console.log(`  ✓ ${row.status} ${row.width}x${row.height} entropy=${row.entropy}`);
    }
  }
  console.log(`\n${ok.length} staged · ${failed} failed · results: ${path.relative(ROOT, resultsFile)}`);
  if (ok.length) {
    console.log('Next: LOOK at every staged art.png (no text/logos/likenesses, fits the story), list the ones you accept, then:');
    console.log(`  node scripts/ingest-news-art.mjs --from ${path.relative(ROOT, opts.staging) || opts.staging} --reviewed ${ok.join(',')}`);
  }
  return failed ? 1 : 0;
}

/* ── Self-test: mocked spawn, temp fixtures, never real repo data ─────────── */

async function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push({ name, ok: Boolean(ok) });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-art-codex-selftest-'));
  try {
    const root = path.join(tmp, 'repo');
    const daysDir = path.join(root, 'data', 'news-desk', 'days');
    const artDir = path.join(root, 'data', 'news-desk', 'art');
    fs.mkdirSync(daysDir, { recursive: true });
    fs.mkdirSync(artDir, { recursive: true });
    const mkStory = (slug, reviewer, extra = {}) => ({
      slug,
      headline: `Headline for ${slug}`,
      visual: {
        artSource: `data/news-desk/art/2026-09-12--${slug}.png`,
        scene: 'A towering filing cabinet swallows a queue of tiny paper boats while a lighthouse points its beam at an empty harbor.',
        satire: { target: 'Institutions that audit the harbor instead of the boats', setup: 'Every boat must file a manifest before it may float', payoff: 'The cabinet grows; the harbor stays empty', institutional: true },
        pixelInspection: { sha256: '', reviewed: true, reviewer, semanticVerified: false, ...extra },
      },
    });
    const day = {
      date: '2026-09-12',
      simulated: false,
      stories: [
        mkStory('fallback-story', 'scripts/generate-news-art.mjs direct pixel-integrity review'),
        mkStory('real-story', 'codex image-capable editorial review'),
        mkStory('legacy-label-real-story', 'scripts/generate-news-art.mjs direct pixel-integrity review'),
      ],
    };
    fs.writeFileSync(path.join(daysDir, '2026-09-12.json'), JSON.stringify(day, null, 2));
    fs.writeFileSync(path.join(daysDir, '2026-08-01.json'), JSON.stringify({ date: '2026-08-01', simulated: true, stories: [mkStory('simulated', 'x')] }, null, 2));
    const fallbackPng = await (await import('sharp')).default(Buffer.from(renderFallbackArtSvg(day.stories[0], day.date))).png().toBuffer();
    fs.writeFileSync(path.join(artDir, '2026-09-12--fallback-story.png'), fallbackPng);
    fs.writeFileSync(path.join(artDir, '2026-09-12--real-story.png'), await renderSyntheticRasterFixture('real'));
    fs.writeFileSync(path.join(artDir, '2026-09-12--legacy-label-real-story.png'), await renderSyntheticRasterFixture('legacy'));

    const targets = await findTargets({ root });
    t('default targets = fallback stories only (structural, not reviewer string)', targets.map((x) => x.slug).join(',') === 'fallback-story');
    t('simulated days are never targeted', !targets.some((x) => x.slug === 'simulated'));
    t('--since after the story date yields no targets', (await findTargets({ root, since: '2026-09-13' })).length === 0);
    const explicit = await findTargets({ root, stories: ['2026-09-12/real-story'] });
    t('--story targets an explicit story even with real art', explicit.length === 1 && explicit[0].reason === 'explicit');
    let threw = false;
    try { await findTargets({ root, stories: ['2026-09-12/nope'] }); } catch { threw = true; }
    t('--story with an unknown id throws', threw);

    const prompt = buildPrompt(day.stories[0]);
    t('prompt forbids text/logos/watermarks', /ABSOLUTELY NO text, letters, numbers, logos/.test(prompt));
    t('prompt forbids real-person likeness', /Do not depict real, identifiable people/.test(prompt));
    t('prompt carries headline, scene and satire', prompt.includes('Headline for fallback-story') && prompt.includes('filing cabinet') && prompt.includes('audit the harbor'));
    t('prompt safe zones derive from overlay geometry (18% top / 46% bottom)', prompt.includes('top 18%') && prompt.includes('bottom 46%'));
    t('prompt asks for art.png in the cwd', prompt.includes('named art.png in the current working directory'));

    const ENFORCED = { status: 1, stdout: `${SANDBOX_PROBE_MARKER}=DENIED:EPERM\n`, stderr: '' };
    const outputs = (map) => (cmd, args) => {
      if (args[0] === 'sandbox') return map.__sandbox || ENFORCED;
      return map[args.join(' ')] || { status: 1, stdout: '', stderr: 'unknown' };
    };
    const good = { '--version': { status: 0, stdout: 'codex-cli 0.153.4\n' }, 'login status': { status: 0, stdout: 'Logged in using ChatGPT\n' }, 'features list': { status: 0, stdout: 'image_detail_original   removed   false\nimage_generation                         stable             true\n' } };
    const pf = (map, options = {}) => preflight(outputs(map), { platform: 'linux', readConfig: () => '', modes: [null], probeDir: tmp, ...options });
    t('preflight passes: ChatGPT login + image_generation + an enforcing sandbox', pf(good).ok);
    t('preflight refuses API-key auth', !pf({ ...good, 'login status': { status: 0, stdout: 'Logged in using an API key - sk-***\n' } }).ok);
    t('preflight refuses when not logged in', !pf({ ...good, 'login status': { status: 1, stdout: 'Not logged in\n' } }).ok);
    t('preflight refuses when image_generation is disabled', !pf({ ...good, 'features list': { status: 0, stdout: 'image_generation   stable   false\n' } }).ok);
    t('preflight refuses when codex is missing', !preflight(() => ({ status: null, stdout: '', stderr: '', error: 'ENOENT' })).ok);

    /* Sandbox is a hard gate: story text never reaches an unconfined agent. */
    const unconfined = pf({ ...good, __sandbox: { status: 0, stdout: `${SANDBOX_PROBE_MARKER}=WROTE\n`, stderr: '' } });
    t('preflight refuses when the sandbox allows a write it should block',
      !unconfined.ok && unconfined.sandboxState === 'not-enforced' && unconfined.reasons.some((r) => /unconfined/.test(r)));
    const brokenSandbox = pf({ ...good, __sandbox: { status: 1, stdout: '', stderr: 'windows sandbox failed: CryptUnprotectData failed\n' } });
    t('preflight refuses when the sandbox cannot start, and points at codex doctor',
      !brokenSandbox.ok && brokenSandbox.sandboxState === 'unavailable' && brokenSandbox.reasons.some((r) => /codex doctor/.test(r)));
    // win32: the configured backend can be broken while another one enforces.
    let probedModes = [];
    const modeAware = preflight((cmd, args) => {
      if (args[0] === 'sandbox') {
        const mode = args.includes('-c') ? String(args[args.indexOf('-c') + 1]) : 'default';
        probedModes.push(mode);
        return mode.includes('unelevated') ? ENFORCED : { status: 1, stdout: '', stderr: 'windows sandbox failed\n' };
      }
      return good[args.join(' ')] || { status: 1, stdout: '', stderr: 'unknown' };
    }, { platform: 'win32', readConfig: () => '', probeDir: tmp });
    t('preflight discovers the Windows sandbox mode that actually confines',
      modeAware.ok && modeAware.sandboxMode === 'unelevated' && probedModes[0] === 'default');

    /* A custom model_provider can bill an account even under a ChatGPT login. */
    t('preflight refuses a non-ChatGPT model_provider from config.toml',
      !pf(good, { readConfig: () => 'model = "gpt-6"\nmodel_provider = "azure"\n' }).ok);
    t('preflight accepts an explicit openai provider', pf(good, { readConfig: () => 'model_provider = "openai"\n' }).ok);
    t('codexConfigProvider reads only the provider name and ignores comments',
      codexConfigProvider('# model_provider = "azure"\nmodel_provider = "openai"\n') === 'openai'
      && codexConfigProvider('api_key = "secret"\n') === null);

    /* The verified flag set for a generation run. */
    const execArgs = codexExecArgs();
    t('exec args: strict config, workspace-write sandbox, no network, prompt on stdin',
      execArgs.join(' ') === 'exec --strict-config --skip-git-repo-check --ephemeral --color never --sandbox workspace-write -c sandbox_workspace_write.network_access=false -');
    t('exec args carry the discovered windows sandbox mode when there is one',
      codexExecArgs({ sandboxMode: 'unelevated' }).join(' ').includes('-c windows.sandbox="unelevated"'));
    t('--allow-network is the only way to drop the network denial',
      !codexExecArgs({ network: true }).join(' ').includes('network_access')
      && parseArgs(['--allow-network']).network === true && parseArgs([]).network === false);
    t('sandbox probe classification: denied=enforced, wrote=not-enforced, silence=unavailable',
      classifySandboxProbe({ stdout: `${SANDBOX_PROBE_MARKER}=DENIED:EPERM` }) === 'enforced'
      && classifySandboxProbe({ stdout: `${SANDBOX_PROBE_MARKER}=WROTE` }) === 'not-enforced'
      && classifySandboxProbe({ stderr: 'windows sandbox failed' }) === 'unavailable');

    const opts = codexSpawnOptions({ cwd: tmp, input: 'p', timeoutMs: DEFAULT_TIMEOUT_MS, env: { PATH: 'x', OPENAI_API_KEY: 'fake', CODEX_API_KEY: 'fake' }, platform: 'win32' });
    t('spawn options: windowsHide, stdin prompt, 9-minute timeout, win32 shell for the .cmd shim', opts.windowsHide === true && opts.input === 'p' && opts.timeout === 540000 && opts.shell === true);
    t('spawn env strips API billing keys', !('OPENAI_API_KEY' in opts.env) && !('CODEX_API_KEY' in opts.env) && opts.env.PATH === 'x');

    const stagingDir = path.join(root, '.cache', 'desk-art-staging');
    const workRoot = path.join(tmp, 'work');
    const realBuffer = await renderSyntheticRasterFixture('codex-output');
    const calls = [];
    const writer = (buffer, name = 'art.png') => (cmd, args, o) => { calls.push({ cmd, args, o }); fs.writeFileSync(path.join(o.cwd, name), buffer); return { status: 0, stdout: 'art.png', stderr: '' }; };
    const target = targets[0];
    const first = await generateOne(target, { stagingDir, workRoot, run: writer(realBuffer) });
    t('generateOne stages art.png + meta on success', first.status === 'generated' && fs.existsSync(path.join(stagingDir, target.id, 'art.png')) && fs.existsSync(path.join(stagingDir, target.id, 'meta.json')));
    t('codex invoked with the verified sandboxed exec args and the prompt on stdin', calls[0].cmd === 'codex' && calls[0].args.join(' ') === codexExecArgs().join(' ') && calls[0].o.input === buildPrompt(target.story) && calls[0].o.timeoutMs === DEFAULT_TIMEOUT_MS);
    t('codex runs in a scratch dir outside the staging tree', !path.resolve(calls[0].o.cwd).startsWith(path.resolve(stagingDir)));
    const resumed = await generateOne(target, { stagingDir, workRoot, run: () => { throw new Error('must not spawn'); } });
    t('resumable: a valid staged image is skipped without spawning', resumed.status === 'skipped-staged');

    const otherStaging = path.join(tmp, 'staging-2');
    let n = 0;
    const flaky = (cmd, args, o) => { n += 1; if (n === 1) return { status: 1, stdout: '', stderr: 'boom' }; fs.writeFileSync(path.join(o.cwd, 'illustration.png'), realBuffer); return { status: 0, stdout: '', stderr: '' }; };
    const retried = await generateOne(target, { stagingDir: otherStaging, workRoot, run: flaky });
    t('one retry: failure then success stages the image (any produced PNG name accepted)', retried.status === 'generated' && retried.attempt === 2 && n === 2);
    let m = 0;
    const dead = await generateOne(target, { stagingDir: path.join(tmp, 'staging-3'), workRoot, run: () => { m += 1; return { status: 1, stdout: '', stderr: '' }; } });
    t('persistent failure reports failed after exactly one retry', dead.status === 'failed' && m === 2 && dead.errors.length === 2);
    const timeout = await generateOne(target, { stagingDir: path.join(tmp, 'staging-4'), workRoot, retries: 0, run: () => ({ status: null, stdout: '', stderr: '', timedOut: true, error: 'spawnSync ETIMEDOUT' }) });
    t('timeout is recorded as a failure', timeout.status === 'failed' && /timeout/.test(timeout.errors[0]));
    const flat = await generateOne(target, { stagingDir: path.join(tmp, 'staging-5'), workRoot, retries: 0, run: writer(fallbackPng) });
    t('a low-entropy (flat/diagram) output is rejected', flat.status === 'failed' && /entropy/.test(flat.errors[0]));

    ensureSelfIgnoringDir(stagingDir);
    t('staging dir is self-ignoring (.gitignore "*")', fs.readFileSync(path.join(stagingDir, '.gitignore'), 'utf8').includes('\n*\n'));
    t('parseArgs: --story comma list, --since, --limit, --timeout-min', (() => {
      const parsed = parseArgs(['--story', '2026-09-12/a,2026-09-11--b', '--since', '2026-09-01', '--limit', '2', '--timeout-min', '9']);
      return parsed.stories.length === 2 && parsed.since === '2026-09-01' && parsed.limit === 2 && parsed.timeoutMs === 540000;
    })());
    t('ingest follow-up script is named for operators', fs.existsSync(path.join(ROOT, 'scripts', 'ingest-news-art.mjs')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const failed = cases.filter((c) => !c.ok);
  for (const c of failed) console.error(`  ✗ ${c.name}`);
  console.log(`generate-news-art-codex --self-test: ${cases.length - failed.length}/${cases.length} passed`);
  return failed.length ? 1 : 0;
}

const invokedDirectly = (() => {
  try {
    const self = fs.realpathSync(fileURLToPath(import.meta.url));
    const entry = fs.realpathSync(path.resolve(process.argv[1] || ''));
    return process.platform === 'win32' ? self.toLowerCase() === entry.toLowerCase() : self === entry;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`generate-news-art-codex: ${error.message}`);
    process.exit(2);
  }
  (opts.selfTest ? selfTest() : main(opts))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(`generate-news-art-codex: ${error.message}`);
      process.exit(1);
    });
}
