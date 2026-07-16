// scripts/update-footer.mjs — add Projects column + Forge game links to sitewide footer
// Usage: node scripts/update-footer.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.cache', 'scripts', 'assets', 'data', 'api', 'ignis', 'logs', 'context', 'docs', 'prompts']);

// Exact old Games column (10-space indent)
const OLD_GAMES_COL = `          <h4>Games</h4>
          <a href="/games/">All Games</a>
          <a href="/games/call-of-doodie/">Call Of Doodie</a>
          <a href="/games/gridiron-gm/">Gridiron GM</a>
          <a href="/games/vaultspark-football-gm/">Franchise Architect</a>
          <a href="/leaderboards/">Leaderboards</a>
          <a href="/community/">Community Hub</a>
        </div>`;

// Updated Games column + new Projects column
const NEW_COLS = `          <h4>Games</h4>
          <a href="/games/">All Games</a>
          <a href="/games/call-of-doodie/">Call Of Doodie</a>
          <a href="/games/gridiron-gm/">Gridiron GM</a>
          <a href="/games/vaultspark-football-gm/">Franchise Architect</a>
          <a href="/games/vaultfront/">VaultFront</a>
          <a href="/games/solara/">Solara</a>
          <a href="/games/mindframe/">MindFrame</a>
          <a href="/games/the-exodus/">The Exodus</a>
          <a href="/leaderboards/">Leaderboards</a>
          <a href="/community/">Community Hub</a>
        </div>
        <div class="footer-col">
          <h4>Projects</h4>
          <a href="/projects/">All Projects</a>
          <a href="/projects/promogrind/">PromoGrind</a>
          <a href="/projects/velaxis/">Velaxis</a>
          <a href="/projects/vorn/">Vorn</a>
          <a href="/projects/ideaforge/">IdeaForge</a>
          <a href="/projects/statvault/">StatVault</a>
          <a href="/projects/obelisk/">Obelisk</a>
        </div>`;

function walkHtml(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        if (!SKIP_DIRS.has(entry)) walkHtml(full, results);
      } else if (entry === 'index.html') {
        results.push(full);
      }
    } catch {}
  }
  return results;
}

const files = walkHtml(ROOT);
console.log(`Scanning ${files.length} HTML files…`);

let updated = 0;
let skipped = 0;
let alreadyDone = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<footer')) { skipped++; continue; }
  // Check if the Games footer column has already been updated (has /games/vaultfront/ inside footer)
  const footerStart = html.indexOf('<footer');
  const footerEnd = html.indexOf('</footer>') + 9;
  const footerSection = html.slice(footerStart, footerEnd);
  if (footerSection.includes('/games/vaultfront/')) { alreadyDone++; continue; }
  if (!html.includes(OLD_GAMES_COL)) {
    const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
    console.log(`  - no match: ${rel}`);
    skipped++;
    continue;
  }
  const next = html.replace(OLD_GAMES_COL, NEW_COLS);
  writeFileSync(file, next);
  const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  console.log(`  ✓ ${rel}`);
  updated++;
}

console.log(`\nDone — ${updated} updated · ${alreadyDone} already done · ${skipped} skipped.`);
