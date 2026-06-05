#!/usr/bin/env node
// Validate that named imports inside studio-hub/src and scripts/ resolve to
// actual named exports in the target module. Closes the S109 feedbackView
// class of defect (imported `getRuntimeConfig`, target only exports
// `getHubRuntimeConfig`).
//
// Scope: studio-hub/src/**/*.js + scripts/**/*.mjs, relative-path imports only.
// Skips: bare specifiers, absolute URLs, default imports, namespace imports.

import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
// Each entry: { dir: relative root, ext: required file extension }
// Replaces node:fs/promises `glob` (Node 22+) so this runs on the Node 20 CI runner.
const SCAN_DIRS = [
  { dir: "studio-hub/src", ext: ".js" },
  { dir: "scripts", ext: ".mjs" },
];

// Portfolio-level scripts whose deps live in studio-ops, not this repo.
// They're inert here (never invoked from this tree) — skipping avoids false
// positives while preserving the validator's strictness on live code.
const SKIP_FILES = new Set(["scripts/compile-automation-queue.mjs"]);

const NAMED_IMPORT = /^\s*import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/gm;
const NAMED_EXPORT = /^\s*export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^\s*export\s*\{([^}]+)\}/gm;
const EXPORT_STAR = /^\s*export\s*\*\s*from\s*["']([^"']+)["']/gm;

async function walkDir(absDir, ext, relRoot) {
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkDir(abs, ext, relRoot)));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      out.push(relative(relRoot, abs));
    }
  }
  return out;
}

async function listFiles() {
  const out = [];
  for (const { dir, ext } of SCAN_DIRS) {
    out.push(...(await walkDir(resolve(ROOT, dir), ext, ROOT)));
  }
  return out;
}

function parseImportNames(block) {
  // For `import { x as y }` the target module must export `x` (pre-rename).
  return block
    .split(",")
    .map((s) => s.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);
}

function parseExportNames(block) {
  // For `export { x as y }` the externally-visible name is `y` (post-rename).
  return block
    .split(",")
    .map((s) => {
      const parts = s.trim().split(/\s+as\s+/);
      return (parts[1] || parts[0] || "").trim();
    })
    .filter(Boolean);
}

async function collectExports(absPath, seen = new Set()) {
  if (seen.has(absPath)) return new Set();
  seen.add(absPath);
  let src;
  try {
    src = await readFile(absPath, "utf8");
  } catch {
    return null; // missing file — report to caller
  }
  const names = new Set();
  for (const m of src.matchAll(NAMED_EXPORT)) names.add(m[1]);
  for (const m of src.matchAll(EXPORT_LIST)) for (const n of parseExportNames(m[1])) names.add(n);
  for (const m of src.matchAll(EXPORT_STAR)) {
    const starPath = resolvePath(absPath, m[1]);
    if (starPath) {
      const child = await collectExports(starPath, seen);
      if (child) for (const n of child) names.add(n);
    }
  }
  return names;
}

function resolvePath(fromAbs, spec) {
  if (!spec.startsWith(".")) return null;
  const base = resolve(dirname(fromAbs), spec);
  if (/\.(m?js)$/.test(base)) return base;
  return fromAbs.endsWith(".mjs") ? `${base}.mjs` : `${base}.js`;
}

async function validate() {
  const files = await listFiles();
  const issues = [];
  for (const rel of files) {
    if (SKIP_FILES.has(rel.replace(/\\/g, "/"))) continue;
    const abs = resolve(ROOT, rel);
    const src = await readFile(abs, "utf8");
    for (const m of src.matchAll(NAMED_IMPORT)) {
      const names = parseImportNames(m[1]);
      const spec = m[2];
      if (!spec.startsWith(".")) continue;
      const targetAbs = resolvePath(abs, spec);
      if (!targetAbs) continue;
      const exports = await collectExports(targetAbs);
      if (exports === null) {
        issues.push({ file: rel, spec, problem: "target file not found", names });
        continue;
      }
      for (const n of names) {
        if (!exports.has(n)) {
          issues.push({ file: rel, spec, problem: `missing named export \`${n}\``, names: [n] });
        }
      }
    }
  }
  return { files: files.length, issues };
}

const { files, issues } = await validate();
if (issues.length === 0) {
  console.log(`validate-module-imports: clean (${files} files scanned)`);
  process.exit(0);
}
console.error(`validate-module-imports: ${issues.length} issue(s) across ${files} files:`);
for (const i of issues) {
  console.error(`  ✗ ${i.file} → import from "${i.spec}" — ${i.problem}`);
}
process.exit(1);
