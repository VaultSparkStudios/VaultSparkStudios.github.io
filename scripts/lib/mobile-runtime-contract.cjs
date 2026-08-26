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
  ['home','/'],['games-landing','/games/'],['game-cod','/games/call-of-doodie/'],['game-gridiron','/games/gridiron-gm/'],['game-solara','/games/solara/'],['game-vaultfront','/games/vaultfront/'],['game-mindframe','/games/mindframe/'],['game-the-exodus','/games/the-exodus/'],['game-unknown','/games/project-unknown/'],['game-vs-fb-gm','/games/franchise-architect/'],['projects-landing','/projects/'],['project-vorn','/projects/vorn/'],['project-velaxis','/projects/velaxis/'],['project-promogrind','/projects/promogrind/'],['project-statvault','/projects/statvault/'],['project-canon','/projects/canon/'],['project-ideaforge','/projects/ideaforge/'],['project-living','/projects/the-living-protocol/'],['project-signal','/projects/signal-log/'],['project-vmember','/projects/vault-member/'],['project-vpipe','/projects/vault-pipeline/'],['universe-landing','/universe/'],['universe-voidfall','/universe/voidfall/'],['universe-dreadspike','/universe/dreadspike/'],['membership','/membership/'],['membership-value','/membership-value/'],['vault-wall','/vault-wall/'],['vault-member','/vault-member/'],['vaultsparked','/vaultsparked/'],['studio','/studio/'],['studio-hub','/studio-hub/'],['studio-pulse','/studio-pulse/'],['ignis','/ignis/'],['leaderboards','/leaderboards/'],['leaderboard-global','/leaderboards/global/'],['journal','/journal/'],['journal-post','/journal/vault-opened/'],['contact','/contact/'],['join','/join/'],['faq','/faq/'],['roadmap','/roadmap/'],['press','/press/'],['ranks','/ranks/'],['changelog','/changelog/'],['status','/status/'],['notebook','/notebook/'],['community','/community/'],
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

function sourceBinding(root, files) {
  const normalized = [...new Set(files)].sort();
  const hash = crypto.createHash('sha256');
  const entries = [];
  for (const relative of normalized) {
    const bytes = fs.readFileSync(path.join(root, relative));
    hash.update(relative.replace(/\\/g, '/'));
    hash.update('\0');
    hash.update(bytes);
    hash.update('\0');
    entries.push({ path: relative.replace(/\\/g, '/'), sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
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

module.exports = { PAGES, VIEWPORTS, candidateBinding, sha256File, sourceBinding, validateReceipt, validateRecords };
