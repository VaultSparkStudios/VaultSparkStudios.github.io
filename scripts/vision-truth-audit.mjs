#!/usr/bin/env node
// vision-truth-audit.mjs — Max-plan variant (S134)
//
// Captures screenshots + canonical-truth manifests for each project page.
// The actual vision analysis is done by the session agent (Claude Code on the
// founder's Max plan, with native multimodal Read), NOT by a paid Anthropic API
// call. Output is a kit the agent can review in-session:
//
//   .cache/vision-audit/manifest.json     # per-page truth + screenshot path
//   .cache/vision-audit/<slug>-<dev>.png  # screenshots
//
// The agent then reads each PNG, compares against the manifest, and writes
// docs/VISION_AUDIT_S134.md.
//
// Usage:
//   node scripts/vision-truth-audit.mjs                 # capture all desktop screenshots
//   node scripts/vision-truth-audit.mjs --device mobile # mobile viewport
//   node scripts/vision-truth-audit.mjs --pages games/solara,projects/canon
//   node scripts/vision-truth-audit.mjs --base-url https://vaultsparkstudios.com  # audit live site

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from './lib/safe-spawn.mjs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const devRoot = process.env.STUDIO_DEV_ROOT || path.resolve(repoRoot, '..');
const opsRoot = path.join(devRoot, 'vaultspark-studio-ops');

// ---------- args ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, fb) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : fb; };

const pagesArg = opt('--pages', null);
const device = opt('--device', 'desktop');
const baseUrlArg = opt('--base-url', null);
const headed = flag('--headed');

// ---------- registry / voices ----------
function readJSON(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

const registry = readJSON(path.join(opsRoot, 'portfolio', 'PROJECT_REGISTRY.json'));
const projectsBySlug = {};
for (const p of registry?.projects ?? []) projectsBySlug[p.slug] = p;

const voicesData = readJSON(path.join(repoRoot, 'ignis', 'output', 'project-voices.json'));
const pulseData = readJSON(path.join(repoRoot, 'ignis', 'output', 'portfolio-pulse.json'));

// kept in sync with propagate-ignis-blocks.mjs PAGES
const ALL_PAGES = [
  { page: 'games/call-of-doodie',         slug: 'call-of-doodie',         folder: 'Call-Of-Doodie',         pulse: 'Call-Of-Doodie',                voice: 'call-of-doodie' },
  { page: 'games/gridiron-gm',            slug: 'gridiron-gm',            folder: 'Gridiron-GM',            pulse: 'Gridiron-GM',                   voice: 'gridiron-gm' },
  { page: 'games/mindframe',              slug: 'mindframe',              folder: 'mindframe',              pulse: 'MindFrame',                     voice: 'mindframe' },
  { page: 'games/solara',                 slug: 'solara',                 folder: 'Solara',                 pulse: 'Solara',                        voice: 'solara' },
  { page: 'games/the-exodus',             slug: 'the-exodus',             folder: 'The-Exodus',             pulse: 'The Exodus',                    voice: 'the-exodus' },
  { page: 'games/vaultfront',             slug: 'vaultfront',             folder: 'VaultFront',             pulse: 'VaultFront',                    voice: 'vaultfront' },
  { page: 'games/franchise-architect', slug: 'franchise-architect', folder: 'Franchise Architect', pulse: 'Franchise Architect',        voice: 'franchise-architect' },
  { page: 'projects/canon',               slug: 'canon',                  folder: 'Canon',                  pulse: 'CANON',                         voice: 'canon' },
  { page: 'projects/ideaforge',           slug: 'ideaforge',              folder: 'IdeaForge',              pulse: 'IdeaForge',                     voice: 'ideaforge' },
  { page: 'projects/promogrind',          slug: 'promogrind',             folder: 'PromoGrind',             pulse: 'PromoGrind',                    voice: 'promogrind' },
  { page: 'projects/statvault',           slug: 'statvault',              folder: 'StatVault',              pulse: 'StatVault',                     voice: 'statvault' },
  { page: 'projects/velaxis',             slug: 'velaxis',                folder: 'Velaxis',                pulse: 'Velaxis',                       voice: 'velaxis' },
  { page: 'projects/vorn',                slug: 'vorn',                   folder: 'Vorn',                   pulse: 'Vorn',                          voice: 'vorn' },
  { page: 'projects/voidfall',            slug: 'voidfall',               folder: 'Voidfall',               pulse: 'Voidfall',                      voice: 'voidfall' },
  { page: 'projects/seamline',            slug: 'seamline',               folder: 'Seamline',               pulse: 'Seamline',                      voice: 'seamline' },
  { page: 'oracle',                       slug: '__oracle__',             folder: null,                     pulse: null,                            voice: null },
];

const targets = pagesArg
  ? pagesArg.split(',').map(s => s.trim()).map(p => ALL_PAGES.find(e => e.page === p)).filter(Boolean)
  : ALL_PAGES;

if (!targets.length) { console.error('No pages matched --pages.'); process.exit(1); }

// ---------- truth ----------
function siblingStatus(folder) {
  if (!folder) return {};
  return readJSON(path.join(devRoot, folder, 'context', 'PROJECT_STATUS.json')) || {};
}

function buildTruth(entry) {
  if (entry.slug === '__oracle__') {
    return {
      page: entry.page, slug: 'oracle', name: 'Ecosystem Oracle', vaultStatus: null,
      canonicalLiveUrl: null, health: null, currentFocus: null,
      expectedVoiceQuote: null,
      expectedSummary: 'Live cross-project intelligence feed. Filterable stats. One IGNIS block per project.',
    };
  }
  const reg = projectsBySlug[entry.slug] || {};
  const sib = siblingStatus(entry.folder);
  const voice = voicesData?.voices?.[entry.voice];
  const pulseEntry = pulseData?.entries?.find(e => e.name === entry.pulse);
  return {
    page: entry.page, slug: entry.slug, name: reg.name || entry.slug,
    canonicalLiveUrl: sib.liveUrl || sib.runtimeUrl || reg.runtimeUrl || null,
    vaultStatus: reg.vaultStatus || sib.status || 'forge',
    health: sib.health || pulseEntry?.health || 'unknown',
    currentFocus: sib.currentFocus || pulseEntry?.currentFocus || reg.currentFocus || null,
    nextMilestone: sib.nextMilestone || reg.nextMilestone || null,
    expectedVoiceQuote: voice?.quote || null,
    expectedSummary: reg.summary || reg.landing?.heroCopy || null,
  };
}

// ---------- preview server ----------
function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 1500 }, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function startPreview() {
  if (baseUrlArg) return { url: baseUrlArg, child: null };
  const port = 4173;
  const url = `http://127.0.0.1:${port}`;
  if (await ping(url + '/')) return { url, child: null };
  const child = spawn(process.execPath, [path.join(repoRoot, 'scripts', 'local-preview-server.mjs')], {
    cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, LOCAL_PREVIEW_PORT: String(port) },
  });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await ping(url + '/')) return { url, child };
  }
  throw new Error('preview server unreachable on ' + url);
}

