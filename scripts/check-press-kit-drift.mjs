#!/usr/bin/env node
// Press Kit drift detector.
// Verifies press/index.html portfolio counts stay in sync with api/public-intelligence.json.
// Exits non-zero when drift is found (so it gates build:check).
//
// Usage:
//   node scripts/check-press-kit-drift.mjs          # human report
//   node scripts/check-press-kit-drift.mjs --check  # exit-non-zero-on-drift

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot  = path.resolve(__dirname, '..');
const checkMode = process.argv.slice(2).includes('--check');

const pressPath = path.join(repoRoot, 'press', 'index.html');
const pubIntPath = path.join(repoRoot, 'api', 'public-intelligence.json');

if (!fs.existsSync(pressPath)) {
  console.log('press-kit-drift · press/index.html not present — skipping');
  process.exit(0);
}
if (!fs.existsSync(pubIntPath)) {
  console.error('press-kit-drift · api/public-intelligence.json missing');
  process.exit(1);
}

const html = fs.readFileSync(pressPath, 'utf8');
const pub  = JSON.parse(fs.readFileSync(pubIntPath, 'utf8'));
const p    = pub.portfolio || {};

const expected = {
  total:   Number(p.total),
  sparked: Number(p.sparked),
  forge:   Number(p.forge),
  vaulted: Number(p.vaulted),
};

for (const [k, v] of Object.entries(expected)) {
  if (!Number.isFinite(v)) {
    console.error(`press-kit-drift · public-intelligence.portfolio.${k} missing or non-numeric`);
    process.exit(1);
  }
}

// Pin 1: structured Portfolio row — "N initiatives · N sparked · N in the forge · N vaulted"
const rowRegex = /(\d+)\s+initiatives\s*(?:&middot;|·)\s*(\d+)\s+sparked\s*(?:&middot;|·)\s*(\d+)\s+in\s+the\s+forge\s*(?:&middot;|·)\s*(\d+)\s+vaulted/i;
const rowMatch = html.match(rowRegex);

// Pin 2: vault banner — "N initiatives under the vault banner"
const bannerRegex = /(\d+)\s+initiatives\s+under\s+the\s+vault\s+banner/i;
const bannerMatch = html.match(bannerRegex);

// Pin 3: bio prose — "N initiatives across games..." (digits) or "<Word> are sparked... <word> more in active forge" (word-spelled).
// Catches prose drift on the Short Bio paragraph that Pin 1/2's digit-only regex can't reach.
const NUM_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
};
const wordNum = (s) => {
  if (s == null) return null;
  const k = s.toString().toLowerCase();
  if (/^\d+$/.test(k)) return Number(k);
  return NUM_WORDS[k] ?? null;
};

const bioTotalRegex   = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+initiatives\s+across\b/i;
const bioSparkedRegex = /\b(\d+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten)\s+are\s+sparked\b/;
const bioForgeRegex   = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+more\s+in\s+active\s+forge\b/i;

const bioTotal   = html.match(bioTotalRegex);
const bioSparked = html.match(bioSparkedRegex);
const bioForge   = html.match(bioForgeRegex);

const findings = [];

if (!rowMatch) {
  findings.push('Portfolio row not found (expected pattern "N initiatives · N sparked · N in the forge · N vaulted")');
} else {
  const [, total, sparked, forge, vaulted] = rowMatch.map(Number);
  if (total   !== expected.total)   findings.push(`Portfolio row: total ${total} ≠ public-intelligence ${expected.total}`);
  if (sparked !== expected.sparked) findings.push(`Portfolio row: sparked ${sparked} ≠ public-intelligence ${expected.sparked}`);
  if (forge   !== expected.forge)   findings.push(`Portfolio row: forge ${forge} ≠ public-intelligence ${expected.forge}`);
  if (vaulted !== expected.vaulted) findings.push(`Portfolio row: vaulted ${vaulted} ≠ public-intelligence ${expected.vaulted}`);
}

if (!bannerMatch) {
  findings.push('Vault banner count not found (expected pattern "N initiatives under the vault banner")');
} else {
  const total = Number(bannerMatch[1]);
  if (total !== expected.total) findings.push(`Vault banner (press): total ${total} ≠ public-intelligence ${expected.total}`);
}

// Extended sweep — the "N initiatives" vault banner appears on the homepage
// and studio-pulse (Forge Window). Pin those too so portfolio-count drift
// can't hide on other public surfaces.
const OTHER_BANNER_FILES = [
  { file: 'index.html',              label: 'homepage'      },
  { file: 'studio-pulse/index.html', label: 'studio-pulse'  },
];
// Any "N initiatives" phrasing on these pages that should match expected.total:
//   - "N initiatives under the vault banner"
//   - "N initiatives. One vault."  (homepage teaser heading)
const extendedBannerRegex = /(\d+)\s+initiatives(?:\s+under\s+the\s+vault\s+banner|\.\s+one\s+vault)/ig;
for (const { file, label } of OTHER_BANNER_FILES) {
  const p = path.join(repoRoot, file);
  if (!fs.existsSync(p)) continue;
  const body = fs.readFileSync(p, 'utf8');
  const matches = [...body.matchAll(extendedBannerRegex)];
  if (matches.length === 0) {
    findings.push(`${label} (${file}): no "N initiatives …" banner found (pin expects it)`);
    continue;
  }
  for (const m of matches) {
    const n = Number(m[1]);
    if (n !== expected.total) findings.push(`${label} (${file}): "${m[0]}" total ${n} ≠ public-intelligence ${expected.total}`);
  }
}

// Bio prose pins — each is optional (bio paragraph may be rewritten), but if present they must match.
if (bioTotal) {
  const n = wordNum(bioTotal[1]);
  if (n !== null && n !== expected.total) findings.push(`Bio prose: "${bioTotal[1]} initiatives across ..." ≠ public-intelligence ${expected.total}`);
}
if (bioSparked) {
  const n = wordNum(bioSparked[1]);
  if (n !== null && n !== expected.sparked) findings.push(`Bio prose: "${bioSparked[1]} are sparked" ≠ public-intelligence ${expected.sparked}`);
}
if (bioForge) {
  const n = wordNum(bioForge[1]);
  if (n !== null && n !== expected.forge) findings.push(`Bio prose: "${bioForge[1]} more in active forge" ≠ public-intelligence ${expected.forge}`);
}

if (findings.length === 0) {
  console.log(`portfolio-count-drift · clean (portfolio: ${expected.total} total · ${expected.sparked} sparked · ${expected.forge} forge · ${expected.vaulted} vaulted · press kit + homepage + studio-pulse verified)`);
  process.exit(0);
}

console.error('portfolio-count-drift · drift detected across public surfaces:');
for (const f of findings) console.error(`  - ${f}`);
console.error(`\nFix: update hardcoded counts to match api/public-intelligence.json portfolio block:`);
console.error(`  ${expected.total} initiatives · ${expected.sparked} sparked · ${expected.forge} in the forge · ${expected.vaulted} vaulted`);

process.exit(checkMode ? 1 : 0);
