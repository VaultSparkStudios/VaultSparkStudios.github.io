#!/usr/bin/env node
/**
 * One machine-readable route registry renders the same intelligence wayfinding
 * across every public intelligence surface. Retired aliases are owned by the
 * canonical route-consolidation registry so shell processing cannot fight this
 * generator over their final bytes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'intelligence-suite.json'), 'utf8'));
const CHECK = process.argv.includes('--check');
const SELF_TEST = process.argv.includes('--self-test');
const START = '<!-- intelligence-suite:start -->';
const END = '<!-- intelligence-suite:end -->';

export function renderSuite(activeHref, config = CONFIG) {
  const links = config.routes.map((route) => {
    const current = route.href === activeHref ? ' aria-current="page"' : '';
    return '<a href="' + route.href + '"' + current + '><span>' + route.label + '</span><small>· ' + route.detail + '</small></a>';
  }).join('');
  return START + '\n<link rel="stylesheet" href="/assets/intelligence-suite.css">\n<nav class="intel-suite" aria-label="' + config.label + '"><b class="intel-suite__label">' + config.label + '</b><div class="intel-suite__rail">' + links + '</div></nav>\n' + END;
}

export function injectSuite(html, activeHref, config = CONFIG) {
  const rendered = renderSuite(activeHref, config);
  if (html.includes(START) && html.includes(END)) {
    return html.replace(new RegExp(START + '[\\s\\S]*?' + END), rendered);
  }
  const legacy = /\s*<style>\.intel-suite[\s\S]*?<\/style>\s*<nav class="intel-suite"[\s\S]*?<\/nav>/;
  if (legacy.test(html)) return html.replace(legacy, '\n    ' + rendered);
  return html.replace(/(<main\b[^>]*>)/, '$1\n    ' + rendered);
}

function selfTest() {
  const fixture = '<main id="main-content"><h1>x</h1></main>';
  const once = injectSuite(fixture, '/oracle/');
  const twice = injectSuite(once, '/oracle/');
  if (once !== twice) throw new Error('renderer is not idempotent');
  if ((once.match(/aria-current="page"/g) || []).length !== 1) throw new Error('active route is not singular');
  if (!once.includes('/search/')) throw new Error('shared route registry is incomplete');
  console.log('build-intelligence-suite: self-test passed');
}

function main() {
  const failures = [];
  for (const route of CONFIG.routes) {
    const relative = route.href === '/' ? 'index.html' : route.href.slice(1) + 'index.html';
    const file = path.join(ROOT, relative);
    if (!fs.existsSync(file)) {
      failures.push(relative + ': route file missing');
      continue;
    }
    const current = fs.readFileSync(file, 'utf8');
    const expected = injectSuite(current, route.href);
    if (CHECK) {
      if (current !== expected) failures.push(relative + ': shared intelligence suite is stale');
    } else if (current !== expected) {
      fs.writeFileSync(file, expected);
      console.log('build-intelligence-suite: updated ' + relative);
    }
  }

  if (failures.length) {
    console.error('build-intelligence-suite: FAIL (' + failures.length + ')');
    failures.forEach((failure) => console.error('  - ' + failure));
    process.exit(1);
  }
  console.log('build-intelligence-suite: ' + (CHECK ? 'check passed' : 'rendered ' + CONFIG.routes.length + ' routes'));
}

if (SELF_TEST) selfTest();
else main();
