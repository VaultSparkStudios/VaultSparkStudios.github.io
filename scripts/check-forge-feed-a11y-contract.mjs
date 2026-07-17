#!/usr/bin/env node

/**
 * Guards the Forge Feed's list semantics. A native <ul> must remain a list;
 * role="feed" would replace that semantic and require role="article" children,
 * producing three deterministic Lighthouse accessibility failures.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "assets", "forge-feed.js"), "utf8");
const failures = [];

if (!source.includes('<ul class="ff-list" aria-label="Forge Feed activity stream">')) {
  failures.push("Forge Feed must render a labelled native <ul>.");
}
if (/class="ff-list"[^>]*\srole=/.test(source)) {
  failures.push("Forge Feed <ul> must not override native list semantics with an ARIA role.");
}
if (!source.includes('<li class="ff-row ff-row--')) {
  failures.push("Forge Feed rows must remain native <li> children.");
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}

console.log("check-forge-feed-a11y-contract: ok (native list semantics preserved)");
