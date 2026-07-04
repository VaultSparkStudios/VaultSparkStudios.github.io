#!/usr/bin/env node
/**
 * check-cta-impression-contracts.mjs
 *
 * Guards tracked CTA denominators against inflated impressions. A `*:shown`
 * event must be emitted from a viewport observer, and the family must be present
 * in the UX rollup so click-through rates stay source-derived.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const CONTRACTS = [
  {
    family: 'play-next',
    source: 'assets/cross-game-play-next.js',
    shownEvent: 'play-next:shown',
    clickEvent: 'play-next:click',
    rollupNeedle: "family: 'play-next'",
    epoch: '2026-07-02',
    gatedCall: 'countImpression();',
  },
  {
    family: 'proof-line',
    source: 'assets/proof-conversion-line.js',
    shownEvent: 'proof-line:shown',
    clickEvent: 'proof-line:click',
    rollupNeedle: "family: 'proof-line'",
  },
];

function observerBlocks(source) {
  const blocks = [];
  const re = /IntersectionObserver[\s\S]*?threshold\s*:\s*\[\s*0\.5\s*\]/g;
  let match;
  while ((match = re.exec(source))) blocks.push(match[0]);
  return blocks;
}

export function analyzeCtaContract(source, rollupSource, contract) {
  const blocks = observerBlocks(source);
  const observerGatesShown = blocks.some((block) => block.includes(contract.shownEvent) || (contract.gatedCall && block.includes(contract.gatedCall)));
  const result = {
    hasShownEmit: source.includes(contract.shownEvent),
    hasClickEmit: source.includes(contract.clickEvent),
    hasIntersectionObserver: blocks.length > 0,
    hasHalfThreshold: blocks.length > 0,
    observerGatesShown,
    hasRollupFamily: rollupSource.includes(contract.rollupNeedle),
    hasEpoch: !contract.epoch || new RegExp(`family:\\s*['"]${contract.family}['"][\\s\\S]*epoch:\\s*['"]${contract.epoch}['"]`).test(rollupSource),
  };
  result.ok = Object.values(result).every(Boolean);
  return result;
}

function runSelfTest() {
  const source = [
    'function armShownBeacon(){',
    'var io = new IntersectionObserver(function(){',
    "emitUx('proof-line:shown');",
    "emitUx('proof-line:click');",
    '}, { threshold: [0.5] });',
    '}',
  ].join('\n');
  const rollup = "const FAMILIES = [{ family: 'proof-line', parts: ['shown', 'click'] }, { family: 'play-next', epoch: '2026-07-02' }];";
  const contract = CONTRACTS.find((c) => c.family === 'proof-line');
  const playContract = CONTRACTS.find((c) => c.family === 'play-next');
  const indirect = [
    'function countImpression(){ emitUx(\'play-next:shown\'); }',
    "emitUx('play-next:click');",
    'new IntersectionObserver(function(){ countImpression(); }, { threshold: [0.5] });',
  ].join('\n');
  const cases = [
    ['good contract passes', analyzeCtaContract(source, rollup, contract).ok],
    ['indirect observer-gated helper passes', analyzeCtaContract(indirect, rollup, playContract).ok],
    ['missing observer fails', !analyzeCtaContract(source.replace('IntersectionObserver', 'MutationObserver'), rollup, contract).ok],
    ['offscreen emit fails', !analyzeCtaContract("emitUx('proof-line:shown');\nemitUx('proof-line:click');", rollup, contract).ok],
    ['missing rollup family fails', !analyzeCtaContract(source, rollup.replace("family: 'proof-line'", "family: 'other'"), contract).ok],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
  if (failed.length) {
    console.error(`check-cta-impression-contracts --self-test: ${failed.length} failure(s)`);
    process.exit(1);
  }
  console.log('check-cta-impression-contracts --self-test: all passed');
}

function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }
  const rollupSource = readFileSync(resolve(ROOT, 'scripts', 'rollup-rum-ux.mjs'), 'utf8');
  const failures = [];
  for (const contract of CONTRACTS) {
    const source = readFileSync(resolve(ROOT, contract.source), 'utf8');
    const result = analyzeCtaContract(source, rollupSource, contract);
    if (!result.ok) failures.push({ contract, result });
  }
  if (failures.length) {
    console.error('[cta-impression-contracts] failed: tracked CTA impressions must be true viewport impressions');
    for (const { contract, result } of failures) {
      console.error(`  • ${contract.family}`);
      for (const [key, value] of Object.entries(result)) {
        if (key !== 'ok' && !value) console.error(`    - missing/false: ${key}`);
      }
    }
    process.exit(1);
  }
  console.log(`[cta-impression-contracts] ${CONTRACTS.length} tracked CTA family contract(s) intact`);
}

const isDirect = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isDirect) main();