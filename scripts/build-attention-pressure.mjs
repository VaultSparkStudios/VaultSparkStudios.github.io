#!/usr/bin/env node
/**
 * Public, privacy-thresholded interruption-pressure receipt.
 *
 * Source of truth is api/funnel-summary.json, itself derived from committed
 * aggregate RUM history. This file never reads raw browser rows and never
 * publishes routes, identifiers, session keys, or sub-floor cohort counts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'api', 'funnel-summary.json');
const OUT = path.join(ROOT, 'api', 'attention-pressure.json');
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');

export function buildAttentionPressureArtifact(summary) {
  const pressure = summary?.attentionPressure || {};
  const cohorts = pressure.cohorts && typeof pressure.cohorts === 'object' ? pressure.cohorts : {};
  const sampleFloor = Number(pressure.sampleFloor) || Number(summary?.minSamples) || 20;
  const safeCohorts = {};
  for (const key of Object.keys(cohorts).sort()) {
    const row = cohorts[key];
    if (!row || Number(row.count) < sampleFloor) continue;
    if (!/^[a-z0-9-]+\|(first|returning|established|unknown)$/.test(key)) continue;
    safeCohorts[key] = {
      surface: row.surface,
      depth: row.depth,
      count: Number(row.count),
    };
  }
  const observed = pressure.state === 'observed' && Object.keys(safeCohorts).length > 0
    && Number(pressure.totalClaims) >= sampleFloor;
  return {
    schemaVersion: '1.0',
    generatedAt: summary?.asOf || null,
    generatedBy: 'scripts/build-attention-pressure.mjs',
    publicSafe: true,
    state: observed ? 'observed' : 'collecting',
    totalClaims: observed ? Number(pressure.totalClaims) : null,
    sampleFloor,
    cohorts: observed ? safeCohorts : {},
    observationWindow: observed
      ? pressure.observationWindow || { start: null, end: null }
      : { start: null, end: null },
    privacy: {
      aggregateOnly: true,
      postConsentOnly: true,
      identifiersStored: false,
      routesPublished: false,
      subFloorCountsPublished: false,
    },
    note: observed
      ? 'Post-consent automatic-surface claims by fixed surface and coarse visit-depth bucket.'
      : 'Collecting post-consent claims; no surface/depth cohort clears the privacy floor yet.',
  };
}

function selfTest() {
  const dark = buildAttentionPressureArtifact({
    asOf: '2026-08-28',
    minSamples: 20,
    attentionPressure: {
      state: 'collecting',
      totalClaims: null,
      sampleFloor: 20,
      cohorts: { 'visit-depth|first': { surface: 'visit-depth', depth: 'first', count: 2 } },
    },
  });
  const visible = buildAttentionPressureArtifact({
    asOf: '2026-08-28',
    minSamples: 20,
    attentionPressure: {
      state: 'observed',
      totalClaims: 22,
      sampleFloor: 20,
      cohorts: {
        'visit-depth|returning': { surface: 'visit-depth', depth: 'returning', count: 22 },
        'free-text|visitor-42': { surface: 'free-text', depth: 'visitor-42', count: 99 },
      },
      observationWindow: { start: '2026-08-27', end: '2026-08-28' },
    },
  });
  const checks = [
    dark.state === 'collecting' && dark.totalClaims === null,
    Object.keys(dark.cohorts).length === 0,
    visible.state === 'observed' && visible.totalClaims === 22,
    visible.cohorts['visit-depth|returning'].count === 22,
    !Object.prototype.hasOwnProperty.call(visible.cohorts, 'free-text|visitor-42'),
    visible.privacy.identifiersStored === false && visible.privacy.routesPublished === false,
  ];
  if (checks.some((ok) => !ok)) {
    console.error('build-attention-pressure --self-test: failed');
    process.exit(1);
  }
  console.log('build-attention-pressure --self-test: 6/6 passed');
}

if (SELF_TEST) {
  selfTest();
} else {
  const summary = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const next = JSON.stringify(buildAttentionPressureArtifact(summary), null, 2) + '\n';
  if (CHECK) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (current !== next) {
      console.error('build-attention-pressure --check: drift');
      process.exit(1);
    }
    console.log('build-attention-pressure --check: current');
  } else {
    fs.writeFileSync(OUT, next, 'utf8');
    console.log('build-attention-pressure: wrote api/attention-pressure.json');
  }
}
