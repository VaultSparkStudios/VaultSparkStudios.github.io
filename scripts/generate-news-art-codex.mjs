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
 * TWO KINDS (D-S368.7). `--kind banner` is the painted, person-free editorial
 * illustration above (prompt, files and result rows unchanged since S368).
 * `--kind satire` is the story's satire cartoon: a clearly drawn, square,
 * single-panel gag in the register of the correspondent who wrote the meme
 * line, staged as <id>/satire.png beside art.png, with the same confinement,
 * sandbox and ChatGPT-plan guards. It may caricature real PUBLIC figures as
 * obvious non-photorealistic cartoons; never private individuals. With no
 * --kind the worker runs BOTH (banner pass first, then satire) — that is what
 * the nightly scheduled task invokes. Satire targets default to stories since
 * max(SATIRE_CARTOON_ERA_START, today − SATIRE_CARTOON_GRACE_DAYS) that have no
 * visual.satireCartoon yet; --since / --story widen or name them.
 *
 * Usage:
 *   node scripts/generate-news-art-codex.mjs --dry-run                 # list banner + satire targets
 *   node scripts/generate-news-art-codex.mjs --kind banner             # banner only (pre-D-S368.7 behaviour)
 *   node scripts/generate-news-art-codex.mjs --kind satire --limit 3   # satire cartoons only
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
import {
  EDITORIAL_OVERLAY_ZONES,
  SATIRE_CARTOON_ASPECT,
  SATIRE_CARTOON_ENTROPY_FLOOR,
  SATIRE_CARTOON_ERA_START,
  SATIRE_CARTOON_GRACE_DAYS,
  SATIRE_CARTOON_MIN,
  satireCartoonBrief,
} from './lib/news-memes.mjs';
import { PERSONAS } from './lib/news-desk.mjs';
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
export const ART_KINDS = Object.freeze(['banner', 'satire', 'all']);
/**
 * Staged file names per kind. The banner names are the pre-D-S368.7 names,
 * unchanged, so existing staging dirs, ingest and operator habits keep working.
 */
export const KIND_FILES = Object.freeze({
  banner: Object.freeze({ image: 'art.png', prompt: 'prompt.txt', meta: 'meta.json', log: 'codex-attempt', invalid: 'art.invalid', work: 'attempt' }),
  satire: Object.freeze({ image: 'satire.png', prompt: 'satire-prompt.txt', meta: 'satire-meta.json', log: 'satire-codex-attempt', invalid: 'satire.invalid', work: 'satire-attempt' }),
});

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
  const opts = { kind: 'all', stories: [], since: null, dryRun: false, selfTest: false, force: false, limit: null, staging: DEFAULT_STAGING_DIR, timeoutMs: DEFAULT_TIMEOUT_MS, retries: DEFAULT_RETRIES, network: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value == null || value.startsWith('--')) throw new Error(`${flag} requires a value`);
      i += 1;
      return value;
    };
    if (flag === '--kind') opts.kind = next();
    else if (flag === '--story') opts.stories.push(...next().split(',').map((s) => s.trim()).filter(Boolean));
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
  if (!ART_KINDS.includes(opts.kind)) throw new Error(`--kind must be one of ${ART_KINDS.join(', ')}`);
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
    // S368: a scene that names a person ("King Charles presses leaders") made the model stage
    // that person in costume and setting. Context identifies a figure as surely as a face does.
    'If the scene or headline names a real person (a monarch, head of state, executive or public figure), never show that person or a stand-in styled, costumed or placed to represent them; show their institution through objects instead (an empty chair, a seal, a building, a document). Keep any landmarks true to the story\'s country.',
    `Story headline (for context only, do not render text): ${clean(story.headline, 300)}`,
    `Scene: ${clean(story.visual?.scene)}`,
    `Satirical idea: ${clean(satire.target, 400)} / ${clean(satire.setup, 400)} / ${clean(satire.payoff, 400)}`,
    'After saving, reply with only the filename.',
    '',
  ].join('\n');
}

