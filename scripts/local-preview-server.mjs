import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { URL } from 'node:url';

const root = process.cwd();
const host = process.env.LOCAL_PREVIEW_HOST || '127.0.0.1';
const port = Number(process.env.LOCAL_PREVIEW_PORT || 4173);

// Parse Cloudflare _headers file so local Lighthouse CI gets preload Link headers
// matching what the real CDN sends — keeps synthetic scores representative.
function parseHeadersFile() {
  const headersPath = path.join(root, '_headers');
  if (!fs.existsSync(headersPath)) return {};
  const rules = {};
  let currentPattern = null;
  for (const raw of fs.readFileSync(headersPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      currentPattern = line;
      rules[currentPattern] = [];
    } else if (currentPattern) {
      const colon = line.indexOf(':');
      if (colon > 0) {
        rules[currentPattern].push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
      }
    }
  }
  return rules;
}

const headersRules = parseHeadersFile();

/**
 * Parse Cloudflare `_redirects` — the other half of the fidelity this server
 * already promises for `_headers`.
 *
 * THE LIVE S340 CASE. `/ranks/` and `/vaultsparked/` were consolidated and their
 * stub pages deleted; a `_redirects` 301 answers them in production. This server
 * did not read `_redirects`, so against the preview those routes 404'd — and
 * every CI consumer that asked for one broke. `smoke-http.mjs` is a PRE-gate, so
 * its two failures killed the whole E2E workflow, both jobs, on every push for
 * 17 hours, hiding eight more stranded specs behind it. S338 had already lost 27
 * hours of Lighthouse verdicts to the identical cause.
 *
 * Fixing the consumers one at a time treats a symptom that regenerates on the
 * next route merge. The defect is that the preview is not a faithful stand-in
 * for the edge. Teaching it `_redirects` resolves every consumer at once, and
 * every future merge automatically, because `_redirects` is generated from
 * `config/route-consolidation.json`.
 *
 * Cloudflare semantics honoured: first matching rule wins (so the file's own
 * "more specific rules first" ordering is load-bearing), `/*` splats capture a
 * suffix that `:splat` re-inserts, and the declared status code is used.
 */
export function parseRedirects(text) {
  const rules = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, code] = line.split(/\s+/);
    if (!from || !to || !from.startsWith('/')) continue;
    rules.push({ from, to, status: Number(code) || 301 });
  }
  return rules;
}

/** First match wins, exactly as Cloudflare resolves the file top-down. */
export function matchRedirect(rules, pathname) {
  for (const rule of rules) {
    if (rule.from.endsWith('/*')) {
      const prefix = rule.from.slice(0, -1); // keep the trailing slash
      if (pathname.startsWith(prefix)) {
        const splat = pathname.slice(prefix.length);
        return { status: rule.status, location: rule.to.replace(':splat', splat) };
      }
      continue;
    }
    if (pathname === rule.from) {
      return { status: rule.status, location: rule.to.replace(':splat', '') };
    }
  }
  return null;
}

const redirectRules = (() => {
  const p = path.join(root, '_redirects');
  return fs.existsSync(p) ? parseRedirects(fs.readFileSync(p, 'utf8')) : [];
})();

function getExtraHeaders(pathname) {
  const extra = [];
  for (const [pattern, hdrs] of Object.entries(headersRules)) {
    if (pattern === '/*' || pathname === pattern) extra.push(...hdrs);
  }
  return extra;
}

const COMPRESSIBLE = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function resolvePath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, `http://${host}:${port}`).pathname);
  let candidate = path.normalize(path.join(root, pathname));
  if (!candidate.startsWith(root)) return null;

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    candidate = path.join(candidate, 'index.html');
  } else if (!path.extname(candidate) && fs.existsSync(candidate + '.html')) {
    candidate += '.html';
  }

  return candidate;
}

const server = http.createServer((req, res) => {
  // Redirects are evaluated BEFORE static assets, which is how the real edge
  // resolves them — proven on this site in S334, when a `/solara/*` splat 301'd
  // the SPA's own existing bundle into a 404. Matching that precedence here is
  // the point: a rule that shadows a real page now fails in CI instead of in
  // production.
  const requested = new URL(req.url || '/', `http://${host}:${port}`).pathname;
  const redirect = matchRedirect(redirectRules, requested);
  if (redirect) {
    res.writeHead(redirect.status, { Location: redirect.location });
    res.end();
    return;
  }

  const filePath = resolvePath(req.url || '/');
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const custom404 = path.join(root, '404.html');
    if (fs.existsSync(custom404)) {
      const body = fs.readFileSync(custom404);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  const canGzip = COMPRESSIBLE.has(ext) && acceptEncoding.includes('gzip');

  const pathname = new URL(req.url || '/', `http://${host}:${port}`).pathname;
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  };
  if (canGzip) headers['Content-Encoding'] = 'gzip';
  if (canGzip) headers['Vary'] = 'Accept-Encoding';

  // Emit Link preload headers from _headers (matches Cloudflare CDN behaviour)
  const extra = getExtraHeaders(pathname);
  for (const [name, value] of extra) {
    if (name.toLowerCase() === 'link') {
      const prev = headers['Link'];
      headers['Link'] = prev ? `${prev}, ${value}` : value;
    }
  }

  res.writeHead(200, headers);
  const stream = fs.createReadStream(filePath);
  if (canGzip) {
    stream.pipe(zlib.createGzip()).pipe(res);
  } else {
    stream.pipe(res);
  }
});

server.listen(port, host, () => {
  // Port 0 asks the OS for an available ephemeral port. Report the bound port
  // rather than the requested value so callers can safely avoid collisions.
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  process.stdout.write(`Local preview running at http://${host}:${boundPort}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
