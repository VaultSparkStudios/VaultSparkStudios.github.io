#!/usr/bin/env node
/** Prepare reviewed article images before a separately authorized Desk email. Never sends mail. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from './lib/safe-spawn.mjs';
import { buildDigest, renderHtml, renderText, selectStories, todayUtc } from './build-desk-dispatch-digest.mjs';
import { validDeskDate, inspectDeskEmailArt, verifyDeskEmailArt, deskArtGenerationCommands } from './lib/desk-email-art.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const HELP = `Usage: node scripts/prepare-desk-email.mjs [--date YYYY-MM-DD] [--dry-run] [--generate] [--verify-live] [--kind required|banner|satire|all] [--json]
Default/--dry-run: local status, generation plan, HTML/text preview; no network or generation.
--generate: prepare missing scoped art with existing ChatGPT-plan generation/review/ingest, or rebuild derivatives from already reviewed sources without redrawing, then stage/publish and verify production images. Never sends email.
--verify-live: read production image bytes and verify exact local hashes; never sends email.
Cartoons remain optional unless declared by the selected article. --kind all additionally prepares optional missing cartoons.
Actual generation launches the existing art worker; run it outside an active single-session arc. No API fallback or new spending.`;

export function parsePreparationArgs(argv) {
  const options = { date: null, generate: false, verifyLive: false, dryRun: false, kind: 'required', json: false, help: false };
  if (argv.includes('--help') || argv.includes('-h')) return { ...options, help: true };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = () => { const result = argv[++i];if (!result || result.startsWith('--')) throw new Error(`${flag} needs a value`);return result; };
    if (flag === '--date') options.date = value();
    else if (flag === '--kind') options.kind = value();
    else if (flag === '--generate') options.generate = true;
    else if (flag === '--verify-live') options.verifyLive = true;
    else if (flag === '--dry-run') options.dryRun = true;
    else if (flag === '--json') options.json = true;
    else throw new Error(`Unknown preparation argument: ${flag}`);
  }
  if (options.date !== null && !validDeskDate(options.date)) throw new Error('--date must be a real YYYY-MM-DD');
  if (!['required', 'all', 'banner', 'satire'].includes(options.kind)) throw new Error('Unknown art preparation kind');
  if (options.dryRun && (options.generate || options.verifyLive)) throw new Error('--dry-run cannot generate or use the network');
  return options;
}

function readDay(root, date) {
  const file = path.join(root, 'data', 'news-desk', 'days', `${date}.json`);
  if (!fs.existsSync(file)) return null;
  const day = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (day.date !== date) throw new Error('Desk day does not match requested date');
  return day;
}

export async function prepareDeskEmail(argv = process.argv.slice(2), deps = {}) {
  const options = parsePreparationArgs(argv);
  if (options.help) return { outcome: 'help', help: HELP };
  const root = deps.root || ROOT, date = options.date || todayUtc(deps.now || new Date());
  let artifactRoot = root, day = readDay(root, date), issue = buildDigest(day, { date });
  if (issue.skip) return { outcome: 'skipped-no-editions', date, sendReady: false, reason: issue.reason, generated: false };
  let selected = selectStories(day), local = inspectDeskEmailArt({ root, day, stories: selected });
  const commands = deskArtGenerationCommands(local, { kind: options.kind, stories: selected });
  const executions = [];
  if (options.generate) {
    if (local.rows.some(row => row.reasons.some(reason => /source-contract/.test(reason)))) throw new Error('Invalid article source path contract; repair the source before generation');
    for (const command of commands) {
      const result = deps.runGenerator
        ? await deps.runGenerator(command, { root })
        : spawnSync(process.execPath, command.args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 90 * 60_000, maxBuffer: 16 * 1024 * 1024 });
      if (result?.status !== 0) throw new Error(`Art preparation failed for ${command.kind}; no email was sent`);
      executions.push({ kind: command.kind, stories: command.stories, status: result.status });
      artifactRoot = result.artifactRoot || path.join(root, '.cache', 'desk-art-staging', '_wt');
    }
    // The art worker publishes from its own origin/main worktree. Never pull,
    // reset or silently replace files in the caller's possibly dirty checkout.
    day = readDay(artifactRoot, date);issue = buildDigest(day, { date });
    if (issue.skip) throw new Error('Published art artifact lacks the requested issue');
    selected = selectStories(day);local = inspectDeskEmailArt({ root: artifactRoot, day, stories: selected });
  }
  let live = null;
  if (options.verifyLive || options.generate) {
    live = await verifyDeskEmailArt(local, { fetchImpl: deps.fetchImpl || fetch });
    const current = inspectDeskEmailArt({ root: artifactRoot, day, stories: selected });
    if (current.snapshot !== local.snapshot) throw new Error('Art changed during verification; prepare again');
  }
  const outDir = deps.outDir || path.join(root, '.cache', 'desk-email');
  fs.mkdirSync(outDir, { recursive: true });
  if (!deps.outDir && !fs.existsSync(path.join(outDir, '.gitignore'))) fs.writeFileSync(path.join(outDir, '.gitignore'), '*\n');
  const htmlPath = path.join(outDir, `${date}.html`);
  fs.writeFileSync(htmlPath, renderHtml(issue));fs.writeFileSync(htmlPath.replace(/\.html$/, '.txt'), renderText(issue));
  const report = {
    outcome: local.ready && live?.ready ? 'send-ready' : local.ready ? 'local-art-ready' : 'images-pending',
    date, generated: executions.length > 0, localReady: local.ready, liveVerified: live?.ready === true,
    sendReady: local.ready && live?.ready === true, noEmailSent: true,
    artifactPlane: artifactRoot === root ? 'caller-checkout' : 'art-worker-published-worktree',
    preview: path.relative(root, htmlPath).replaceAll('\\', '/'),
    scope: 'Selected issue images only. Readiness is rechecked by actual dispatch; this report is not permission to send.',
    local, live, commands, executions,
    next: `node scripts/prepare-desk-email.mjs --date ${date}${local.ready ? ' --verify-live' : ' --generate'}`,
  };
  fs.writeFileSync(path.join(outDir, `${date}.json`), JSON.stringify(report, null, 2) + '\n');
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await prepareDeskEmail();
    console.log(result.help || JSON.stringify(result, null, 2));
    if ((process.argv.includes('--generate') || process.argv.includes('--verify-live')) && result.outcome !== 'skipped-no-editions' && !result.sendReady) process.exitCode = 1;
  } catch (error) { console.error(`Desk email preparation: ${error.message}`);process.exitCode = 1; }
}
