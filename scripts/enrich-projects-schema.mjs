// scripts/enrich-projects-schema.mjs
// Adds/enriches JSON-LD schema for project pages:
//   1. projects/index.html — ItemList of all on-site project pages
//   2. 3 project pages missing SoftwareApplication/WebApplication schema
// Usage: node scripts/enrich-projects-schema.mjs [--check]

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const CHECK = process.argv.includes('--check');
const PROD = 'https://vaultsparkstudios.com';
const PUBLISHER = { '@type': 'Organization', name: 'VaultSpark Studios', url: PROD };

function parseSchemaBlocks(html) {
  const blocks = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push({ raw: m[0], data: JSON.parse(m[1]) }); } catch {}
  }
  return blocks;
}

function insertSchemaAfterBreadcrumb(html, newBlock) {
  // Keep durable schema outside the replaceable speculation-rules marker.
  // The old “last </script>” insertion landed inside that marker once
  // speculation rules became the final head script; propagate-nav then
  // refreshed the marker and silently erased all project enrichment.
  const headEnd = html.indexOf('</head>');
  if (headEnd === -1) return html;
  const speculationStart = html.indexOf('<!-- vs-speculation:start -->');
  const insertAt = speculationStart !== -1 && speculationStart < headEnd ? speculationStart : headEnd;
  return html.slice(0, insertAt) + newBlock + '\n' + html.slice(insertAt);
}

function ogMeta(html, key) {
  const m = html.match(new RegExp('property="' + key + '"[^>]*content="([^"]+)"'));
  return m ? m[1] : '';
}

// ── 1. Build ItemList for projects/index.html ─────────────────────────────────
function buildProjectsItemList() {
  const pRoot = join(root, 'projects');
  const dirs = readdirSync(pRoot).filter(d => statSync(join(pRoot, d)).isDirectory());
  const items = [];

  dirs.forEach((slug, i) => {
    const file = join(pRoot, slug, 'index.html');
    if (!existsSync(file)) return;
    const html = readFileSync(file, 'utf8');
    const nameM = html.match(/property="og:title"[^>]*content="([^"]+)"/);
    const name = nameM ? nameM[1].split('|')[0].split('—')[0].trim() : slug;
    items.push({
      '@type': 'ListItem',
      position: i + 1,
      name: name,
      url: PROD + '/projects/' + slug + '/',
    });
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'VaultSpark Studios — Projects',
    description: 'Tools, platforms, and software projects built at VaultSpark Studios. From AI-powered tools to creative platforms.',
    url: PROD + '/projects/',
    publisher: PUBLISHER,
    hasPart: items.map(item => ({
      '@type': 'WebPage',
      name: item.name,
      url: item.url,
    })),
  };
}

// ── 2. Per-page patches for the 3 missing pages ───────────────────────────────
const PAGE_PATCHES = {
  'signal-log': () => ({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Signal Log — VaultSpark Dev Journal',
    description: 'The VaultSpark dev journal. Build notes, update logs, and dispatches from inside the forge.',
    url: PROD + '/projects/signal-log/',
    publisher: PUBLISHER,
    inLanguage: 'en',
  }),
  'vault-member': () => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Vault Member System',
    description: 'Cross-game identity and progress layer for VaultSpark Studios. Vault ranks, achievements, newsletter preferences, and early access — one account across every VaultSpark title.',
    url: PROD + '/projects/vault-member/',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Any (modern web browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: PUBLISHER,
  }),
  'vault-pipeline': () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'VaultSpark Pipeline',
    description: 'The VaultSpark Studios public development roadmap. Track what is shipping, what is in the forge, and what is queued for the next cycle.',
    url: PROD + '/projects/vault-pipeline/',
    applicationCategory: 'DeveloperApplication',
    publisher: PUBLISHER,
  }),
};

let patched = 0;
let upToDate = 0;
let warnings = 0;

// Process projects/index.html
(function patchProjectsIndex() {
  const file = join(root, 'projects', 'index.html');
  if (!existsSync(file)) { console.warn('SKIP projects/index.html: not found'); return; }

  const html = readFileSync(file, 'utf8');
  const blocks = parseSchemaBlocks(html);
  const hasCollection = blocks.some(b => b.data['@type'] === 'CollectionPage');

  if (hasCollection) {
    if (CHECK) console.log('OK   projects/index.html: CollectionPage already present');
    else console.log('OK   projects/index.html: already enriched');
    upToDate++;
    return;
  }

  if (CHECK) {
    console.error('FAIL projects/index.html: missing CollectionPage JSON-LD');
    warnings++;
    return;
  }

  const schema = buildProjectsItemList();
  const block = '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n</script>';
  const newHtml = insertSchemaAfterBreadcrumb(html, block);

  if (newHtml === html) {
    console.warn('WARN projects/index.html: no insertion point found');
    warnings++;
    return;
  }

  writeFileSync(file, newHtml, 'utf8');
  console.log('PATCHED projects/index.html: added CollectionPage with ' + schema.hasPart.length + ' projects');
  patched++;
}());

// Process the 3 missing pages
for (const [slug, buildSchema] of Object.entries(PAGE_PATCHES)) {
  const file = join(root, 'projects', slug, 'index.html');
  if (!existsSync(file)) { console.warn('SKIP ' + slug + ': not found'); continue; }

  const html = readFileSync(file, 'utf8');
  const blocks = parseSchemaBlocks(html);
  const targetType = buildSchema()['@type'];
  const hasTarget = blocks.some(b => b.data['@type'] === targetType);

  if (hasTarget) {
    if (CHECK) console.log('OK   projects/' + slug + ': ' + targetType + ' already present');
    upToDate++;
    continue;
  }

  if (CHECK) {
    console.error('FAIL projects/' + slug + ': missing ' + targetType + ' schema');
    warnings++;
    continue;
  }

  const schema = buildSchema();
  const block = '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n</script>';
  const newHtml = insertSchemaAfterBreadcrumb(html, block);

  if (newHtml === html) {
    console.warn('WARN projects/' + slug + ': no insertion point found');
    warnings++;
    continue;
  }

  writeFileSync(file, newHtml, 'utf8');
  console.log('PATCHED projects/' + slug + ': added ' + targetType);
  patched++;
}

console.log('\nSummary: ' + patched + ' patched, ' + upToDate + ' up-to-date, ' + warnings + ' warnings');

if (CHECK && warnings > 0) {
  console.error('build:check FAIL — project schema gaps detected');
  process.exit(1);
}
