#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'route-consolidation.json'), 'utf8'));
const CHECK = process.argv.includes('--check');

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
function stub(rule) {
  const canonical = 'https://vaultsparkstudios.com' + rule.to;
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="' + esc(canonical) + '"><meta http-equiv="refresh" content="0;url=' + esc(rule.to) + '"><title>' + esc(rule.label) + ' moved — VaultSpark Studios</title></head><body><main><h1>' + esc(rule.label) + ' moved</h1><p>This route now lives at <a href="' + esc(rule.to) + '">' + esc(rule.to) + '</a>.</p></main></body></html>\n';
}

function selfTest() {
  const html = stub({ from: '/old/', to: '/new/#part', label: 'Old' });
  if (!html.includes('noindex,follow') || !html.includes('/new/#part') || !html.includes('rel="canonical"')) throw new Error('redirect stub contract failed');
  console.log('build-route-consolidation: self-test passed');
}

function main() {
  if (!fs.existsSync(path.join(ROOT, CONFIG.analysis))) throw new Error('analysis must exist before route writes');
  const drift = [];
  for (const rule of CONFIG.redirects) {
    const relative = rule.from.slice(1) + 'index.html';
    const file = path.join(ROOT, relative);
    const expected = stub(rule);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (CHECK && current !== expected) drift.push(relative);
    else if (!CHECK && current !== expected) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, expected);
      console.log('build-route-consolidation: retired ' + rule.from + ' → ' + rule.to);
    }
  }
  if (drift.length) {
    console.error('build-route-consolidation: FAIL · stale redirect stubs: ' + drift.join(', '));
    process.exit(1);
  }
  console.log('build-route-consolidation: ' + (CHECK ? 'check passed' : 'rendered') + ' · ' + CONFIG.redirects.length + ' analyzed redirects');
}

if (process.argv.includes('--self-test')) selfTest();
else main();
