import { createHash } from 'node:crypto';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function parseClaims(text) {
  const rows = [];
  for (const [index, line] of String(text || '').split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('row is not an object');
      rows.push(row);
    } catch (error) {
      throw new Error(`claim ledger line ${index + 1} is malformed: ${error.message}`);
    }
  }
  return rows;
}

function publishedDate(item) {
  const value = String(item?.date_published || item?.date_modified || '');
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || null;
}

export function deriveNewsReleaseContract(feed, claimsText) {
  if (!feed || typeof feed !== 'object' || !Array.isArray(feed.items) || feed.items.length === 0) {
    throw new Error('News JSON Feed has no items');
  }
  const ranked = feed.items.map((item) => ({ item, date: publishedDate(item) }))
    .filter((entry) => entry.date)
    .sort((a, b) => b.date.localeCompare(a.date) || String(a.item.id || a.item.url || '').localeCompare(String(b.item.id || b.item.url || '')));
  if (!ranked.length) throw new Error('News JSON Feed has no dated items');

  const newest = ranked[0];
  const route = new URL(String(newest.item.url || ''), 'https://vaultsparkstudios.com').pathname;
  if (!new RegExp(`^/news/${newest.date}/[^/]+/$`).test(route)) {
    throw new Error(`newest News item route does not match its published date: ${route || '(missing)'}`);
  }

  const rows = parseClaims(claimsText);
  const dated = rows.filter((row) => row.date === newest.date);
  const facts = dated.filter((row) => row.type === 'fact');
  const stances = dated.filter((row) => row.type === 'stance');
  if (!facts.length) throw new Error(`claim ledger has no fact row for newest edition ${newest.date}`);
  if (!stances.length) throw new Error(`claim ledger has no stance row for newest edition ${newest.date}`);

  return {
    date: newest.date,
    route,
    title: String(newest.item.title || '').trim(),
    factCount: facts.length,
    stanceCount: stances.length,
    claimRowCount: dated.length,
    claimsSha256: sha256(Buffer.from(String(claimsText || ''), 'utf8')),
  };
}

export function runNewsReleaseContractSelfTest(log = console.log) {
  const feed = { items: [
    { id: 'older', url: 'https://vaultsparkstudios.com/news/2026-08-21/older/', title: 'Older', date_published: '2026-08-21T12:00:00.000Z' },
    { id: 'newest', url: 'https://vaultsparkstudios.com/news/2026-08-22/newest/', title: 'Newest', date_published: '2026-08-22T12:00:00.000Z' },
  ] };
  const claims = [
    JSON.stringify({ type: 'fact', date: '2026-08-22', id: 'f1' }),
    JSON.stringify({ type: 'stance', date: '2026-08-22', persona: 'mara' }),
    JSON.stringify({ type: 'prediction', date: '2026-08-22', id: 'p1' }),
  ].join('\n') + '\n';
  const contract = deriveNewsReleaseContract(feed, claims);
  const rejects = (candidateFeed, candidateClaims, pattern) => {
    try { deriveNewsReleaseContract(candidateFeed, candidateClaims); return false; }
    catch (error) { return pattern.test(error.message); }
  };
  const cases = [
    ['newest item is derived by date rather than array position', contract.date === '2026-08-22' && contract.route === '/news/2026-08-22/newest/'],
    ['fact and stance rows are counted for the newest edition', contract.factCount === 1 && contract.stanceCount === 1 && contract.claimRowCount === 3],
    ['ledger hash is a full SHA-256 digest', /^[a-f0-9]{64}$/.test(contract.claimsSha256)],
    ['malformed NDJSON fails closed', rejects(feed, claims + '{bad}\n', /malformed/)],
    ['missing newest fact fails closed', rejects(feed, JSON.stringify({ type: 'stance', date: '2026-08-22' }), /no fact row/)],
    ['missing newest stance fails closed', rejects(feed, JSON.stringify({ type: 'fact', date: '2026-08-22' }), /no stance row/)],
    ['route/date mismatch fails closed', rejects({ items: [{ ...feed.items[1], url: 'https://vaultsparkstudios.com/news/2026-08-21/newest/' }] }, claims, /does not match/)],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) throw new Error(`${failed.length} News release contract self-test(s) failed`);
  return cases.length;
}
