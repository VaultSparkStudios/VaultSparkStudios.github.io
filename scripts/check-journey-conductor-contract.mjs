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
    ['immediate arrival cannot qualify', /if \(secondPage\) offer\('second-page'\)/.test(journeySource) && /STARTED_AT < 2200/.test(journeySource)],
    ['four explicit intent triggers exist', ['second-page', 'command-palette', 'engaged-scroll', 'project-action'].every((token) => journeySource.includes(token))],
    ['four route-aware tours exist', ['game:', 'membership:', 'studio:', 'general:'].every((token) => journeySource.includes(token))],
    ['onboarding lifecycle is complete', ['onboard_offered', 'onboard_started', 'onboard_completed', 'onboard_dismissed'].every((token) => journeySource.includes(token))],
    ['game bridge keeps source attribution', journeySource.includes("'/membership/?from='") && journeySource.includes("'/proof/?from='")],
    ['feedback is post-decision and cooled down', journeySource.includes('vs:decision-complete') && journeySource.includes('7 * 86400000')],
    ['feedback has three bounded choices', ['clarity', 'proof', 'value'].every((token) => journeySource.includes("['" + token + "'"))],
    ['feedback promise names threshold five', journeySource.includes('at least five responses')],
    ['command palette publishes intent', paletteSource.includes('vs:command-palette-intent')],
    ['resume compass skips first page', constellationSource.includes('if (visited.length < 2) return null')],
    ['resume compass is local-only', constellationSource.includes('COMPASS_DISMISSED_KEY') && !constellationSource.includes("fetch('/api/constellation-progress")],
    ['reduced motion is respected', journeySource.includes('prefers-reduced-motion')],
    ['no visitor identity endpoint', !/supabase|obelisk\/session|\/auth\/me/i.test(journeySource)],
  ];
}

const sources = {
  journeySource: readFileSync('assets/journey-conductor.js', 'utf8'),
  loaderSource: readFileSync('assets/ambient-loader.js', 'utf8'),
  paletteSource: readFileSync('assets/command-palette.js', 'utf8'),
  constellationSource: readFileSync('assets/constellation-tracker.js', 'utf8'),
};
const checks = inspect(sources);
const failures = checks.filter(([, ok]) => !ok);
if (process.argv.includes('--self-test')) {
  const synthetic = inspect({ journeySource: '', loaderSource: "src: '/assets/smart-trial-offer.js'", paletteSource: '', constellationSource: '' });
  if (synthetic.filter(([, ok]) => !ok).length < 12) throw new Error('negative fixture did not fail closed');
}
checks.forEach(([name, ok]) => console.log(`${ok ? '✓' : '✗'} ${name}`));
console.log(`journey conductor contract: ${checks.length - failures.length}/${checks.length} passing`);
if (failures.length) process.exit(1);
