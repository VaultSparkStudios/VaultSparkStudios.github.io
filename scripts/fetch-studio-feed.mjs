#!/usr/bin/env node
// fetch-studio-feed.mjs
// Build-time fetch of vaultspark-studio-ops compiled feeds. Writes
// `data/studio-feed.json` (a unified bundle of WEBSITE_FEED.json +
// CONSUMER_ADOPTION_PACK.json) so the static site can surface project list
// and JSON-LD structured data without a runtime cross-origin call.
// Closes #109 (consumer adoption) for the public website.
//
// Usage: node scripts/fetch-studio-feed.mjs [--check] [--local <path>]
//   default: fetches feeds from raw.githubusercontent.com and writes
//            data/studio-feed.json
//   --check: read-only — fails if the on-disk bundle is missing or stale (>7d)
//   --local <path>: read feeds from a local studio-ops checkout instead of
//                   the network (path/to/vaultspark-studio-ops). Useful when
//                   the studio-ops repo is private and raw.githubusercontent.com
//                   returns 404. Also auto-detected via VAULTSPARK_OPS_LOCAL env.
//
// Failure modes:
//   - On HTTP 4xx/5xx: falls back to local mirror if available, else writes a
//     stub bundle (with `degraded: true`) so the build does not break.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join, isAbsolute, resolve as resolvePath } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

const FEED_RAW_BASE =
  "https://raw.githubusercontent.com/VaultSparkStudios/vaultspark-studio-ops/main/portfolio/compiled";
const WEBSITE_FEED_NAME = "WEBSITE_FEED.json";
const ADOPTION_PACK_NAME = "CONSUMER_ADOPTION_PACK.json";
const WEBSITE_FEED_URL = `${FEED_RAW_BASE}/${WEBSITE_FEED_NAME}`;
const ADOPTION_PACK_URL = `${FEED_RAW_BASE}/${ADOPTION_PACK_NAME}`;
const OUT_PATH = join(ROOT, "data", "studio-feed.json");
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const argv = process.argv.slice(2);
const args = new Set(argv);
const checkOnly = args.has("--check");
function flagValue(name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  return v && !v.startsWith("--") ? v : null;
}
const localOpsRoot = flagValue("--local") || process.env.VAULTSPARK_OPS_LOCAL || null;

if (checkOnly) {
  if (!existsSync(OUT_PATH)) {
    console.error(`✗ ${OUT_PATH} missing — run \`node scripts/fetch-studio-feed.mjs\``);
    process.exit(1);
  }
  const bundle = JSON.parse(readFileSync(OUT_PATH, "utf8"));
  const ageMs = Date.now() - new Date(bundle.fetchedAt || 0).getTime();
  if (ageMs > STALE_MS) {
    console.error(`✗ ${OUT_PATH} is ${(ageMs / 86400000).toFixed(1)}d old — refresh required`);
    process.exit(1);
  }
  if (bundle.degraded) {
    console.error(`✗ ${OUT_PATH} marked degraded — last fetch failed (${bundle.error || "unknown"})`);
    process.exit(1);
  }
  console.log(`✓ studio-feed.json fresh (${(ageMs / 86400000).toFixed(1)}d old)`);
  process.exit(0);
}

function readLocal(name) {
  if (!localOpsRoot) return null;
  const root = isAbsolute(localOpsRoot) ? localOpsRoot : resolvePath(process.cwd(), localOpsRoot);
  const p = join(root, "portfolio", "compiled", name);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

async function fetchJsonRemote(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function loadFeed(name, url) {
  const local = readLocal(name);
  if (local) return { data: local, source: "local" };
  try {
    const data = await fetchJsonRemote(url);
    return { data, source: "remote" };
  } catch (err) {
    return { data: null, source: "failed", error: err.message };
  }
}

const [website, adoption] = await Promise.all([
  loadFeed(WEBSITE_FEED_NAME, WEBSITE_FEED_URL),
  loadFeed(ADOPTION_PACK_NAME, ADOPTION_PACK_URL),
]);

const degraded = !website.data || !adoption.data;
const bundle = {
  _consumer: "vaultsparkstudios-website",
  fetchedAt: new Date().toISOString(),
  sources: {
    websiteFeed: WEBSITE_FEED_URL,
    adoptionPack: ADOPTION_PACK_URL,
    websiteFeedSource: website.source,
    adoptionPackSource: adoption.source,
  },
  websiteFeed: website.data,
  adoptionPack: adoption.data,
  ...(degraded ? { degraded: true, error: website.error || adoption.error || "fetch failed" } : {}),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 2) + "\n", "utf8");

if (degraded) {
  console.error(
    `⚠ data/studio-feed.json written degraded — website=${website.source} adoption=${adoption.source}` +
      `${bundle.error ? ` (${bundle.error})` : ""}`
  );
  process.exitCode = 1;
} else {
  const projectCount = Array.isArray(website.data?.projects) ? website.data.projects.length : 0;
  console.log(
    `✓ data/studio-feed.json written — ${projectCount} project(s), adoption-pack schema ` +
      `${adoption.data?._schema ?? "?"} (sources: website=${website.source} adoption=${adoption.source})`
  );
}
