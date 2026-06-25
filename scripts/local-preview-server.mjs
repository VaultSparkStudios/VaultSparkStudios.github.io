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
  const filePath = resolvePath(req.url || '/');
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
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
  process.stdout.write(`Local preview running at http://${host}:${port}\n`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
