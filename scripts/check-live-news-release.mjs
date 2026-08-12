#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const EDGE_ORIGIN = (process.env.NEWS_RELEASE_ORIGIN || "https://vaultsparkstudios.com").replace(/\/$/, "");
const CONTENT_ORIGIN = (process.env.NEWS_RELEASE_CONTENT_ORIGIN || EDGE_ORIGIN).replace(/\/$/, "");
const BROWSER_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
};

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

async function fetchBytes(url, allowedStatuses = [200]) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: BROWSER_HEADERS,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!allowedStatuses.includes(response.status)) throw new Error(`${url} returned HTTP ${response.status}`);
  return { status: response.status, bytes: Buffer.from(await response.arrayBuffer()) };
}

async function main() {
  const candidateHtml = await readFile(resolve(ROOT, "news/index.html"), "utf8");
  const contract = extractReleaseContract(candidateHtml);
  const contentResponse = await fetchBytes(`${CONTENT_ORIGIN}/news/`);
  const liveHtml = contentResponse.bytes.toString("utf8");

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
  const liveArt = (await fetchBytes(`${CONTENT_ORIGIN}/${contract.artPath}`)).bytes;
  const candidateHash = sha256(candidateArt);
  const liveHash = sha256(liveArt);
  if (liveHash !== candidateHash) {
    throw new Error(`live News art is stale for ${contract.artPath}\nexpected: ${candidateHash}\nactual:   ${liveHash}`);
  }

  if (CONTENT_ORIGIN !== EDGE_ORIGIN) {
    const edge = await fetchBytes(`${EDGE_ORIGIN}/news/`, [200, 403]);
    if (edge.status === 200) {
      const edgeHtml = edge.bytes.toString("utf8");
      const edgeContract = extractReleaseContract(edgeHtml);
      if (edgeContract.description !== contract.description || !edgeHtml.includes(contract.artPath)) {
        throw new Error("canonical edge returned 200 with stale News bytes");
      }
    } else {
      console.log("canonical edge returned its known datacenter challenge (HTTP 403); exact bytes verified at the deployed Pages origin");
    }
  }

  console.log(`live News release verified: description exact · icons 3/3 · art ${contract.artPath} ${liveHash.slice(0, 12)} · content ${CONTENT_ORIGIN}`);
}

main().catch((error) => {
  console.error(`live News release check failed: ${error.message}`);
  process.exitCode = 1;
});
