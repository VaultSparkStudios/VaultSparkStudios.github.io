import crypto from 'node:crypto';

export const DISCOVERY_PATHS = Object.freeze([
  '.well-known/llms.txt',
  'agents.json',
  'robots.txt',
  'sitemap.xml',
]);
export const isDiscoveryPath = (value) => DISCOVERY_PATHS.includes(String(value || '').replace(/^\/+/, '').replace(/\\/g, '/'));
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export function validateDiscoveryBundle(read) {
  const findings = [];
  const text = Object.fromEntries(DISCOVERY_PATHS.map((rel) => [rel, read(rel)]));
  let agents = null;
  try { agents = JSON.parse(text['agents.json']); } catch { findings.push('agents.json is not valid JSON'); }
  const locations = [...text['sitemap.xml'].matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (!/^<\?xml/.test(text['sitemap.xml']) || !text['sitemap.xml'].includes('<urlset') || !locations.length) findings.push('sitemap.xml lacks a populated XML urlset');
  if (locations.some((url) => !url.startsWith('https://vaultsparkstudios.com/'))) findings.push('sitemap.xml contains a non-canonical location');
  if (!text['robots.txt'].includes('Sitemap: https://vaultsparkstudios.com/sitemap.xml')) findings.push('robots.txt does not advertise the canonical sitemap');
  if (!text['robots.txt'].includes('Allow: /.well-known/llms.txt')) findings.push('robots.txt does not allow the llms discovery file');
  if (agents?.discovery?.sitemap !== 'https://vaultsparkstudios.com/sitemap.xml') findings.push('agents.json sitemap pointer is incoherent');
  if (agents?.discovery?.llmsTxt !== 'https://vaultsparkstudios.com/.well-known/llms.txt') findings.push('agents.json llms.txt pointer is incoherent');
  if (!text['.well-known/llms.txt'].includes('https://vaultsparkstudios.com/api/citation.json')) findings.push('llms.txt omits the canonical citation feed');
  if (/localhost|127\.0\.0\.1|staging\.vaultsparkstudios/i.test(Object.values(text).join('\n'))) findings.push('discovery bundle contains a non-production origin');
  const leaves = DISCOVERY_PATHS.map((path) => ({ path, sha256: sha256(Buffer.from(text[path])), bytes: Buffer.byteLength(text[path]) }));
  const manifestRoot = sha256(Buffer.from(leaves.map((leaf) => `${leaf.path}\0${leaf.sha256}\0${leaf.bytes}`).join('\n')));
  return { ok: findings.length === 0, findings, leaves, manifestRoot, urlCount: locations.length };
}
