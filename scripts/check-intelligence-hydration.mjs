#!/usr/bin/env node
// check-intelligence-hydration.mjs
// Guards the Oracle + Studio Pulse public intelligence surfaces against the
// placeholder-with-data-present failure class. It intentionally stays static and
// fast: parse executable inline scripts, then verify the shared public request
// spine that keeps production hydrated without probing private local paths.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SELF_TEST = process.argv.includes('--self-test');

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function executableScript(attrs) {
  const type = (attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1] || '').toLowerCase();
  if (!type) return true;
  return [
    'text/javascript',
    'application/javascript',
    'module',
  ].includes(type);
}

function checkOracleInline(html) {
  const failures = [];
  let idx = 0;
  html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_all, attrs, body) => {
    idx += 1;
    if (attrs.match(/\bsrc\s*=/i)) return;
    if (!executableScript(attrs)) return;
    try {
      new vm.Script(body, { filename: `oracle-inline-${idx}` });
    } catch (error) {
      failures.push(`oracle inline script ${idx} does not parse: ${error.message}`);
    }
  });
  return failures;
}

function checkOracleFeedSpine(html, extraJs) {
  const failures = [];
  assert(html.includes('window.VSOracleFeeds'), 'Oracle missing shared feed spine', failures);
  assert(html.includes("'/api/ecosystem-velocity.json'"), 'Oracle missing public 60-day velocity source', failures);
  assert(html.includes("'/api/ecosystem-state.json'"), 'Oracle missing public ecosystem source', failures);
  assert(html.includes('const cache = new Map()'), 'Oracle feed spine missing promise cache', failures);
  assert(extraJs.includes('self.VSOracleFeeds'), 'Oracle expansion panels bypass shared feed spine', failures);
  const productionIgnisFetch = /fetch\(\s*['"]\/ignis\/output\//;
  assert(!productionIgnisFetch.test(html) && !productionIgnisFetch.test(extraJs), 'Oracle reintroduced a production private-feed probe', failures);
  return failures;
}

function runLive() {
  const failures = [];
  const oracleHtml = readFileSync(resolve(ROOT, 'oracle', 'index.html'), 'utf8');
  const oracleExtra = readFileSync(resolve(ROOT, 'assets', 'oracle-extra.js'), 'utf8');
  const livingJs = readFileSync(resolve(ROOT, 'assets', 'studio-living.js'), 'utf8');
  const ecosystemVelocity = JSON.parse(readFileSync(resolve(ROOT, 'api', 'ecosystem-velocity.json'), 'utf8'));
  const ecosystemState = JSON.parse(readFileSync(resolve(ROOT, 'api', 'ecosystem-state.json'), 'utf8'));
  const publicIntel = JSON.parse(readFileSync(resolve(ROOT, 'api', 'public-intelligence.json'), 'utf8'));

  failures.push(...checkOracleInline(oracleHtml));
  failures.push(...checkOracleFeedSpine(oracleHtml, oracleExtra));
  assert(!oracleHtml.includes('var wks = pub.weeks, n = wks.length'), 'Oracle weekly fallback reintroduced function-scope n collision', failures);
  assert(Array.isArray(ecosystemVelocity.series?.dates) && ecosystemVelocity.series.dates.length >= 30, 'api/ecosystem-velocity.json missing daily date series', failures);
  assert(Array.isArray(ecosystemVelocity.series?.commits) && ecosystemVelocity.series.commits.length === ecosystemVelocity.series.dates.length, 'api/ecosystem-velocity.json commits/date series mismatch', failures);
  assert(typeof ecosystemState.ignisAggregate?.currentStudioScore === 'number', 'api/ecosystem-state.json missing public cognition score', failures);
  assert(livingJs.includes('public-catalog-nodes-no-founder-confirmed-edges'), 'Studio Pulse missing public catalog-node graph fallback', failures);
  assert(Array.isArray(publicIntel.catalog) && publicIntel.catalog.length > 0, 'public intelligence catalog missing', failures);
  assert(Array.isArray(publicIntel.activityHeatmap) && publicIntel.activityHeatmap.length > 0, 'public intelligence activity heatmap missing', failures);

  return failures;
}

function runSelfTest() {
  const html = '<script type="application/ld+json">{"x":1}</script><script>const ok = 1;</script>';
  const failures = checkOracleInline(html);
  const feedFixture = "window.VSOracleFeeds; const cache = new Map(); '/api/ecosystem-velocity.json'; '/api/ecosystem-state.json';";
  failures.push(...checkOracleFeedSpine(feedFixture, 'self.VSOracleFeeds'));
  const badFeed = checkOracleFeedSpine(`${feedFixture} fetch('/ignis/output/ecosystem-state.json')`, 'self.VSOracleFeeds');
  if (!badFeed.some((failure) => failure.includes('private-feed probe'))) failures.push('private-feed probe fixture was not rejected');
  if (failures.length) {
    console.error('✗ check-intelligence-hydration self-test failed');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('✓ check-intelligence-hydration self-test: inline parser + shared public feed spine');
}

if (SELF_TEST) runSelfTest();
else {
  const failures = runLive();
  if (failures.length) {
    console.error('✗ check-intelligence-hydration: intelligence surface fallback drift');
    failures.forEach((f) => console.error('  - ' + f));
    process.exit(1);
  }
  console.log('✓ check-intelligence-hydration: Oracle + Studio Pulse public fallbacks wired');
}
