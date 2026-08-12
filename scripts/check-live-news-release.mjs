#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const ORIGIN = (process.env.NEWS_RELEASE_ORIGIN || "https://vaultsparkstudios.com").replace(/\/$/, "");

function decodeHtml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractReleaseContract(html) {
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
  const artPath = html.match(/(?:src|srcset)="(?:\.\.\/)*\/?(assets\/og\/news\/[^"\s,]+\.avif)/i)?.[1];
  if (!description) throw new Error("candidate News page has no meta description");
  if (!artPath) throw new Error("candidate News page has no AVIF article art");
  return { description: decodeHtml(description), artPath };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const candidateHtml = await readFile(resolve(ROOT, "news/index.html"), "utf8");
  const contract = extractReleaseContract(candidateHtml);
  const liveHtml = (await fetchBytes(`${ORIGIN}/news/`)).toString("utf8");

  const liveContract = extractReleaseContract(liveHtml);
  if (liveContract.description !== contract.description) {
    throw new Error(`live News description is stale\nexpected: ${contract.description}\nactual:   ${liveContract.description}`);
  }
  if (!liveHtml.includes(contract.artPath)) {
    throw new Error(`live News page does not reference candidate art ${contract.artPath}`);
  }

  const requiredIcons = [
    'rel="icon" type="image/png" sizes="32x32" href="/assets/icon-32.png"',
    'rel="apple-touch-icon" sizes="256x256" href="/assets/icon-256.png"',
    'rel="manifest" href="/manifest.json"',
  ];
  for (const declaration of requiredIcons) {
    if (!liveHtml.includes(declaration)) throw new Error(`live News page is missing ${declaration}`);
  }

  const candidateArt = await readFile(resolve(ROOT, contract.artPath));
  const liveArt = await fetchBytes(`${ORIGIN}/${contract.artPath}`);
  const candidateHash = sha256(candidateArt);
  const liveHash = sha256(liveArt);
  if (liveHash !== candidateHash) {
    throw new Error(`live News art is stale for ${contract.artPath}\nexpected: ${candidateHash}\nactual:   ${liveHash}`);
  }

  console.log(`live News release verified: description exact · icons 3/3 · art ${contract.artPath} ${liveHash.slice(0, 12)}`);
}

main().catch((error) => {
  console.error(`live News release check failed: ${error.message}`);
  process.exitCode = 1;
});