/** The satire window's default start: the later of the era start and today − grace. */
export function defaultSatireSince(now = new Date()) {
  const windowStart = new Date(now.getTime() - SATIRE_CARTOON_GRACE_DAYS * 86_400_000).toISOString().slice(0, 10);
  return windowStart > SATIRE_CARTOON_ERA_START ? windowStart : SATIRE_CARTOON_ERA_START;
}

/**
 * Stories that need a satire cartoon: a meme line with a known persona (the
 * cartoon credits that voice) and no `visual.satireCartoon` yet. --story names
 * stories explicitly (re-roll allowed even when a cartoon exists).
 */
export function findSatireTargets({ root = ROOT, stories = [], since = null, now = new Date() } = {}) {
  const days = loadPublicDays(path.join(root, 'data', 'news-desk', 'days'));
  const explicit = new Map(stories.map((value) => { const parsed = parseStoryId(value); return [parsed.id, parsed]; }));
  const floor = since || (explicit.size ? null : defaultSatireSince(now));
  const seen = new Set();
  const targets = [];
  for (const day of days) {
    for (const story of day.stories || []) {
      const id = storyId(day.date, story.slug);
      const named = explicit.has(id);
      if (named) seen.add(id);
      if (explicit.size && !named) continue;
      if (floor && day.date < floor) continue;
      const persona = PERSONAS.find((p) => p.id === story.memeLine?.personaId);
      if (!persona || !story.memeLine?.text) continue;
      if (!named && story.visual?.satireCartoon) continue;
      targets.push({ id, date: day.date, slug: story.slug, story, persona, kind: story.visual?.satireCartoon ? 'satire-cartoon' : 'missing', entropy: null, reason: named ? 'explicit' : 'no satire cartoon' });
    }
  }
  const unknown = [...explicit.keys()].filter((id) => !seen.has(id));
  if (unknown.length) throw new Error(`unknown stories: ${unknown.join(', ')}`);
  return targets;
}

/**
 * The satire-cartoon prompt (D-S368.7). The page prints the caption as HTML
 * under the image, so the model is asked for NO text; one short word is
 * tolerated only when perfectly legible (the reviewer rejects anything else).
 * The caricature rule is stated in full because the scene can name a public
 * figure: obvious exaggerated cartoon of a PUBLIC figure only, never a private
 * person, never photorealistic, never sexual, violent or degrading.
 */
