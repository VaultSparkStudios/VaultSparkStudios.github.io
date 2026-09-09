#!/usr/bin/env node
/** @verification-scope postbuild — npm postbuild runs --run and validates this exact lifecycle.
 * Run and verify the actual postbuild lifecycle. A receipt certifies one complete
 * invocation, its exact command sequence, source fingerprint, and trace bytes.
 * The tracer retains successful HTML reads, changed/no-op writes and finalized
 * exact-full-file hash consumption. Only measured hash-before-write dependencies
 * block; other dataflow and unsupported APIs remain explicitly unmeasured.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "./lib/safe-spawn.mjs";
const OBSERVATION_CONTRACT = {
  blocking:
    "finalized crypto hash consuming exact bytes of a successful complete HTML readFile",
  measured: [
    "read",
    "content-changing-write",
    "successful-no-op-write",
    "exact-full-file-hash",
  ],
  limitations: [
    "partial/chunked stream hashing, Hash.copy, WebCrypto and arbitrary dataflow are unmeasured",
    "identical file bytes conservatively associate every matching read path",
    "only observed successful high-level filesystem APIs are covered",
  ],
};
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const digest = (x) => createHash("sha256").update(x).digest("hex");
const paths = (root) => ({
  trace: path.join(root, ".cache", "postbuild-fs-trace.ndjson"),
  receipt: path.join(root, ".cache", "postbuild-ordering.json"),
});

/** Strict argv parsing for the supported node-script chain; never invoke a shell.
 * Unsupported operators, substitutions and malformed quoting are errors rather
 * than silently omitted commands. Quoted argument whitespace remains intact. */
