#!/usr/bin/env node
/** Source-derived footer completeness contract for the canonical homepage shell. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'config', 'footer-manifest.json');
const WRITE = process.argv.includes('--write');
const SELF_TEST = process.argv.includes('--self-test');

export function linkKey(raw) {
  let value = String(raw || '').trim();
  if (!value || /^(mailto:|tel:|https?:\/\/)/i.test(value)) return '';
  value = value.replace(/[?#].*$/, '');
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value.toLowerCase();
}

function section(html, re, label) {
  const match = html.match(re);
  if (!match) throw new Error(`${label} section missing`);
  return match[0];
}

export function hrefs(html) {
  return [...html.matchAll(/\bhref=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((href) => linkKey(href))
    .filter((href, index, all) => all.findIndex((candidate) => linkKey(candidate) === linkKey(href)) === index);
}

export function deriveManifest(html) {
  const header = section(html, /<nav class="nav-center"[\s\S]*?<\/nav>/i, 'primary nav');
  const footer = section(html, /<footer class="site-footer"[\s\S]*?<\/footer>/i, 'footer');
  const footerLinks = hrefs(footer);
  const legalPages = ['/privacy/', '/cookies/', '/terms/', '/data-deletion/', '/contact/'];
  return {
    schemaVersion: '1.0',
    source: 'index.html canonical shell',
    headerLinks: hrefs(header),
    footerLinks,
    footerOnly: footerLinks.filter((href) => !hrefs(header).some((candidate) => linkKey(candidate) === linkKey(href))),
    legalPages,
  };
}

export function verify(manifest) {
  const footer = new Set((manifest.footerLinks || []).map(linkKey).filter(Boolean));
  const required = [...(manifest.headerLinks || []), ...(manifest.footerOnly || []), ...(manifest.legalPages || [])]
    .map(linkKey).filter(Boolean);
  const missing = [...new Set(required)].filter((key) => !footer.has(key));
  return { ok: missing.length === 0, missing };
}

if (SELF_TEST) {
  const fixture = '<nav class="nav-center"><a href="/a/#x">A</a></nav><footer class="site-footer"><a href="/a/">A</a><a href="/privacy/">Privacy</a><a href="/cookies/">Cookies</a><a href="/terms/">Terms</a><a href="/data-deletion/">Data</a><a href="/contact/">Contact</a></footer>';
  const manifest = deriveManifest(fixture);
  const bad = { ...manifest, footerLinks: ['/privacy/'] };
  const cases = [
    ['hash and slash normalize', linkKey('/a/#x') === '/a'],
    ['complete fixture passes', verify(manifest).ok],
    ['missing header link fails', !verify(bad).ok && verify(bad).missing.includes('/a')],
  ];
  cases.forEach(([name, ok]) => console.log(`  ${ok ? 'ok' : 'fail'} ${name}`));
  process.exit(cases.every(([, ok]) => ok) ? 0 : 1);
}

const derived = deriveManifest(fs.readFileSync(INDEX, 'utf8'));
const result = verify(derived);
if (WRITE) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(derived, null, 2)}\n`, 'utf8');
}
if (!result.ok) {
  console.error(`check-footer-contract: footer missing ${result.missing.length}: ${result.missing.join(', ')}`);
  process.exit(1);
}
if (!WRITE) {
  if (!fs.existsSync(OUT) || fs.readFileSync(OUT, 'utf8') !== `${JSON.stringify(derived, null, 2)}\n`) {
    console.error('check-footer-contract: manifest drift; run --write');
    process.exit(1);
  }
}
console.log(`check-footer-contract: ok (${derived.headerLinks.length} header · ${derived.footerLinks.length} footer)`);