export function buildSatirePrompt(story, persona) {
  const brief = satireCartoonBrief({ story, persona });
  if (!brief) throw new Error(`${story?.slug || '?'}: no meme line/persona to draw a satire cartoon for`);
  return [
    'Generate ONE original single-panel satirical gag cartoon and save it as a PNG file named satire.png in the current working directory.',
    `Format: square 1:1, at least ${SATIRE_CARTOON_MIN.width}x${SATIRE_CARTOON_MIN.height}. It must read instantly as a drawn cartoon: clean ink line art and/or flat colours, comic-strip clarity, one clear focal gag. Never photorealistic, never a photograph, never a realistic 3D render.`,
    `Visual register (the correspondent ${brief.personaName}, ${brief.label}): ${brief.style}`,
    `Composition: ${brief.scene}.`,
    `The joke — target: ${brief.target} / setup: ${brief.setup} / payoff: ${brief.payoff}.`,
    `The punchline the drawing must land is this caption: "${clean(brief.caption, 200)}". The website prints that caption below the image, so do NOT draw it.`,
    'Prefer NO text anywhere in the image: no captions, no words in speech bubbles, no labels, signs, logos, brand marks, watermarks, numbers or UI text. Only if a single very short word is essential to the gag AND you can render it perfectly legibly, you may include that one word; otherwise none.',
    'People: invented and animated characters are welcome. A real PUBLIC figure named in the story (an executive, politician or official) may appear only as an obvious, exaggerated, non-photorealistic caricature that mocks their public role or claim. Never depict a private individual or any real person who is not a public figure. Never sexual, violent, gory or degrading imagery, and never mock anyone\'s body, ethnicity, gender, religion, disability or age. No real company logos or trademarks; show institutions through objects.',
    // S368: reviewers rejected renders that added famous executives or celebrities
    // absent from the story, mascot-logos, and another country's landmarks.
    'Only a real person named in the headline may appear; never add any other real executive, celebrity or politician, and no famous-looking stand-ins. Never draw a company mascot or logo character. Any landmark, flag or emblem must belong to the country the story is about.',
    ...(story.visual?.satireDirection ? [`Art direction for this story: ${clean(story.visual.satireDirection, 400)}`] : []),
    `Story headline (for context only, do not render text): ${clean(story.headline, 300)}`,
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

/**
 * S368: the native codex.exe behind the npm shim. Spawning the .cmd shim needs
 * `shell: true`, and under Node 24 cmd.exe then re-parses every argument: the
 * sandbox probe's `node -e "<script>"` and `windows.sandbox="unelevated"` were
 * mangled, the probe never printed its marker, and preflight reported the
 * sandbox "could not start" — which is why Desk art silently stopped after
 * 2026-09-17. Spawning the real executable needs no shell, so arguments pass
 * through verbatim. CODEX_BIN overrides the lookup.
 */
export function resolveCodexBin({ env = process.env, platform = process.platform, exists = fs.existsSync } = {}) {
  if (env.CODEX_BIN && exists(env.CODEX_BIN)) return env.CODEX_BIN;
  if (platform !== 'win32') return null;
  const dirs = String(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  const vendor = ['node_modules', '@openai', 'codex', 'node_modules', '@openai', 'codex-win32-x64', 'vendor', 'x86_64-pc-windows-msvc', 'bin', 'codex.exe'];
  for (const dir of dirs) {
    if (!exists(path.join(dir, 'codex.cmd')) && !exists(path.join(dir, 'codex.ps1'))) continue;
    const candidate = path.join(dir, ...vendor);
    if (exists(candidate)) return candidate;
  }
  return null;
}

export function codexSpawnOptions({ cwd, input, timeoutMs, env = process.env, platform = process.platform, nativeBin = null }) {
  return {
    cwd,
    input,
    timeout: timeoutMs,
    encoding: 'utf8',
    windowsHide: true,
    // Prefer the native binary (no shell, arguments verbatim). Only fall back to
    // the npm .cmd shim — which Node refuses to spawn without a shell — when the
    // native binary cannot be found.
    shell: platform === 'win32' && !nativeBin,
    env: codexChildEnv(env),
    maxBuffer: 64 * 1024 * 1024,
  };
}

function defaultRun(cmd, args, { cwd = os.tmpdir(), input = undefined, timeoutMs = 60_000 } = {}) {
  const nativeBin = cmd === 'codex' ? resolveCodexBin() : null;
  const result = spawnSync(nativeBin || cmd, args, codexSpawnOptions({ cwd, input, timeoutMs, nativeBin }));
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

async function validateGenerated(file, kind = 'banner') {
  const m = await measureArt(file);
  const errors = [];
  if (m.format !== 'png') errors.push(`not a PNG (decoded as ${m.format})`);
  if (kind === 'satire') {
    const aspect = m.width / m.height;
    if (!(m.width >= SATIRE_CARTOON_MIN.width && m.height >= SATIRE_CARTOON_MIN.height)) errors.push(`too small (${m.width}x${m.height}; need ≥${SATIRE_CARTOON_MIN.width}x${SATIRE_CARTOON_MIN.height})`);
    if (!(aspect >= SATIRE_CARTOON_ASPECT.min && aspect <= SATIRE_CARTOON_ASPECT.max)) errors.push(`aspect ${aspect.toFixed(2)} is not square (${SATIRE_CARTOON_ASPECT.min}–${SATIRE_CARTOON_ASPECT.max})`);
    if (!(m.entropy >= SATIRE_CARTOON_ENTROPY_FLOOR)) errors.push(`entropy ${m.entropy} below cartoon floor ${SATIRE_CARTOON_ENTROPY_FLOOR} (blank or near-blank)`);
    return { m, errors };
  }
  if (!(m.width >= PANEL_WIDTH && m.height >= PANEL_HEIGHT)) errors.push(`too small (${m.width}x${m.height}; need ≥${PANEL_WIDTH}x${PANEL_HEIGHT})`);
  if (!(m.entropy >= REAL_ART_ENTROPY_FLOOR)) errors.push(`entropy ${m.entropy} below real-art floor ${REAL_ART_ENTROPY_FLOOR}`);
  return { m, errors };
}

function findProducedPng(dir, preferredName = 'art.png') {
  const preferred = path.join(dir, preferredName);
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
  kind = 'banner',
} = {}) {
  // Banner rows/files are byte-for-byte the pre-D-S368.7 shape (no `kind` key);
  // satire rows carry kind:"satire" so ingest's re-roll counter can tell them apart.
  const satire = kind === 'satire';
  const files = KIND_FILES[satire ? 'satire' : 'banner'];
  const tag = satire ? { kind: 'satire' } : {};
  const itemDir = path.join(stagingDir, target.id);
  const staged = path.join(itemDir, files.image);
  fs.mkdirSync(itemDir, { recursive: true });
  if (fs.existsSync(staged) && !force) {
    const { m, errors } = await validateGenerated(staged, kind);
    if (!errors.length) return { id: target.id, ...tag, status: 'skipped-staged', sha256: m.sha256, width: m.width, height: m.height, entropy: m.entropy };
    fs.renameSync(staged, path.join(itemDir, `${files.invalid}-${now().getTime()}.png`));
  }
  const persona = satire ? (target.persona || PERSONAS.find((p) => p.id === target.story?.memeLine?.personaId)) : null;
  const prompt = satire ? buildSatirePrompt(target.story, persona) : buildPrompt(target.story);
  fs.writeFileSync(path.join(itemDir, files.prompt), prompt);
  const errors = [];
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const workDir = path.join(workRoot, target.id, `${files.work}-${attempt}-${now().getTime()}`);
    fs.mkdirSync(workDir, { recursive: true });
    const started = Date.now();
    const result = run('codex', [...execArgs], { cwd: workDir, input: prompt, timeoutMs });
    const log = `exit=${result.status} timedOut=${Boolean(result.timedOut)} error=${result.error || ''}\n--- stdout ---\n${String(result.stdout).slice(-20000)}\n--- stderr ---\n${String(result.stderr).slice(-20000)}\n`;
    fs.writeFileSync(path.join(itemDir, `${files.log}-${attempt}.log`), log);
    let failure = null;
    const produced = findProducedPng(workDir, files.image);
    if (result.timedOut) failure = `timeout after ${Math.round(timeoutMs / 1000)}s`;
    else if (!produced) failure = `no PNG produced (exit ${result.status})`;
    else {
      const check = await validateGenerated(produced, kind);
      if (check.errors.length) failure = check.errors.join('; ');
      else {
        fs.copyFileSync(produced, staged);
        const meta = {
          id: target.id, ...tag, sha256: check.m.sha256, width: check.m.width, height: check.m.height, entropy: check.m.entropy, bytes: check.m.bytes,
          attempt, seconds: Math.round((Date.now() - started) / 1000), generatedAt: now().toISOString(), generator: GENERATOR_LABEL, codexVersion,
          promptSha256: crypto.createHash('sha256').update(prompt).digest('hex'),
        };
        if (satire) {
          const brief = satireCartoonBrief({ story: target.story, persona });
          Object.assign(meta, { persona: brief.personaId, register: brief.register, caption: brief.caption, alt: brief.alt });
        }
        fs.writeFileSync(path.join(itemDir, files.meta), `${JSON.stringify(meta, null, 2)}\n`);
        return { status: 'generated', ...meta };
      }
    }
    errors.push(`attempt ${attempt}: ${failure}`);
  }
  return { id: target.id, ...tag, status: 'failed', errors };
}

/** Root .gitignore does not list the staging dir; make it self-ignoring. */
export function ensureSelfIgnoringDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const marker = path.join(dir, '.gitignore');
  if (!fs.existsSync(marker)) fs.writeFileSync(marker, '# Local Desk art staging (scripts/generate-news-art-codex.mjs) — never committed.\n*\n');
}

/** Targets for one kind, limited. */
export async function targetsForKind(kind, opts, { root = ROOT, now = new Date() } = {}) {
  const all = kind === 'satire'
    ? findSatireTargets({ root, stories: opts.stories, since: opts.since, now })
    : await findTargets({ root, stories: opts.stories, since: opts.since });
  return all.slice(0, opts.limit || undefined);
}

async function main(opts) {
  const kinds = opts.kind === 'all' ? ['banner', 'satire'] : [opts.kind];
  const plan = [];
  for (const kind of kinds) plan.push({ kind, targets: await targetsForKind(kind, opts) });
  if (opts.dryRun) {
    for (const { kind, targets } of plan) {
      const file = KIND_FILES[kind].image;
      // The banner header line is unchanged; the satire section is labelled.
      console.log(kind === 'banner'
        ? `generate-news-art-codex --dry-run: ${targets.length} target(s)`
        : `generate-news-art-codex --dry-run --kind satire: ${targets.length} stor${targets.length === 1 ? 'y' : 'ies'} lacking a satire cartoon${opts.since || opts.stories.length ? '' : ` (since ${defaultSatireSince()})`}`);
      for (const target of targets) {
        const staged = fs.existsSync(path.join(opts.staging, target.id, file)) ? ' [staged]' : '';
        console.log(kind === 'banner'
          ? `  ${target.id}  kind=${target.kind} entropy=${target.entropy ?? 'n/a'} reason=${target.reason}${staged}`
          : `  ${target.id}  persona=${target.persona.id} register=${target.persona.memeStyle} reason=${target.reason}${staged}`);
      }
    }
    return 0;
  }
  if (!plan.some(({ targets }) => targets.length)) {
    console.log(kinds.length === 1 && kinds[0] === 'banner'
      ? 'generate-news-art-codex: no fallback art to replace.'
      : 'generate-news-art-codex: no fallback art to replace and no story lacking a satire cartoon.');
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
  const total = plan.reduce((n, { targets }) => n + targets.length, 0);
  console.log(`generate-news-art-codex: ${total} target(s) · ${check.version} · staging ${path.relative(ROOT, opts.staging) || opts.staging}`);
  console.log(`  sandbox: ${check.sandboxState}${check.sandboxMode ? ` (windows.sandbox="${check.sandboxMode}")` : ' (configured default)'} · shell network: ${opts.network ? 'ALLOWED (--allow-network)' : 'denied'}`);
  let failed = 0;
  const staged = { banner: [], satire: [] };
  for (const { kind, targets } of plan) {
    if (!targets.length) continue;
    console.log(`── ${kind === 'banner' ? 'banner illustrations' : 'satire cartoons'} (${targets.length}) ──`);
    for (const [index, target] of targets.entries()) {
      console.log(`[${index + 1}/${targets.length}] ${target.id} …`);
      const row = await generateOne(target, { stagingDir: opts.staging, timeoutMs: opts.timeoutMs, retries: opts.retries, force: opts.force, codexVersion: check.version, execArgs, kind });
      fs.appendFileSync(resultsFile, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
      if (row.status === 'failed') {
        failed += 1;
        console.error(`  ✗ ${row.errors.join(' | ')}`);
      } else {
        staged[kind].push(target.id);
        console.log(`  ✓ ${row.status} ${row.width}x${row.height} entropy=${row.entropy}`);
      }
    }
  }
  const from = path.relative(ROOT, opts.staging) || opts.staging;
  console.log(`\n${staged.banner.length + staged.satire.length} staged · ${failed} failed · results: ${path.relative(ROOT, resultsFile)}`);
  if (staged.banner.length) {
    console.log('Next: LOOK at every staged art.png (no text/logos/likenesses, fits the story), list the ones you accept, then:');
    console.log(`  node scripts/ingest-news-art.mjs --from ${from} --reviewed ${staged.banner.join(',')}`);
  }
  if (staged.satire.length) {
    console.log('Next: LOOK at every staged satire.png (legible, obviously a cartoon, public figures only, nothing degrading, the punchline fits),');
    console.log('      approve each as <id>@<sha>+caricature (depicts a real public figure) or <id>@<sha>+none, then:');
    console.log(`  node scripts/ingest-news-art.mjs --kind satire --from ${from} --reviewed ${staged.satire.map((id) => `${id}+none`).join(',')}`);
  }
  return failed ? 1 : 0;
}

/* ── Self-test: mocked spawn, temp fixtures, never real repo data ─────────── */

/** sha256 of buildPrompt() for the self-test fixture story — pins the banner prompt byte-for-byte. */
const BANNER_PROMPT_FIXTURE_SHA256 = '5ae2f76f90d7387851d2079b97e41b3a3e3f7ee4b879099424e3b5f0b3fbcfe8';

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
      memeLine: { text: 'The demo never pages you.', personaId: 'vera' },
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

    /* ── D-S368.7 satire cartoons ─────────────────────────────────────── */
    // Banner prompt is frozen: the satire work must not move a byte of it.
    t('banner prompt is byte-identical to the S368 prompt (sha256 snapshot)',
      crypto.createHash('sha256').update(buildPrompt(day.stories[0])).digest('hex') === BANNER_PROMPT_FIXTURE_SHA256);
    t('banner result rows carry no kind key (pre-D-S368.7 row shape)', !('kind' in first) && !('kind' in resumed));
    t('parseArgs: no --kind runs both kinds; --kind banner/satire narrow it; a bad kind throws', (() => {
      let bad = false;
      try { parseArgs(['--kind', 'meme']); } catch { bad = true; }
      return parseArgs([]).kind === 'all' && parseArgs(['--kind', 'banner']).kind === 'banner' && parseArgs(['--kind', 'satire']).kind === 'satire' && bad;
    })());
    const vera = PERSONAS.find((p) => p.id === 'vera');
    const satirePrompt = buildSatirePrompt(day.stories[0], vera);
    t('satire prompt asks for satire.png, square 1:1, drawn cartoon, never photorealistic',
      satirePrompt.includes('named satire.png in the current working directory') && satirePrompt.includes('square 1:1')
      && /Never photorealistic, never a photograph/.test(satirePrompt));
    t('satire prompt uses the correspondent register (VERA → 3 a.m. pager gag)', satirePrompt.includes('VERA') && satirePrompt.includes('3 a.m. pager gag') && /blaring pager/.test(satirePrompt));
    t('satire prompt carries the joke (target/setup/payoff) and the meme line, and says the page prints the caption',
      satirePrompt.includes('audit the harbor') && satirePrompt.includes('manifest before it may float') && satirePrompt.includes('"The demo never pages you."')
      && /prints that caption below the image, so do NOT draw it/.test(satirePrompt));
    t('satire prompt prefers no text; at most one perfectly legible word', /Prefer NO text anywhere/.test(satirePrompt) && /perfectly legibly/.test(satirePrompt));
    t('satire prompt states the caricature rule: public figures only, never private people, never sexual/violent/degrading',
      /real PUBLIC figure/.test(satirePrompt) && /obvious, exaggerated, non-photorealistic caricature/.test(satirePrompt)
      && /Never depict a private individual/.test(satirePrompt) && /Never sexual, violent, gory or degrading/.test(satirePrompt));
    t('every persona register has a drawn cartoon style', PERSONAS.every((p) => buildSatirePrompt({ ...day.stories[0], memeLine: { text: 'x', personaId: p.id } }, p).includes(`the correspondent ${p.name}`)));
    t('default satire window starts at the D-S368.7 era, never before', defaultSatireSince(new Date('2026-09-14T00:00:00Z')) === SATIRE_CARTOON_ERA_START
      && defaultSatireSince(new Date('2026-10-20T00:00:00Z')) === '2026-10-13');
    const satNow = new Date('2026-09-14T00:00:00Z');
    t('satire targets: pre-era stories are not targeted by default', findSatireTargets({ root, now: satNow }).length === 0);
    t('satire targets: --since widens to every story lacking a cartoon', findSatireTargets({ root, since: '2026-09-01', now: satNow }).length === 3);
    t('satire targets: --story names one explicitly', findSatireTargets({ root, stories: ['2026-09-12/real-story'], now: satNow }).map((x) => x.slug).join(',') === 'real-story');
    const withCartoon = JSON.parse(fs.readFileSync(path.join(daysDir, '2026-09-12.json'), 'utf8'));
    withCartoon.stories[1].visual.satireCartoon = { artSource: 'x' };
    fs.writeFileSync(path.join(daysDir, '2026-09-12.json'), JSON.stringify(withCartoon, null, 2));
    t('satire targets: a story that already has a cartoon is skipped', findSatireTargets({ root, since: '2026-09-01', now: satNow }).every((x) => x.slug !== 'real-story'));
    fs.writeFileSync(path.join(daysDir, '2026-09-12.json'), JSON.stringify(day, null, 2));

    const satTarget = findSatireTargets({ root, stories: ['2026-09-12/fallback-story'], now: satNow })[0];
    const artBefore = fs.readFileSync(path.join(stagingDir, target.id, 'art.png'));
    const square = await renderSyntheticRasterFixture('satire-output', 1024, 1024);
    const satCalls = [];
    const satWriter = (cmd, args, o) => { satCalls.push({ args, o }); fs.writeFileSync(path.join(o.cwd, 'satire.png'), square); return { status: 0, stdout: 'satire.png', stderr: '' }; };
    const sat = await generateOne(satTarget, { stagingDir, workRoot, run: satWriter, kind: 'satire' });
    const satMeta = JSON.parse(fs.readFileSync(path.join(stagingDir, target.id, 'satire-meta.json'), 'utf8'));
    t('satire stages satire.png + satire-meta.json beside art.png, art.png untouched',
      sat.status === 'generated' && sat.kind === 'satire' && fs.existsSync(path.join(stagingDir, target.id, 'satire.png'))
      && Buffer.compare(fs.readFileSync(path.join(stagingDir, target.id, 'art.png')), artBefore) === 0);
    t('satire meta records persona, register, caption and the derived alt',
      satMeta.persona === 'vera' && satMeta.register === 'pager' && satMeta.caption === 'The demo never pages you.' && /^AI-generated satirical cartoon in VERA/.test(satMeta.alt));
    t('satire uses the same sandboxed exec args and sends the satire prompt',
      satCalls[0].args.join(' ') === codexExecArgs().join(' ') && satCalls[0].o.input === buildSatirePrompt(satTarget.story, vera)
      && fs.readFileSync(path.join(stagingDir, target.id, 'satire-prompt.txt'), 'utf8') === satCalls[0].o.input);
    const satResumed = await generateOne(satTarget, { stagingDir, workRoot, run: () => { throw new Error('must not spawn'); }, kind: 'satire' });
    t('satire is resumable: a valid staged satire.png is skipped without spawning', satResumed.status === 'skipped-staged' && satResumed.kind === 'satire');
    const wide = await generateOne(satTarget, { stagingDir: path.join(tmp, 'staging-sat-wide'), workRoot, retries: 0, kind: 'satire', run: (cmd, args, o) => { fs.writeFileSync(path.join(o.cwd, 'satire.png'), realBuffer); return { status: 0, stdout: '', stderr: '' }; } });
    t('a non-square satire output is rejected', wide.status === 'failed' && /not square/.test(wide.errors[0]));
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
