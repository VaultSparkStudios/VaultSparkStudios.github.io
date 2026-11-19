#!/usr/bin/env node
/**
 * age-screen — the neutral age screen at Vault Member profile completion.
 * Run: node scripts/test/age-screen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const screen = require(path.join(ROOT, 'vault-member/age-screen.js'));

let failed = 0;
const check = (name, pass, detail = '') => {
  console.log(`${pass ? '✓' : '✗'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
  if (!pass) failed += 1;
};

// A fixed "today": 15 June 2026.
const now = new Date(2026, 5, 15);
const verdict = (y, m) => screen.evaluate(String(y), String(m), now);

check('adult passes', verdict(1990, 3).ok === true);
check('13 with the birthday month already past passes', verdict(2013, 5).ok === true);
check('13 this month is treated as not yet reached', verdict(2013, 6).reason === 'under-age');
check('12 is refused', verdict(2014, 1).reason === 'under-age');
check('a young child is refused', verdict(2020, 1).reason === 'under-age');
check('missing year is incomplete', screen.evaluate('', '4', now).reason === 'incomplete');
check('missing month is incomplete', screen.evaluate('2000', '', now).reason === 'incomplete');
check('a future month this year is invalid', verdict(2026, 9).reason === 'invalid');
check('a future year is invalid', verdict(2030, 1).reason === 'invalid');
check('month 13 is invalid', verdict(2000, 13).reason === 'invalid');
check('an impossible age is invalid', verdict(1800, 1).reason === 'invalid');
check('non-numeric input is invalid', screen.evaluate('abc', '1', now).reason === 'invalid');
check('minimum age matches the Terms (13)', screen.MIN_AGE === 13);

// The refusal message must not reveal which answer would have passed.
const refusal = screen.message('under-age');
check('refusal names no age or year', !/\d/.test(refusal) && !/old|young|age|birth/i.test(refusal), refusal);

// The remembered refusal blocks a second attempt with a different date.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
const select = (value) => ({ value });
check('first under-age answer is refused', screen.check(select('2020'), select('1')).reason === 'under-age');
check('a later adult answer on the same device is still refused', screen.check(select('1990'), select('1')).ok === false);
check('the refusal expires', screen.isBlocked(Date.now() + 25 * 60 * 60 * 1000) === false);
store.clear();
check('with no remembered refusal an adult passes', screen.check(select('1990'), select('1')).ok === true);

// Wiring: the form carries the fields, the handler fails closed, and marketing
// consent is not pre-ticked.
const html = fs.readFileSync(path.join(ROOT, 'vault-member/index.html'), 'utf8');
const handler = fs.readFileSync(path.join(ROOT, 'vault-member/portal-auth.js'), 'utf8');
check('form has birth month and year fields', html.includes('id="oauth-birth-month"') && html.includes('id="oauth-birth-year"'));
check('no year is pre-selected', /<select id="oauth-birth-year"[^>]*>\s*<option value="">Year<\/option>\s*<\/select>/.test(html));
check('age screen script loads before the auth handler', html.indexOf('src="age-screen.js"') > 0 && html.indexOf('src="age-screen.js"') < html.indexOf('portal-auth.shell'));
check('handler checks age before creating the profile', handler.indexOf('ageScreen.check(') > 0 && handler.indexOf('ageScreen.check(') < handler.indexOf("rpc('register_open'"));
check('handler fails closed when the screen is missing', handler.includes("{ ok: false, reason: 'unavailable' }"));
check('newsletter consent is not pre-ticked', !/id="oauth-subscribe"[^>]*\bchecked\b/.test(html));

console.log(`age-screen: ${failed === 0 ? 'all passed' : `${failed} failed`}`);
process.exit(failed === 0 ? 0 : 1);
