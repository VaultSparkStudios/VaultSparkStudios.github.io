/**
 * postbuild-fs-trace.cjs — the instrument S339 said this question needed.
 *
 * Two sessions tried to answer "which postbuild steps write rendered pages, and
 * which hash them?" by reading source, and both were wrong in both directions:
 * page writes go through helpers, so a grep cannot tell a writer from a reader.
 *
 * This does not read source. It is preloaded into each postbuild step with
 * `--require` and patches the fs entry points, so every read and write of a
 * rendered page is observed as it actually happens — helper indirection,
 * dynamic paths and all. The step's own code is untouched and unaware.
 *
 * Emits one NDJSON line per distinct (step, op, path) to VS_FS_TRACE.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const TRACE = process.env.VS_FS_TRACE;
const STEP = process.env.VS_FS_TRACE_STEP || 'unknown';
const ROOT = process.env.VS_FS_TRACE_ROOT || process.cwd();
if (!TRACE) return;

const seen = new Set();
const realWrite = fs.appendFileSync.bind(fs);
const realRead = fs.readFileSync.bind(fs);

/** A rendered page is an .html file inside the site tree — never node_modules. */
function classify(p) {
  if (typeof p !== 'string' && !Buffer.isBuffer(p) && !(p instanceof URL)) return null;
  let s = p instanceof URL ? p.pathname : String(p);
  if (!s.endsWith('.html')) return null;
  const abs = path.resolve(ROOT, s);
  if (!abs.startsWith(ROOT)) return null;
  const rel = path.relative(ROOT, abs).split(path.sep).join('/');
  if (rel.startsWith('node_modules/') || rel.startsWith('.git/')) return null;
  return rel;
}

function record(op, p) {
  const rel = classify(p);
  if (!rel) return;
  const key = `${STEP}|${op}|${rel}`;
  if (seen.has(key)) return;
  seen.add(key);
  try { realWrite(TRACE, JSON.stringify({ step: STEP, op, page: rel }) + '\n'); } catch { /* never break a build step */ }
}

/**
 * A write that reproduces the bytes already on disk strands nothing — the page
 * a later reader observed is the page that is still there. Recording it as a
 * write turns every idempotent rewriter into an accusation. So a `write` event
 * means the CONTENT CHANGED, and the check is done here, at the call, where the
 * old bytes and the new bytes are both in hand.
 */
function changesContent(p, data) {
  if (data === undefined || data === null) return true;
  try {
    const abs = path.resolve(ROOT, p instanceof URL ? p.pathname : String(p));
    if (!fs.existsSync(abs)) return true;
    const next = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
    return !realRead(abs).equals(next);
  } catch {
    return true; // cannot prove it is a no-op, so treat it as a change
  }
}

function wrap(obj, name, op, argIndex = 0, dataIndex = null) {
  const orig = obj[name];
  if (typeof orig !== 'function') return;
  obj[name] = function (...args) {
    if (op === 'write' && dataIndex !== null && !changesContent(args[argIndex], args[dataIndex])) {
      return orig.apply(this, args);
    }
    record(op, args[argIndex]);
    return orig.apply(this, args);
  };
}

for (const m of [fs, fs.promises, fsp]) {
  if (!m) continue;
  wrap(m, 'readFileSync', 'read');
  wrap(m, 'readFile', 'read');
  wrap(m, 'writeFileSync', 'write', 0, 1);
  wrap(m, 'writeFile', 'write', 0, 1);
  wrap(m, 'appendFileSync', 'write');
  wrap(m, 'appendFile', 'write');
  wrap(m, 'createReadStream', 'read');
  wrap(m, 'createWriteStream', 'write');
  // A rename/copy into a page path is a write of that page.
  wrap(m, 'renameSync', 'write', 1);
  wrap(m, 'rename', 'write', 1);
  wrap(m, 'copyFileSync', 'write', 1);
  wrap(m, 'copyFile', 'write', 1);
}
