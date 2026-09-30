import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPath } from '../check-content-hotfix-gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/desk-content-paths.json'), 'utf8'));
const exact = new Set(rules.exact);
const patterns = rules.patterns.map((value) => new RegExp(value));

export function isDeskContentPath(value) {
  const rel = String(value || '').replaceAll('\\', '/');
  return classifyPath(rel) === 'content' && (exact.has(rel) || patterns.some((pattern) => pattern.test(rel)));
}

export function deskContentPartition(paths) {
  const normalized = [...new Set((paths || []).map((value) => String(value).replaceAll('\\', '/')))].sort();
  const promotable = normalized.filter(isDeskContentPath);
  return {
    promotable,
    withheld: normalized.filter((value) => !isDeskContentPath(value)),
    deployable: promotable.includes('index.html') && promotable.includes('news/index.html'),
  };
}

export function selfTestDeskContentPaths() {
  const allow = ['index.html', 'news/index.html', 'news/2026-09-30/story/index.html', 'assets/og/news/2026-09-30--story--meme--640.avif', 'api/news-desk-feed.json', 'api/news-desk-claims.ndjson', 'api/news-visual-receipts.json', 'sitemap.xml'];
  const deny = ['auth/index.html', 'membership/index.html', 'assets/app.js', 'sw.js', '_headers', 'api/security-posture.json', 'news/2026-09-30/story/critique.json', 'news/../../auth/index.html', 'data/news-desk/art/story.png'];
  for (const value of allow) if (!isDeskContentPath(value)) throw new Error(`Desk path rejected: ${value}`);
  for (const value of deny) if (isDeskContentPath(value)) throw new Error(`Desk path allowed: ${value}`);
  return allow.length + deny.length;
}
