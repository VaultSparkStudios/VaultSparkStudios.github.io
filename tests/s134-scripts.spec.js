// tests/s134-scripts.spec.js — script-level tests for S134 deliverables.
// Uses Playwright as a runner only (no browser launched); spawns each Node
// script and asserts on output + side-effect files.

const { test, expect } = require('@playwright/test');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');

function run(cmd) {
  return execSync(cmd, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

test.describe('S134 scripts', () => {

  test('audit-site-links runs and writes report + cache', () => {
    // Will exit 1 if any issues are present; we just want to verify it produces output.
    let out;
    try { out = run('node scripts/audit-site-links.mjs'); }
    catch (e) { out = e.stdout || e.stderr || String(e); }
    expect(out).toMatch(/Link audit complete/);
    expect(out).toMatch(/scanned: \d+ files/);
    expect(fs.existsSync(path.join(REPO, '.cache', 'link-audit.json'))).toBe(true);
    expect(fs.existsSync(path.join(REPO, 'docs', 'LINK_AUDIT_S134.md'))).toBe(true);
  });

  test('audit-site-links --json emits valid JSON', () => {
    let raw;
    try { raw = run('node scripts/audit-site-links.mjs --json'); }
    catch (e) { raw = e.stdout || ''; }
    const json = JSON.parse(raw);
    expect(json).toHaveProperty('scannedFiles');
    expect(json).toHaveProperty('scannedLinks');
    expect(json).toHaveProperty('findings');
    expect(Array.isArray(json.findings)).toBe(true);
  });

  test('propagate-ignis-blocks --dry produces a valid plan', () => {
    const out = run('node scripts/propagate-ignis-blocks.mjs --dry');
    expect(out).toMatch(/\[DRY RUN\]/);
    expect(out).toMatch(/pages:\s+\d+/);
    expect(out).toMatch(/blocks (injected|updated):/);
  });

  test('build-ecosystem-velocity emits a 60-day series', () => {
    const out = run('node scripts/build-ecosystem-velocity.mjs');
    expect(out).toMatch(/ecosystem-velocity/);
    const json = JSON.parse(fs.readFileSync(path.join(REPO, 'ignis', 'output', 'ecosystem-velocity.json'), 'utf8'));
    expect(json).toHaveProperty('schemaVersion');
    expect(json.series.dates.length).toBe(60);
    expect(json.series.commits.length).toBe(60);
    expect(json.series.ignis.length).toBe(60);
    expect(json.series.activeRepos.length).toBe(60);
    expect(json.ecosystem.totalRepos).toBeGreaterThan(0);
    expect(typeof json.ecosystem.totalCommits).toBe('number');
  });

  test('project-voices.json covers every page handled by the propagator', () => {
    const voicesPath = path.join(REPO, 'ignis', 'output', 'project-voices.json');
    const voices = JSON.parse(fs.readFileSync(voicesPath, 'utf8'));
    expect(String(voices.schemaVersion)).toMatch(/^[1-9]\d*\.\d+$/);

    const propagator = fs.readFileSync(path.join(REPO, 'scripts', 'propagate-ignis-blocks.mjs'), 'utf8');
    // Extract every `voice: '...'` token from the PAGES array
    const keys = [...propagator.matchAll(/voice:\s*'([\w-]+)'/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const k of keys) {
      // every voice key referenced in the propagator should have an entry
      expect(voices.voices[k], `voice missing for key "${k}"`).toBeTruthy();
      expect(typeof voices.voices[k].quote).toBe('string');
      expect(voices.voices[k].quote.length).toBeGreaterThan(20);
      expect(voices.voices[k].quote).not.toMatch(/\b(commits?|blockers?|Human Action Required|human-blocked)\b/i);
    }
  });

  test('ecosystem-state mirror is present and well-formed', () => {
    const p = path.join(REPO, 'ignis', 'output', 'ecosystem-state.json');
    if (!fs.existsSync(p)) test.skip(true, 'ecosystem-state mirror not yet produced — run studio-ops aggregator first');
    const eco = JSON.parse(fs.readFileSync(p, 'utf8'));
    expect(eco.schemaVersion).toBe('1.0');
    expect(Array.isArray(eco.projects)).toBe(true);
    expect(eco.projects.length).toBeGreaterThan(10);
    for (const proj of eco.projects.slice(0, 3)) {
      expect(proj).toHaveProperty('slug');
      expect(proj).toHaveProperty('vaultStatus');
      expect(proj).toHaveProperty('health');
    }
  });
});
