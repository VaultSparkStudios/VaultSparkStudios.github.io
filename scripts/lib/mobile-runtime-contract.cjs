const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'iphone-se', width: 360, height: 640, isMobile: true },
  { name: 'iphone-14', width: 390, height: 844, isMobile: true },
  { name: 'iphone-pro-max', width: 430, height: 932, isMobile: true },
  { name: 'ipad-portrait', width: 768, height: 1024, isMobile: false },
  { name: 'ipad-landscape', width: 1024, height: 768, isMobile: false },
];

const PAGES = [
  ['home','/'],['games-landing','/games/'],['game-cod','/games/call-of-doodie/'],['game-gridiron','/games/gridiron-gm/'],['game-solara','/games/solara/'],['game-vaultfront','/games/vaultfront/'],['game-mindframe','/games/mindframe/'],['game-the-exodus','/games/the-exodus/'],['game-unknown','/games/project-unknown/'],['game-vs-fb-gm','/games/franchise-architect/'],['projects-landing','/projects/'],['project-vorn','/projects/vorn/'],['project-velaxis','/projects/velaxis/'],['project-promogrind','/projects/promogrind/'],['project-statvault','/projects/statvault/'],['project-canon','/projects/canon/'],['project-ideaforge','/projects/ideaforge/'],['project-living','/projects/the-living-protocol/'],['project-signal','/projects/signal-log/'],['project-vmember','/projects/vault-member/'],['project-vpipe','/projects/vault-pipeline/'],['universe-landing','/universe/'],['universe-voidfall','/universe/voidfall/'],['universe-dreadspike','/universe/dreadspike/'],['membership','/membership/'],['how-we-build','/how-we-build/'],['vault-member','/vault-member/'],['studio','/studio/'],['studio-hub','/studio-hub/'],['studio-pulse','/studio-pulse/'],['ignis','/ignis/'],['leaderboards','/leaderboards/'],['journal','/journal/'],['journal-post','/journal/vault-opened/'],['contact','/contact/'],['faq','/faq/'],['roadmap','/roadmap/'],['press','/press/'],['changelog','/changelog/'],['status','/status/'],['notebook','/notebook/'],['community','/community/'],['pathway-players','/pathways/players/'],
// S334: this audit probes PRODUCTION (playwright baseURL defaults to
// https://vaultsparkstudios.com), so a route can only be listed here once it is
// live. `/evidence/` was added before its first deploy and returned P0
// page-did-not-load on all five viewports — the page was fine, it just did not
// exist yet at the origin being measured. Add it back in the session AFTER the
// deploy that ships it.

].map(([id, url]) => ({ id, url }));

function matrixKey(record) { return `${record.url}|${record.viewport}`; }

function validateRecords(records, pages = PAGES, viewports = VIEWPORTS) {
  const errors = [];
  const expected = new Set(pages.flatMap((page) => viewports.map((viewport) => `${page.url}|${viewport.name}`)));
  const seen = new Set();
  for (const record of records) {
    const key = matrixKey(record);
    if (!expected.has(key)) errors.push(`unexpected matrix cell ${key}`);
    if (seen.has(key)) errors.push(`duplicate matrix cell ${key}`);
    seen.add(key);
    const blocking = (record.issues || []).filter((issue) => issue.severity === 'P0' || issue.severity === 'P1');
    if (blocking.length) errors.push(`${key}: ${blocking.map((issue) => `${issue.severity} ${issue.type}`).join(', ')}`);
  }
  for (const key of expected) if (!seen.has(key)) errors.push(`missing matrix cell ${key}`);
  return errors;
}

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

// S373 (founder-approved, D-S373.6): routine Desk content inside a reviewed article.
//
// Scheduled Desk lanes (edition publisher, art autopilot) rewrite the "More from The
// Desk" list in every recent article several times a day and run no E2E. A receipt that
// hashed those bytes went stale within hours; S372 lost five E2E runs to it without any
// reviewed surface changing.
//
// The block is NOT simply left out. For a dated Desk article with exactly one such
// block, the receipt hashes the page with the block replaced by a fixed marker and
// records the block's own digest beside it. The checker then requires proof that the
// article is byte-for-byte what the generator renders from the committed Desk data
// (see check-receipt-ordering). So every byte is either hashed here or proven derived
// by a generator that is itself a bound source, and a hand edit or corrupted block
// fails that proof. Any other shape (no block, two blocks, a non-article path) is hashed
// whole, exactly as before. Writers and the checker share this one function.
const DESK_ARTICLE_RE = /^news\/\d{4}-\d{2}-\d{2}\/[^/]+\/index\.html$/;
const DESK_ROUTINE_REGION_RE = /<section class="desk-more"[^>]*>[\s\S]*?<\/section>/g;
const DESK_ROUTINE_REGION_MARKER = '<section class="desk-more" data-binding="routine-region-v1"></section>';

