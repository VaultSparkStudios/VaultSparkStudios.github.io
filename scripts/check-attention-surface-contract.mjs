#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const sources = {
  cookie: read('assets/cookie-consent.js'),
  pwa: read('assets/pwa-install.js'),
  ambient: read('assets/ambient-loader.js'),
  exit: read('assets/exit-intent.js'),
  depth: read('assets/visit-depth.js'),
  returning: read('assets/returning-visitor-digest.js'),
  journey: read('assets/journey-conductor.js'),
  portalAuth: read('vault-member/portal-auth.js'),
  portalInit: read('vault-member/portal-init.js'),
  portalDash: read('vault-member/portal-dashboard.js'),
};

const checks = [
  ['first visit reserves attention for consent', sources.cookie.includes("setItem(ATTENTION_KEY, 'cookie-consent')")],
  ['public modules share one session claim', sources.ambient.includes('vs_attention_surface_v1') && sources.ambient.includes('window.VSAttention')],
  ['install prompt requires consent', sources.pwa.includes("localStorage.getItem(CONSENT_KEY)")],
  ['install prompt requires engagement depth', sources.pwa.includes("vs_visit_count") && sources.pwa.includes('< 3')],
  ['install prompt uses a 30-day cooldown', sources.pwa.includes('30 * 24 * 60 * 60 * 1000')],
  ['exit intent uses shared attention and 30-day cooldown', sources.exit.includes("claim('exit-intent')") && sources.exit.includes('COOLDOWN_MS')],
  ['visit-depth uses shared attention and 30-day cooldown', sources.depth.includes("claim('visit-depth')") && sources.depth.includes('KEY_LAST_SHOWN')],
  ['returning homepage avoids duplicate floating digest', sources.returning.includes("(location.pathname || '/') === '/'")],
  ['redundant returning membership nudge removed', !sources.returning.includes('renderNudge')],
  ['journey tour and feedback both claim attention', sources.journey.includes("claim('journey-tour')") && sources.journey.includes("claim('decision-feedback')")],
  ['portal has one shared session claim', sources.portalAuth.includes('window.VSPortalAttention')],
  ['portal reserves functional onboarding first', sources.portalAuth.includes("claim('onboarding')")],
  ['informational portal tour waits for onboarding completion', sources.portalInit.includes("localStorage.getItem('onboarding_complete')")],
  ['portal release notes defer to the shared claim', sources.portalDash.includes("claim('whats-new')")],
  ['portal recap and anniversary defer to the shared claim', sources.portalDash.includes("claim('weekly-recap')") && sources.portalDash.includes("claim('anniversary')")],
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${label}`);
  if (!pass) failed += 1;
}
if (failed) {
  console.error(`Attention-surface contract failed: ${failed}/${checks.length}`);
  process.exit(1);
}
console.log(`Attention-surface contract passed: ${checks.length}/${checks.length}`);
