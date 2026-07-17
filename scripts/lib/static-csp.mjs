import crypto from 'node:crypto';

const INLINE_SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const HASH_SOURCE_RE = /'sha256-[A-Za-z0-9+/=]+'\s*/g;

export function extractInlineScriptHashes(html) {
  const hashes = [];
  let match;
  INLINE_SCRIPT_RE.lastIndex = 0;
  while ((match = INLINE_SCRIPT_RE.exec(String(html)))) {
    const attrs = match[1] || '';
    const body = match[2] || '';
    if (!body.trim() || /\bsrc\s*=/.test(attrs) || /type=["']application\/ld\+json["']/.test(attrs)) continue;
    const digest = crypto.createHash('sha256').update(body).digest('base64');
    hashes.push(`'sha256-${digest}'`);
  }
  return [...new Set(hashes)].sort();
}

export function staticCspForHtml(canonicalCsp, html) {
  const base = String(canonicalCsp)
    .replace(HASH_SOURCE_RE, '')
    .replace(/'strict-dynamic'\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const hashes = extractInlineScriptHashes(html);
  if (!hashes.length) return base;
  const sources = hashes.join(' ');
  return base.replace(/script-src\s+'self'/, `script-src 'self' ${sources}`);
}

export function routePatterns(relativeHtmlPath) {
  const rel = String(relativeHtmlPath).replaceAll('\\', '/').replace(/^\.\//, '');
  if (rel === 'index.html') return ['/', '/index.html'];
  if (rel.endsWith('/index.html')) {
    const stem = rel.slice(0, -'/index.html'.length);
    return [`/${stem}`, `/${stem}/`, `/${rel}`];
  }
  return [`/${rel}`];
}

export function renderCaddyRoutePolicies(pages, canonicalCsp) {
  const lines = [];
  pages.forEach((page, index) => {
    const matcher = `@vs_static_csp_${index}`;
    const patterns = routePatterns(page.relativePath);
    const csp = staticCspForHtml(canonicalCsp, page.html).replace(/"/g, '\\"');
    lines.push(`${matcher} path ${patterns.join(' ')}`);
    lines.push(`header ${matcher} Content-Security-Policy "${csp}"`);
  });
  return lines.join('\n');
}