/** The single routine block of a dated Desk article, or null when the rule does not apply. */
function routineRegion(relative, bytes) {
  const rel = String(relative).replace(/\\/g, '/');
  if (!DESK_ARTICLE_RE.test(rel) || bytes.includes(0)) return null;
  // latin1 maps bytes 1:1, so slicing and re-encoding never alters a byte.
  const text = bytes.toString('latin1');
  const regions = text.match(DESK_ROUTINE_REGION_RE);
  if (!regions || regions.length !== 1) return null;
  return { text, region: regions[0] };
}

/** Bytes a receipt binds for `relative`: the file itself, or the article with its routine block marked. */
function bindingBytes(relative, bytes) {
  const found = routineRegion(relative, bytes);
  if (!found) return bytes;
  return Buffer.from(found.text.replace(found.region, DESK_ROUTINE_REGION_MARKER), 'latin1');
}

/** sha256 of the routine block alone, or null. Recorded so routine drift is visible, never silent. */
function routineRegionDigest(relative, bytes) {
  const found = routineRegion(relative, bytes);
  return found ? crypto.createHash('sha256').update(Buffer.from(found.region, 'latin1')).digest('hex') : null;
}

function bindingDigest(root, relative) {
  return crypto.createHash('sha256').update(bindingBytes(relative, fs.readFileSync(path.join(root, relative)))).digest('hex');
}

function sourceBinding(root, files) {
  const normalized = [...new Set(files)].sort();
  const hash = crypto.createHash('sha256');
  const entries = [];
  for (const relative of normalized) {
    const raw = fs.readFileSync(path.join(root, relative));
    const bytes = bindingBytes(relative, raw);
    hash.update(relative.replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(bytes);
    hash.update('\0');
    const entry = { path: relative.replace(/\\/g, '/'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    const routine = routineRegionDigest(relative, raw);
    if (routine) entry.routineRegionSha256 = routine;
    entries.push(entry);
  }
  return { algorithm: 'sha256', sha256: hash.digest('hex'), files: normalized, entries };
}

function candidateBinding(root) {
  const relative = 'api/candidate-artifact-manifest.json';
  const absolute = path.join(root, relative);
  const bytes = fs.readFileSync(absolute);
  const manifest = JSON.parse(bytes.toString('utf8'));
  return {
    manifest: relative,
    manifestSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    candidateSha: manifest.candidateSha || null,
    root: manifest.root,
  };
}

function validateReceipt(receipt, { root, records }) {
  const errors = validateRecords(records, receipt?.matrix?.routes || [], receipt?.matrix?.viewports || []);
  const expected = (receipt?.matrix?.routes?.length || 0) * (receipt?.matrix?.viewports?.length || 0);
  if (receipt?.matrix?.expectedProbes !== expected || receipt?.matrix?.completedProbes !== records.length) errors.push('receipt matrix counts do not match findings');
  if (!receipt?.source?.files?.length) errors.push('receipt source binding is missing');
  else if (sourceBinding(root, receipt.source.files).sha256 !== receipt.source.sha256) errors.push('receipt is stale for current runtime source');
  for (const capture of receipt?.captures || []) {
    const absolute = path.join(root, capture.file || '');
    if (!fs.existsSync(absolute)) errors.push(`${capture.file}: capture missing`);
    else if (sha256File(absolute) !== capture.sha256) errors.push(`${capture.file}: capture sha256 mismatch`);
  }
  return errors;
}

module.exports = { PAGES, VIEWPORTS, DESK_ROUTINE_REGION_MARKER, bindingBytes, bindingDigest, candidateBinding, routineRegionDigest, sha256File, sourceBinding, validateReceipt, validateRecords };
