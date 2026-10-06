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
  ['install prompt adds no automatic UI', !/createElement|appendChild|innerHTML/.test(sources.pwa)],
  ['native installation remains explicitly available', sources.pwa.includes('window.VSInstallPrompt=event')],
  ['public discovery prompts are retired', /src: '\/assets\/exit-intent.js'[\s\S]*?when:[\s\S]*?return false/.test(sources.ambient)],
  ['exit intent uses shared attention and 30-day cooldown', sources.exit.includes("claim('exit-intent')") && sources.exit.includes('COOLDOWN_MS')],
  ['visit-depth uses shared attention and 30-day cooldown', sources.depth.includes("claim('visit-depth')") && sources.depth.includes('KEY_LAST_SHOWN')],
  ['returning homepage avoids duplicate floating digest', sources.returning.includes("(location.pathname || '/') === '/'")],
  ['redundant returning membership nudge removed', !sources.returning.includes('renderNudge')],
  ['journey has no automatic overlay or tour', !/showModal|journey-tour|setTimeout|addEventListener\('scroll'/.test(sources.journey)],
  ['portal has one shared session claim', sources.portalAuth.includes('window.VSPortalAttention')],
  ['portal reserves functional onboarding first', sources.portalAuth.includes("claim('onboarding')")],
  // S368: Vault Initiation owns the first session; the informational tour is
  // on demand only (window.openPortalTour) and never adds the open class by itself.
  ['informational portal tour is on demand only, never automatic',
    sources.portalInit.includes('window.openPortalTour = function')
    && (sources.portalInit.match(/overlay\.classList\.add\('open'\)/g) || []).length === 1
    && /window\.openPortalTour = function[\s\S]*overlay\.classList\.add\('open'\)/.test(sources.portalInit)],
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