// ---------- capture ----------
const viewport = device === 'mobile'
  ? { width: 390, height: 844 }
  : { width: 1280, height: 800 };

const outDir = path.join(repoRoot, '.cache', 'vision-audit');
fs.mkdirSync(outDir, { recursive: true });

console.log(`vision-truth-audit capture · device=${device} · pages=${targets.length}`);
const { url: baseUrl, child } = await startPreview();
console.log(`  preview: ${baseUrl}`);

const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: !headed });
const manifest = { generatedAt: new Date().toISOString(), baseUrl, device, viewport, pages: [] };

try {
  for (const entry of targets) {
    const truth = buildTruth(entry);
    const slugSafe = entry.page.replace(/\//g, '_');
    const pngPath = path.join(outDir, `${slugSafe}-${device}.png`);
    try {
      const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const url = `${baseUrl}/${entry.page}/`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25_000 });
      // Let IGNIS block JS fetch + render
      await page.waitForTimeout(1200);
      // Scroll a bit to ensure lazy assets fire
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      const buf = await page.screenshot({ fullPage: true });
      fs.writeFileSync(pngPath, buf);
      await ctx.close();
      const rel = path.relative(repoRoot, pngPath).split(path.sep).join('/');
      manifest.pages.push({ ...truth, screenshot: rel });
      console.log(`  ✓ ${entry.page}  → ${rel}  (${Math.round(buf.length / 1024)}KB)`);
    } catch (e) {
      manifest.pages.push({ ...truth, error: String(e.message || e) });
      console.log(`  ! ${entry.page}  ${e.message?.slice(0, 120)}`);
    }
  }
} finally {
  await browser.close();
  if (child) { try { child.kill(); } catch {} }
}

const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`\n✓ manifest → ${path.relative(repoRoot, manifestPath)}`);
console.log(`  captured: ${manifest.pages.filter(p => !p.error).length}/${manifest.pages.length}`);
console.log(`\nNext: the session agent reads each screenshot + manifest, writes docs/VISION_AUDIT_S134.md.`);
