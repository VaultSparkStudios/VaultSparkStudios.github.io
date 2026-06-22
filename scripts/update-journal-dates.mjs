// scripts/update-journal-dates.mjs — update all Signal Log post dates to include day
// Usage: node scripts/update-journal-dates.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SKIP = new Set(['archive', 'dispatches', '_drafts']);

// Step 1: collect all post dates from meta tags
const posts = {};
for (const d of readdirSync('journal')) {
  if (SKIP.has(d)) continue;
  const dir = join('journal', d);
  try { if (!statSync(dir).isDirectory()) continue; } catch { continue; }
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const m = html.match(/<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/);
  if (m) posts[d] = m[1];
}
console.log('Posts found:', Object.keys(posts));

function longDate(iso) {
  const [y, mo, day] = iso.slice(0,10).split('-').map(Number);
  return `${MONTHS[mo-1]} ${day}, ${y}`;
}
function shortDate(iso) {
  const [y, mo, day] = iso.slice(0,10).split('-').map(Number);
  return `${MONTHS_SHORT[mo-1]} ${day}, ${y}`;
}

let totalChanges = 0;

// Step 2: update each post file
for (const [slug, iso] of Object.entries(posts)) {
  const path = join('journal', slug, 'index.html');
  let html = readFileSync(path, 'utf8');
  const before = html;

  // Replace the main post-date span (one per file, belongs to this post)
  html = html.replace(
    /<span class="post-date">[^<]*<\/span>/,
    `<span class="post-date">${longDate(iso)}</span>`
  );

  // Update all archive-link <small> dates based on each linked slug's date
  for (const [otherSlug, otherIso] of Object.entries(posts)) {
    const href = `/journal/${otherSlug}/`;
    // Match <a ...href="/journal/SLUG/"...>...<small>DATE</small>...</a>
    html = html.replace(
      new RegExp(`(<a[^>]+href="${href.replace(/\//g,'\\/')}"[^>]*>[\\s\\S]*?)<small>[^<]*<\\/small>`, 'g'),
      `$1<small>${shortDate(otherIso)}</small>`
    );
  }

  if (html !== before) {
    writeFileSync(path, html);
    console.log(`  ✓ ${slug} → ${longDate(iso)}`);
    totalChanges++;
  } else {
    console.log(`  - ${slug} (no change)`);
  }
}

// Step 3: update journal/index.html entry-date spans
let indexHtml = readFileSync('journal/index.html', 'utf8');
const indexBefore = indexHtml;

// Each <article class="entry"> contains a link to /journal/SLUG/ — replace its entry-date span
indexHtml = indexHtml.replace(/<article class="entry"[\s\S]*?<\/article>/g, entryBlock => {
  const slugMatch = entryBlock.match(/href="\/journal\/([^/]+)\//);
  if (!slugMatch) return entryBlock;
  const slug = slugMatch[1];
  const iso = posts[slug];
  if (!iso) return entryBlock;
  return entryBlock.replace(
    /<span class="entry-date">[^<]*<\/span>/,
    `<span class="entry-date">${longDate(iso)}</span>`
  );
});

// Also update archive-link <small> dates in the journal index sidebar
for (const [slug, iso] of Object.entries(posts)) {
  const href = `/journal/${slug}/`;
  indexHtml = indexHtml.replace(
    new RegExp(`(<a[^>]+href="${href.replace(/\//g,'\\/')}"[^>]*>[\\s\\S]*?)<small>[^<]*<\\/small>`, 'g'),
    `$1<small>${shortDate(iso)}</small>`
  );
}

if (indexHtml !== indexBefore) {
  writeFileSync('journal/index.html', indexHtml);
  console.log('  ✓ journal/index.html');
  totalChanges++;
}

console.log(`\nDone — ${totalChanges} file(s) updated.`);