export function postbuildSteps(pkg) {
  const raw = pkg?.scripts?.["postbuild:steps"] ?? pkg?.scripts?.postbuild;
  if (typeof raw !== "string" || !raw.trim())
    throw new Error("Missing postbuild:steps command chain");
  const commands = [];
  let tokens = [],
    token = "",
    started = false,
    quote = null;
  function word() {
    if (started) {
      tokens.push(token);
      token = "";
      started = false;
    }
  }
  function command() {
    word();
    if (!tokens.length) throw new Error("Empty postbuild command");
    commands.push(tokens);
    tokens = [];
  }
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (c === quote) {
        quote = null;
        started = true;
      } else {
        token += c;
        started = true;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      started = true;
      continue;
    }
    if (/\s/.test(c)) {
      word();
      continue;
    }
    if (c === "&" && raw[i + 1] === "&") {
      command();
      i++;
      continue;
    }
    if (/[;&|<>`$\r\n]/.test(c))
      throw new Error("Unsupported shell syntax in postbuild command");
    token += c;
    started = true;
  }
  if (quote) throw new Error("Unclosed postbuild argument quote");
  command();
  return commands.map((argv, i) => {
    if (
      argv[0] !== "node" ||
      !/^scripts\/[a-z0-9][a-z0-9./-]*\.mjs$/i.test(argv[1] || "") ||
      argv[1].split("/").includes("..")
    )
      throw new Error(`Unsupported postbuild command ${i + 1}`);
    if (argv[1] === "scripts/check-postbuild-ordering.mjs")
      throw new Error(
        "Recursive postbuild runner; move the original chain to postbuild:steps",
      );
    return {
      id: `${i + 1}:${argv[1].slice(8)}`,
      script: argv[1].slice(8),
      argv: argv.slice(2),
    };
  });
}

export function sourceFingerprint(root, steps) {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(steps));
  // Script dependencies can be indirect; cover the whole local scripts tree.
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const e of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      if (["node_modules", ".cache", ".git"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && /\.(?:mjs|cjs|js|json)$/.test(e.name)) {
        hash.update(path.relative(root, p).replaceAll("\\", "/") + "\0");
        hash.update(fs.readFileSync(p));
      }
    }
  }
  walk(path.join(root, "scripts"));
  return hash.digest("hex");
}

export function validateObservation(
  receipt,
  traceBytes,
  { steps, sourceHash } = {},
) {
  const errors = [];
  let events = [];
  if (!receipt || receipt.schemaVersion !== "3.0")
    errors.push("missing or unsupported receipt");
  if (
    JSON.stringify(receipt?.observationContract) !==
    JSON.stringify(OBSERVATION_CONTRACT)
  )
    errors.push("observation coverage contract changed");
  if (receipt?.status !== "complete")
    errors.push("invocation did not complete");
  if (typeof receipt?.invocationId !== "string" || !receipt.invocationId)
    errors.push("missing invocation identity");
  if (JSON.stringify(receipt?.steps) !== JSON.stringify(steps))
    errors.push("command chain changed");
  if (receipt?.sourceHash !== sourceHash)
    errors.push("source fingerprint changed");
  if (
    !Array.isArray(receipt?.results) ||
    receipt.results.length !== steps.length ||
    receipt.results.some(
      (r, i) => r.id !== steps[i].id || r.status !== 0 || r.signal || r.error,
    )
  )
    errors.push("step coverage incomplete or failed");
  if (receipt?.traceSha256 !== digest(traceBytes))
    errors.push("trace digest mismatch");
  try {
    events = String(traceBytes)
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    errors.push("trace contains malformed JSON");
  }
  const ids = new Set(steps.map((s) => s.id));
  if (
    events.some(
      (e) =>
        !e ||
        e.invocationId !== receipt?.invocationId ||
        !ids.has(e.step) ||
        !["read", "write", "write-noop", "hash-observe"].includes(e.op) ||
        !Number.isInteger(e.sequence) ||
        e.sequence < 1 ||
        typeof e.page !== "string" ||
        !e.page.endsWith(".html") ||
        path.isAbsolute(e.page) ||
        e.page.split(/[\\/]/).includes(".."),
    )
  )
    errors.push("trace event outside invocation contract");
  if (receipt?.eventCount !== events.length)
    errors.push("trace event count mismatch");
  return { errors, events };
}

export function runPipeline(
  root = ROOT,
  { spawn = spawnSync, quiet = false } = {},
) {
  const steps = postbuildSteps(
    JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
  );
  const { trace, receipt } = paths(root),
    invocationId = randomUUID(),
    sourceHash = sourceFingerprint(root, steps),
    startedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(trace), { recursive: true });
  fs.writeFileSync(trace, "");
  const proof = {
    schemaVersion: "3.0",
    generatedBy: "scripts/check-postbuild-ordering.mjs --run",
    invocationId,
    startedAt,
    status: "running",
    observationContract: OBSERVATION_CONTRACT,
    steps,
    sourceHash,
    results: [],
  };
  const save = () => {
    const bytes = fs.readFileSync(trace);
    proof.traceSha256 = digest(bytes);
    proof.eventCount = String(bytes).split(/\r?\n/).filter(Boolean).length;
    fs.writeFileSync(receipt, JSON.stringify(proof, null, 2) + "\n");
  };
  save();
  const preload = path.join(root, "scripts", "lib", "postbuild-fs-trace.cjs");
  for (const step of steps) {
    let r;
    try {
      r = spawn(
        process.execPath,
        [
          "--require",
          preload,
          path.join(root, "scripts", step.script),
          ...step.argv,
        ],
        {
          cwd: root,
          encoding: "utf8",
          windowsHide: true,
          env: {
            ...process.env,
            VS_FS_TRACE: trace,
            VS_FS_TRACE_STEP: step.id,
            VS_FS_TRACE_ROOT: root,
            VS_FS_TRACE_INVOCATION: invocationId,
          },
          maxBuffer: 16 * 1024 * 1024,
        },
      );
    } catch (error) {
      r = { status: null, error };
    }
    proof.results.push({
      id: step.id,
      status: r.status ?? null,
      signal: r.signal ?? null,
      error: r.error?.message ?? null,
    });
    if (!quiet) {
      if (r.stdout) process.stdout.write(r.stdout);
      if (r.stderr) process.stderr.write(r.stderr);
      console.log(`${r.status === 0 ? "ok" : "FAIL"} postbuild ${step.id}`);
    }
    if (r.status !== 0 || r.error || r.signal) {
      proof.status = "failed";
      proof.completedAt = new Date().toISOString();
      save();
      return { code: 1, proof };
    }
  }
  if (sourceFingerprint(root, steps) !== sourceHash) {
    proof.status = "source-changed";
    save();
    return { code: 1, proof };
  }
  proof.status = "complete";
  proof.completedAt = new Date().toISOString();
  save();
  const checked = inspectPipeline(root);
  if (checked.code) {
    proof.status = "invalid-evidence";
    proof.validationErrors = checked.errors;
    save();
  }
  return { code: checked.code, proof };
}

export function inspectPipeline(root = ROOT) {
  try {
    const { trace, receipt } = paths(root);
    if (!fs.existsSync(trace) || !fs.existsSync(receipt))
      return {
        code: 1,
        errors: ["unmeasured: missing postbuild receipt or trace"],
      };
    const steps = postbuildSteps(
        JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
      ),
      proof = JSON.parse(fs.readFileSync(receipt, "utf8"));
    const { errors, events } = validateObservation(
      proof,
      fs.readFileSync(trace),
      { steps, sourceHash: sourceFingerprint(root, steps) },
    );
    if (errors.length)
      return {
        code: 1,
        errors: [
          ...errors,
          ...(Array.isArray(proof.validationErrors)
            ? proof.validationErrors
            : []),
        ],
      };
    const bad = violations(
      steps.map((s) => s.id),
      events,
    );
    return {
      code: bad.length ? 1 : 0,
      errors: bad.map(
        (v) =>
          `${v.reader} observes ${v.pages} page(s) before ${v.writer} changes them; e.g. ${v.sample}`,
      ),
      steps: steps.length,
      eventCount: events.length,
    };
  } catch (error) {
    return {
      code: 1,
      errors: [`invalid postbuild evidence: ${error.message}`],
    };
  }
}

export function violations(order, events) {
  const index = new Map(order.map((step, i) => [step, i]));
  const hashes = events.filter(
    (e) => e.op === "hash-observe" && index.has(e.step),
  );
  const writes = events.filter((e) => e.op === "write" && index.has(e.step));
  const pairs = new Map();
  for (const read of hashes) {
    const readerIndex = index.get(read.step);
    const later = writes.find(
      (write) =>
        write.page === read.page &&
        (index.get(write.step) > readerIndex ||
          (write.step === read.step && write.sequence > read.sequence)),
    );
    if (!later) continue;
    const key = read.step + "|" + later.step;
    if (!pairs.has(key))
      pairs.set(key, {
        reader: read.step,
        writer: later.step,
        readerIndex,
        writerIndex: index.get(later.step),
        sample: read.page,
        pages: new Set(),
      });
    pairs.get(key).pages.add(read.page);
  }
  return [...pairs.values()]
    .map((pair) => ({ ...pair, pages: pair.pages.size }))
    .sort((a, b) => b.pages - a.pages);
}

function selfTest() {
  const cases = [];
  const order = ["a.mjs", "b.mjs", "c.mjs"];
  const event = (step, op, page = "index.html", sequence = 1) => ({
    step,
    op,
    page,
    sequence,
  });
  cases.push([
    "hash before later changed writer fails",
    violations(order, [event("a.mjs", "hash-observe"), event("c.mjs", "write")])
      .length === 1,
  ]);
  cases.push([
    "plain analysis read does not claim byte-hash observation",
    violations(order, [event("a.mjs", "read"), event("c.mjs", "write")])
      .length === 0,
  ]);
  cases.push([
    "no-op transform read is not a hash observer",
    violations(order, [
      event("a.mjs", "read"),
      event("a.mjs", "write-noop"),
      event("c.mjs", "write"),
    ]).length === 0,
  ]);
  cases.push([
    "hash observer that also transforms still fails",
    violations(order, [
      event("a.mjs", "hash-observe"),
      event("a.mjs", "write", "index.html", 2),
      event("c.mjs", "write"),
    ]).length === 1,
  ]);
  cases.push([
    "hash consumption before same-step mutation is ordered",
    violations(order, [
      event("a.mjs", "write", "index.html", 2),
      event("a.mjs", "hash-observe", "index.html", 1),
    ]).length === 1,
  ]);
  cases.push([
    "hash after writer and disjoint pages are clean",
    violations(order, [
      event("a.mjs", "write"),
      event("c.mjs", "hash-observe"),
      event("c.mjs", "write", "other.html"),
    ]).length === 0,
  ]);
  cases.push([
    "unknown step cannot create ordering evidence",
    violations(order, [
      event("ghost.mjs", "hash-observe"),
      event("c.mjs", "write"),
    ]).length === 0,
  ]);
  function rejects(fn) {
    try {
      fn();
      return false;
    } catch {
      return true;
    }
  }
  const parsed = postbuildSteps({
    scripts: {
      "postbuild:steps":
        'node scripts/one.mjs --label "two words" && node scripts/one.mjs --apply',
    },
  });
  cases.push([
    "quoted argv and duplicate command identities survive",
    parsed[0].argv[1] === "two words" && parsed[0].id !== parsed[1].id,
  ]);
  for (const chain of [
    "node scripts/a.mjs && echo hi",
    "node scripts/a.mjs || node scripts/b.mjs",
    "node scripts/a.mjs &&",
    'node scripts/a.mjs "unterminated',
    "node scripts/check-postbuild-ordering.mjs --run",
    "node scripts/../outside.mjs",
  ])
    cases.push([
      `unsupported chain refused: ${chain}`,
      rejects(() => postbuildSteps({ scripts: { postbuild: chain } })),
    ]);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vs-postbuild-"));
  try {
    fs.mkdirSync(path.join(temp, "scripts", "lib"), { recursive: true });
    fs.copyFileSync(
      path.join(ROOT, "scripts", "lib", "postbuild-fs-trace.cjs"),
      path.join(temp, "scripts", "lib", "postbuild-fs-trace.cjs"),
    );
    const put = (name, body) =>
      fs.writeFileSync(path.join(temp, "scripts", name), body);
    const pkg = (chain) =>
      fs.writeFileSync(
        path.join(temp, "package.json"),
        JSON.stringify({ scripts: { "postbuild:steps": chain } }),
      );
    put(
      "write.mjs",
      "import fs from 'node:fs';fs.writeFileSync('index.html','new');",
    );
    put(
      "read.mjs",
      "import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';createHash('sha256').update(readFileSync('index.html')).digest('hex');",
    );
    put("fail.mjs", "process.exit(7);");
    put(
      "later.mjs",
      "import fs from 'node:fs';fs.writeFileSync('later.txt','ran');",
    );
    pkg("node scripts/write.mjs && node scripts/read.mjs");
    cases.push([
      "missing evidence fails as unmeasured",
      inspectPipeline(temp).code === 1,
    ]);
    let run = runPipeline(temp, { quiet: true });
    cases.push([
      "actual complete lifecycle has valid bound receipt",
      run.code === 0 &&
        inspectPipeline(temp).code === 0 &&
        run.proof.results.length === 2,
    ]);
    const proofPath = paths(temp).receipt,
      tracePath = paths(temp).trace,
      proofBytes = fs.readFileSync(proofPath),
      traceBytes = fs.readFileSync(tracePath);
    fs.appendFileSync(tracePath, "{broken\n");
    cases.push(["torn trace fails closed", inspectPipeline(temp).code === 1]);
    fs.writeFileSync(tracePath, traceBytes);
    let tampered = JSON.parse(proofBytes);
    tampered.status = "running";
    fs.writeFileSync(proofPath, JSON.stringify(tampered));
    cases.push([
      "partial lifecycle rejected",
      inspectPipeline(temp).code === 1,
    ]);
    fs.writeFileSync(proofPath, proofBytes);
    tampered = JSON.parse(proofBytes);
    tampered.results.pop();
    fs.writeFileSync(proofPath, JSON.stringify(tampered));
    cases.push([
      "missing completed step rejected",
      inspectPipeline(temp).code === 1,
    ]);
    fs.writeFileSync(proofPath, proofBytes);
    fs.appendFileSync(path.join(temp, "scripts", "read.mjs"), "\n// changed");
    cases.push([
      "source drift invalidates receipt",
      inspectPipeline(temp).code === 1,
    ]);
    pkg("node scripts/fail.mjs && node scripts/later.mjs");
    run = runPipeline(temp, { quiet: true });
    cases.push([
      "real failing child stops later steps and leaves failed proof",
      run.code === 1 &&
        run.proof.results.length === 1 &&
        !fs.existsSync(path.join(temp, "later.txt")) &&
        inspectPipeline(temp).code === 1,
    ]);
    pkg("node scripts/read.mjs && node scripts/write.mjs");
    fs.writeFileSync(path.join(temp, "index.html"), "old");
    run = runPipeline(temp, { quiet: true });
    cases.push([
      "real observer before changed write fails",
      run.code === 1 && run.proof.status === "invalid-evidence",
    ]);
    pkg(
      "node scripts/write.mjs && node scripts/read.mjs && node scripts/write.mjs",
    );
    fs.writeFileSync(path.join(temp, "index.html"), "old");
    run = runPipeline(temp, { quiet: true });
    cases.push([
      "duplicate no-op writer is distinct without false violation",
      run.code === 0,
    ]);
    const scenarios = [
      [
        "plain-analysis",
        "fs.readFileSync('index.html','utf8').includes('class');",
        0,
        false,
      ],
      [
        "noop-transform",
        "const bytes=fs.readFileSync('index.html');fs.writeFileSync('index.html',bytes);",
        0,
        false,
      ],
      [
        "unfinished-hash",
        "crypto.createHash('sha256').update(fs.readFileSync('index.html'));",
        0,
        false,
      ],
      [
        "partial-hash",
        "crypto.createHash('sha256').update(fs.readFileSync('index.html').subarray(0,2)).digest('hex');",
        0,
        false,
      ],
      [
        "full-string-hash",
        "crypto.createHash('sha256').update(fs.readFileSync('index.html','utf8')).digest('hex');",
        1,
        true,
      ],
      [
        "promise-full-hash",
        "crypto.createHash('sha256').update(await fs.promises.readFile('index.html')).digest('hex');",
        1,
        true,
      ],
      [
        "callback-full-hash",
        "await new Promise((resolve,reject)=>fs.readFile('index.html',(error,bytes)=>{if(error)return reject(error);crypto.createHash('sha256').update(bytes).digest('hex');resolve();}));",
        1,
        true,
      ],
      [
        "same-step-hash-write",
        "const h=crypto.createHash('sha256').update(fs.readFileSync('index.html'));fs.writeFileSync('index.html','changed locally');h.digest('hex');",
        1,
        true,
      ],
      [
        "encoded-read-is-not-raw-html",
        "crypto.createHash('sha256').update(fs.readFileSync('index.html','base64')).digest('hex');",
        0,
        false,
      ],
    ];
    for (const [name, body, expectedCode, expectedHash] of scenarios) {
      put(
        "scenario.mjs",
        "import fs from 'node:fs';import crypto from 'node:crypto';" + body,
      );
      fs.writeFileSync(path.join(temp, "index.html"), "original HTML bytes");
      pkg("node scripts/scenario.mjs && node scripts/write.mjs");
      const observed = runPipeline(temp, { quiet: true });
      const trace = fs
        .readFileSync(paths(temp).trace, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map(JSON.parse);
      cases.push([
        "actual " + name + " follows the declared hash scope",
        observed.code === expectedCode &&
          trace.some((e) => e.op === "hash-observe") === expectedHash,
      ]);
      if (name === "noop-transform")
        cases.push([
          "no-op writes retained as evidence",
          trace.some((e) => e.op === "write-noop"),
        ]);
      if (name === "same-step-hash-write")
        cases.push([
          "same-step stale hash remains a concrete failure after saving receipt",
          inspectPipeline(temp).errors.some(
            (error) =>
              error.includes("1:scenario.mjs observes") &&
              error.includes("before 1:scenario.mjs"),
          ),
        ]);
    }
    put(
      "operations.mjs",
      `import fs from 'node:fs';import fsp from 'node:fs/promises';import {pathToFileURL} from 'node:url';
try{fs.readFileSync('missing.html')}catch{}
try{fs.writeFileSync('absent-parent/fail.html','x')}catch{}
try{await fsp.readFile('missing-async.html')}catch{}
await new Promise(resolve=>fs.readFile('missing-callback.html',()=>resolve()));
fs.writeFileSync('url space.html','url');fs.readFileSync(pathToFileURL(process.cwd()+'/url space.html'));
await fsp.writeFile('promise.html','promise');await fsp.readFile('promise.html');
await new Promise((resolve,reject)=>fs.writeFile('callback.html','cb',e=>e?reject(e):resolve()));
await new Promise((resolve,reject)=>fs.readFile('callback.html',e=>e?reject(e):resolve()));
await new Promise((resolve,reject)=>{const s=fs.createWriteStream('stream.html');s.on('error',reject);s.on('finish',resolve);s.end('stream');});
await new Promise((resolve,reject)=>{const s=fs.createReadStream('stream.html');s.on('error',reject);s.on('end',resolve);s.resume();});
`,
    );
    pkg("node scripts/operations.mjs");
    run = runPipeline(temp, { quiet: true });
    const events = fs
      .readFileSync(paths(temp).trace, "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    cases.push([
      "successful sync promise callback and stream operations recorded",
      run.code === 0 &&
        [
          "url space.html",
          "promise.html",
          "callback.html",
          "stream.html",
        ].every((page) =>
          ["read", "write"].every((op) =>
            events.some((e) => e.page === page && e.op === op),
          ),
        ),
    ]);
    cases.push([
      "failed operations produce no observation",
      !events.some(
        (e) => e.page.includes("missing") || e.page.includes("fail.html"),
      ),
    ]);
    let event = events[0];
    event.invocationId = "foreign";
    fs.writeFileSync(
      paths(temp).trace,
      events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    );
    cases.push([
      "tampered invocation or trace rejected",
      inspectPipeline(temp).code === 1,
    ]);
    pkg("node scripts/read.mjs");
    run = runPipeline(temp, {
      quiet: true,
      spawn: () => ({ status: null, signal: "SIGTERM" }),
    });
    cases.push([
      "signal produces failed lifecycle",
      run.code === 1 && run.proof.status === "failed",
    ]);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
  let failed = 0;
  for (const [name, ok] of cases) {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  }
  console.log(
    `${cases.length - failed}/${cases.length} postbuild self-tests passing`,
  );
  return failed ? 1 : 0;
}

export function main(argv = process.argv.slice(2)) {
  if (
    argv.length > 1 ||
    argv.some(
      (a) => !["--run", "--instrument", "--check", "--self-test"].includes(a),
    )
  ) {
    console.error("Usage: --run | --instrument | --check | --self-test");
    return 2;
  }
  if (argv[0] === "--self-test") return selfTest();
  try {
    if (["--run", "--instrument"].includes(argv[0])) {
      const result = runPipeline();
      if (result.code)
        console.error(
          "Postbuild lifecycle failed; its receipt cannot certify completion.\n" +
            (
              result.proof.validationErrors ||
              result.proof.results
                .filter((step) => step.status !== 0)
                .map(
                  (step) =>
                    `${step.id}: exit ${step.status}; ${step.error || step.signal || "failed"}`,
                )
            ).join("\n"),
        );
      return result.code;
    }
    const result = inspectPipeline();
    if (result.code) console.error(result.errors.join("\n"));
    else
      console.log(
        `postbuild ordering: ${result.steps} completed steps; ${result.eventCount} successful HTML filesystem/hash events; exact-full-file hash ordering verified; partial/chunked/arbitrary dataflow unmeasured; invocation and source bound`,
      );
    return result.code;
  } catch (error) {
    console.error(`postbuild: ${error.message}`);
    return 1;
  }
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
)
  process.exitCode = main();
