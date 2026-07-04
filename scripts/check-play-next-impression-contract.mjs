#!/usr/bin/env node
/**
 * check-play-next-impression-contract.mjs
 *
 * S249 fixed a measurement bug where play-next:shown counted engagement-trigger
 * reveals rather than actual viewport views. This guard keeps that CTA from
 * drifting back to a dishonest denominator.
 */
import { readFileSync } from 'node:fs';
import { CTA_CONTRACTS } from './lib/cta-contract-registry.mjs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SOURCE = resolve(ROOT, 'assets', 'cross-game-play-next.js');
const ROLLUP = resolve(ROOT, 'scripts', 'rollup-rum-ux.mjs');
const EXPECTED_EPOCH = '2026-07-02';

export function analyzePlayNextSource(source, rollupSource) {
  const hasShownEmit = /emitUx\(['"]play-next:shown['"]/.test(source);
  const hasVariantEmit = /emitUx\(['"]cta:variant:play-next:/.test(source);
  const hasIntersectionObserver = /IntersectionObserver/.test(source);
  const hasHalfThreshold = /threshold\s*:\s*\[\s*0\.5\s*\]/.test(source);
  const shownIndex = source.indexOf("emitUx('play-next:shown'");
  const observerIndex = source.indexOf('IntersectionObserver');
  const observerBeforeShown = observerIndex >= 0 && shownIndex >= 0 && observerIndex < shownIndex;
  const epochPattern = new RegExp(`family:\\s*['"]play-next['"][\\s\\S]*epoch:\\s*['"]${EXPECTED_EPOCH}['"]`);
  const registryEpoch = CTA_CONTRACTS.some((contract) => contract.family === 'play-next' && contract.epoch === EXPECTED_EPOCH);
  const hasEpoch = epochPattern.test(rollupSource) || (/CTA_CONTRACTS/.test(rollupSource) && registryEpoch);
  return {
    hasShownEmit,
    hasVariantEmit,
    hasIntersectionObserver,
    hasHalfThreshold,
    observerBeforeShown,
    hasEpoch,
    ok: hasShownEmit && hasVariantEmit && hasIntersectionObserver && hasHalfThreshold && observerBeforeShown && hasEpoch,
  };
}

function runSelfTest() {
  const goodSource = [
    'function arm(){',
    'var io = new IntersectionObserver(function(){',
    "emitUx('play-next:shown', slug);",
    "emitUx('cta:variant:play-next:' + variant, slug);",
    '}, { threshold: [0.5] });',
    '}',
  ].join('\n');
  const goodRollup = "{ family: 'play-next', parts: ['shown'], epoch: '2026-07-02' }";
  const cases = [
    ['good contract passes', analyzePlayNextSource(goodSource, goodRollup).ok],
    ['missing observer fails', !analyzePlayNextSource(goodSource.replace('IntersectionObserver', 'MutationObserver'), goodRollup).ok],
    ['missing variant attribution fails', !analyzePlayNextSource(goodSource.replace("emitUx('cta:variant:play-next:' + variant, slug);", ''), goodRollup).ok],
    ['wrong epoch fails', !analyzePlayNextSource(goodSource, goodRollup.replace('2026-07-02', '2026-06-18')).ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-play-next-impression-contract --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log('check-play-next-impression-contract --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }
  const result = analyzePlayNextSource(readFileSync(SOURCE, 'utf8'), readFileSync(ROLLUP, 'utf8'));
  if (!result.ok) {
    console.error('[play-next-impression] contract failed: play-next must count true viewport impressions only');
    for (const [key, value] of Object.entries(result)) {
      if (key !== 'ok' && !value) console.error(`  • missing/false: ${key}`);
    }
    process.exit(1);
  }
  console.log('[play-next-impression] true-viewport impression contract intact');
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();
