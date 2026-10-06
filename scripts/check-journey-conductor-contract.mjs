#!/usr/bin/env node
// Structural contract for the local-first progression layer. Browser proof
// covers rendered behavior; this gate makes privacy and eligibility invariants
// fail closed during every build.
import { readFileSync } from 'node:fs';
import './check-attention-surface-contract.mjs';

export function inspect({ journeySource, loaderSource, paletteSource, constellationSource }) {
  return [
    ['old arrival offer is not loaded', !loaderSource.includes("src: '/assets/smart-trial-offer.js'")],
    ['journey conductor is predicate-loaded', loaderSource.includes("src: '/assets/journey-conductor.js'")],
    ['journey produces no floating guides', !journeySource.includes('showModal') && !journeySource.includes('vs-journey')],
    ['Spark owns requested navigation', paletteSource.includes('Spark') && paletteSource.includes('data-vs-palette-loader-trigger')],
    ['no engagement timers start guides', !journeySource.includes('setTimeout')],
    ['no scroll triggers start guides', !journeySource.includes("addEventListener('scroll'")],
    ['game bridge keeps source attribution', journeySource.includes("'/membership/?from='") && journeySource.includes("'/proof/?from='")],
    ['journey delegates requested feedback', journeySource.includes('window.VSSpark.open()')],
    ['legacy achievements remain readable', constellationSource.includes('vs_cst_unlocked')],
    ['constellations have no automatic UI', !constellationSource.includes('createElement')],
    ['command control is explicit', paletteSource.includes('openPalette')],
    ['resume compass is retired', !constellationSource.includes('renderCompass')],
    ['constellations have no network requests', !constellationSource.includes('fetch(')],
    ['Spark owns reduced motion', readFileSync('assets/spark-compass.js','utf8').includes('prefers-reduced-motion')],
    ['no visitor identity endpoint', !/supabase|obelisk\/session|\/auth\/me/i.test(journeySource)],
  ];
}

const sources = {
  journeySource: readFileSync('assets/journey-conductor.js', 'utf8'),
  loaderSource: readFileSync('assets/ambient-loader.js', 'utf8'),
  paletteSource: readFileSync('assets/command-palette-loader.js', 'utf8'),
  constellationSource: readFileSync('assets/constellation-tracker.js', 'utf8'),
};
const checks = inspect(sources);
const failures = checks.filter(([, ok]) => !ok);
if (process.argv.includes('--self-test')) {
  const synthetic = inspect({ journeySource: '', loaderSource: "src: '/assets/smart-trial-offer.js'", paletteSource: '', constellationSource: '' });
  if (synthetic.filter(([, ok]) => !ok).length < 5) throw new Error('negative fixture did not fail closed');
}
checks.forEach(([name, ok]) => console.log(`${ok ? '✓' : '✗'} ${name}`));
console.log(`journey conductor contract: ${checks.length - failures.length}/${checks.length} passing`);
if (failures.length) process.exit(1);
