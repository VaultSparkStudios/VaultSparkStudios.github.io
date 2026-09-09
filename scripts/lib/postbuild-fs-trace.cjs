/** Successful high-level filesystem observations for one postbuild invocation.
 * Direct file descriptors and native addons are outside this tracer's coverage.
 */
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const createHash = crypto.createHash.bind(crypto);
const htmlReads = new Map();
let sequence = 0;
const { fileURLToPath } = require("node:url");
const { syncBuiltinESMExports } = require("node:module");
const TRACE = process.env.VS_FS_TRACE,
  STEP = process.env.VS_FS_TRACE_STEP,
  ROOT = path.resolve(process.env.VS_FS_TRACE_ROOT || process.cwd()),
  INVOCATION = process.env.VS_FS_TRACE_INVOCATION;
if (!TRACE) return;
if (!STEP || !INVOCATION)
  throw new Error("Postbuild tracer requires step and invocation identity");
const seen = new Set(),
  append = fs.appendFileSync.bind(fs),
  read = fs.readFileSync.bind(fs);
function absolute(p) {
  if (p instanceof URL) return fileURLToPath(p);
  if (typeof p === "string" || Buffer.isBuffer(p))
    return path.resolve(String(p));
  return null;
}
function classify(p) {
  const abs = absolute(p);
  if (!abs) return null;
  const rel = path.relative(ROOT, abs).replaceAll("\\", "/");
  if (
    !rel ||
    rel === ".." ||
    rel.startsWith("../") ||
    path.isAbsolute(rel) ||
    !rel.endsWith(".html") ||
    /^(node_modules|\.git|\.cache)\//.test(rel)
  )
    return null;
  return rel;
}
function record(op, p, observedSequence = null) {
  const page = classify(p);
  if (!page) return;
  const key = `${op}|${page}`;
  if (["read", "write-noop"].includes(op) && seen.has(key)) return;
  append(
    TRACE,
    JSON.stringify({
      invocationId: INVOCATION,
      step: STEP,
      op,
      page,
      sequence: observedSequence ?? ++sequence,
    }) + "\n",
  );
  seen.add(key);
}
function contents(p) {
  try {
    const abs = absolute(p);
    return abs ? read(abs) : null;
  } catch {
    return null;
  }
}
function same(a, b) {
  return a !== null && b !== null && a.equals(b);
}
function wrap(obj, name, op, index = 0) {
  const original = obj[name];
  if (typeof original !== "function") return;
  obj[name] = function (...args) {
    const p = args[index],
      tracked = classify(p);
    if (!tracked) return original.apply(this, args);
    const before = op === "write" ? contents(p) : null;
    const done = (value) => {
      if (op === "read") {
        record(op, p);
        // Only complete readFile results establish byte provenance. Streams,
        // file descriptors and arbitrary transformed data remain unmeasured.
        if (name === "readFile" || name === "readFileSync") {
          const encoding =
            typeof args[1] === "string" ? args[1] : args[1]?.encoding || "utf8";
          const bytes = Buffer.isBuffer(value)
            ? Buffer.from(value)
            : typeof value === "string"
              ? Buffer.from(value, encoding)
              : null;
          if (bytes) {
            const page = classify(p),
              versions = htmlReads.get(page) || [];
            if (!versions.some((previous) => previous.equals(bytes)))
              versions.push(bytes);
            htmlReads.set(page, versions);
          }
        }
      } else record(same(before, contents(p)) ? "write-noop" : "write", p);
    };
    if (name === "createReadStream" || name === "createWriteStream") {
      const stream = original.apply(this, args);
      stream.once(op === "read" ? "end" : "finish", done);
      return stream;
    }
    if (typeof args.at(-1) === "function") {
      const callback = args.at(-1);
      args[args.length - 1] = function (error, ...values) {
        if (!error) done(values[0]);
        return callback.call(this, error, ...values);
      };
      return original.apply(this, args);
    }
    const result = original.apply(this, args);
    if (result && typeof result.then === "function")
      return result.then((value) => {
        done(value);
        return value;
      });
    done(result);
    return result;
  };
}
for (const obj of new Set([fs, fs.promises, fsp])) {
  for (const name of ["readFileSync", "readFile", "createReadStream"])
    wrap(obj, name, "read");
  for (const name of [
    "writeFileSync",
    "writeFile",
    "appendFileSync",
    "appendFile",
    "createWriteStream",
  ])
    wrap(obj, name, "write");
  for (const name of ["renameSync", "rename", "copyFileSync", "copyFile"])
    wrap(obj, name, "write", 1);
  for (const name of ["unlinkSync", "unlink", "rmSync", "rm"])
    wrap(obj, name, "write");
}
// A finalized hash that consumed exact full-file HTML bytes is a measured
// observer. Equal byte content across several files is conservatively associated
// with every matching path; this is byte provenance, not arbitrary JS dataflow.
crypto.createHash = function (...args) {
  const hash = createHash(...args),
    update = hash.update,
    digest = hash.digest;
  const observations = new Map();
  hash.update = function (data, encoding) {
    const result = update.call(this, data, encoding);
    const bytes =
      typeof data === "string"
        ? Buffer.from(data, encoding || "utf8")
        : Buffer.isBuffer(data)
          ? data
          : ArrayBuffer.isView(data)
            ? Buffer.from(data.buffer, data.byteOffset, data.byteLength)
            : null;
    if (bytes)
      for (const [page, versions] of htmlReads) {
        if (
          versions.some((original) => bytes.equals(original)) &&
          !observations.has(page)
        )
          observations.set(page, ++sequence);
      }
    return result;
  };
  hash.digest = function (...args) {
    const result = digest.apply(this, args);
    for (const [page, observedAt] of observations)
      record("hash-observe", path.join(ROOT, page), observedAt);
    return result;
  };
  return hash;
};

// Named ESM imports must observe the same patched methods as the CJS object.
syncBuiltinESMExports();
