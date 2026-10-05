/**
 * desk-dispatch-cta.mjs — the ONE Desk Dispatch signup component.
 *
 * Rendered by generate-news-pages.mjs (hub, articles, persona profiles),
 * build-home-desk-module.mjs (homepage Desk module) and
 * build-dispatch-desk-panel.mjs (/dispatch/). Markup, copy, client script and
 * styles live here (styles: the marked region of assets/news-desk.css) so the
 * five placements cannot drift into five slightly different signups.
 *
 * Flow (unchanged backend): form → POST /desk/dispatch/subscribe (Worker:
 * CSRF + Turnstile + rate limit) → Supabase subscribe-desk-dispatch → Brevo
 * transactional confirmation email → reader clicks → contact added to the
 * "The Desk Dispatch" list → /news/subscribed/. Double opt-in, account-free,
 * and a separate list from the Studio Dispatch (Kit) in the site footer.
 *
 * Honesty rules baked into the copy:
 *  - "Check your inbox" is the only success state the form can claim; the
 *    reader is subscribed only after clicking the confirmation link.
 *  - Cadence states a ceiling (at most one email a day), not a schedule the
 *    list has not yet kept: no issue has been sent at the time of writing.
 *  - A verification failure is reported as a verification failure, never as
 *    "could not reach the mail service".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const DESK_DISPATCH_ENDPOINT = '/desk/dispatch/subscribe';
export const CSS_START = '/* desk-dispatch:start */';
export const CSS_END = '/* desk-dispatch:end */';

const esc = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const SOURCE_RE = /^[a-z0-9-]{1,40}$/;

export const DISPATCH_COPY = {
  kicker: 'The Desk Dispatch · free',
  heading: 'Get The Desk Dispatch.',
  lede: 'The day’s lead argument, the quiet story nobody else covered, and every prediction that came due, from The Desk’s fictional AI correspondents. Labelled as AI, sourced like news.',
  points: [
    ['Cadence', 'No more than one email a day, only on days the Desk publishes. The first issue is still being prepared.'],
    ['No spam', 'One confirmation email. Nothing else unless you click it.'],
    ['Leave anytime', 'One-click unsubscribe in every email.'],
  ],
  member: 'Signed in? The Dispatch is a separate, account-free list. Enter the address you want it sent to.',
  fine: 'Double opt-in. Separate from the Studio Dispatch list in the footer. See the <a href="/privacy/">privacy policy</a>.',
  button: 'Subscribe free',
};

/**
 * @param {string} source  provenance tag + id suffix (unique per page)
 * @param {{compact?: boolean, heading?: string, lede?: string, headingLevel?: 2|3}} [options]
 */
export const DISPATCH_BAR_COPY = {
  heading: 'Get The Desk Dispatch: the day’s AI news in one email.',
  lede: 'Free, at most once a day, written by The Desk’s fictional AI correspondents. This is the Desk’s own list, not the Studio Dispatch in the footer.',
};

export function deskDispatchCta(source, { compact = false, bar = false, anchor = null, heading = null, lede = null, headingLevel = 2 } = {}) {
  if (!SOURCE_RE.test(String(source))) throw new Error(`desk dispatch source must match ${SOURCE_RE}: ${source}`);
  if (anchor !== null && !SOURCE_RE.test(String(anchor))) throw new Error(`desk dispatch anchor must match ${SOURCE_RE}: ${anchor}`);
  const h = headingLevel === 3 ? 'h3' : 'h2';
  // S368: a slim bar for the top of /news/ — the full block below the newest
  // edition was hard to find, and readers mistook the footer's Studio Dispatch
  // form for it. Same form, same client, same endpoint; just less copy.
  if (bar) {
    return `<section class="desk-dispatch desk-dispatch-bar"${anchor ? ` id="${esc(anchor)}"` : ''} data-desk-dispatch="${esc(source)}" aria-labelledby="dispatch-h-${esc(source)}">
    <div class="desk-dispatch-copy">
      <p class="desk-dispatch-kicker">${esc(DISPATCH_COPY.kicker)}</p>
      <${h} id="dispatch-h-${esc(source)}">${esc(heading || DISPATCH_BAR_COPY.heading)}</${h}>
      <p class="desk-dispatch-lede">${esc(lede || DISPATCH_BAR_COPY.lede)}</p>
    </div>
    <form class="desk-dispatch-form" data-dispatch data-source="${esc(source)}" novalidate>
      <label class="visually-hidden vs-visually-hidden" for="dispatch-email-${esc(source)}">Email address for The Desk Dispatch</label>
      <input id="dispatch-email-${esc(source)}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required spellcheck="false">
      <button type="submit" class="button">${esc(DISPATCH_COPY.button)}</button>
      <div class="desk-dispatch-slot" data-vs-turnstile-slot aria-live="polite"></div>
      <p class="desk-dispatch-fine">Double opt-in: we email you a link to confirm. <a href="/privacy/">Privacy policy</a>.</p>
      <p class="desk-dispatch-status" data-dispatch-status role="status" aria-live="polite"></p>
    </form>
  </section>`;
  }
  const points = DISPATCH_COPY.points
    .map(([k, v]) => `<li><strong>${esc(k)}</strong> ${esc(v)}</li>`).join('');
  return `<section class="desk-dispatch${compact ? ' desk-dispatch-compact' : ''}" data-desk-dispatch="${esc(source)}" aria-labelledby="dispatch-h-${esc(source)}">
    <div class="desk-dispatch-copy">
      <p class="desk-dispatch-kicker">${esc(DISPATCH_COPY.kicker)}</p>
      <${h} id="dispatch-h-${esc(source)}">${esc(heading || DISPATCH_COPY.heading)}</${h}>
      <p class="desk-dispatch-lede">${esc(lede || DISPATCH_COPY.lede)}</p>
      <ul class="desk-dispatch-points">${points}</ul>
      <p class="desk-dispatch-member">${esc(DISPATCH_COPY.member)}</p>
    </div>
    <form class="desk-dispatch-form" data-dispatch data-source="${esc(source)}" novalidate>
      <label class="visually-hidden vs-visually-hidden" for="dispatch-email-${esc(source)}">Email address for The Desk Dispatch</label>
      <input id="dispatch-email-${esc(source)}" name="email" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required spellcheck="false">
      <button type="submit" class="button">${esc(DISPATCH_COPY.button)}</button>
      <div class="desk-dispatch-slot" data-vs-turnstile-slot aria-live="polite"></div>
      <p class="desk-dispatch-fine">${DISPATCH_COPY.fine}</p>
      <p class="desk-dispatch-status" data-dispatch-status role="status" aria-live="polite"></p>
    </form>
    <noscript><p class="desk-dispatch-fine">Signing up needs JavaScript. With it off, email <a href="mailto:news@vaultsparkstudios.com?subject=Subscribe%20to%20The%20Desk%20Dispatch">news@vaultsparkstudios.com</a> with the subject &ldquo;Subscribe to The Desk Dispatch&rdquo;, or follow <a href="/api/news-desk-feed.json">the JSON Feed</a>.</p></noscript>
  </section>`;
}

/**
 * The client. Inline (the Worker nonces it; CSP nonce + strict-dynamic) so it
 * rides the content lane with the pages that need it and rotates no shell hash.
 * It lazy-loads the site's existing csrf-token.js and turnstile.js when a page
 * does not already carry them (the homepage and /dispatch/ do not), on first
 * focus so the invisible challenge is warm before submit.
 */
export const DESK_DISPATCH_SCRIPT = `<script>(function(){
  var ENDPOINT=${JSON.stringify(DESK_DISPATCH_ENDPOINT)};
  var forms=document.querySelectorAll('form[data-dispatch]');
  if(!forms.length)return;
  var loads={};
  function load(src,ready){
    if(ready())return Promise.resolve(true);
    if(!loads[src]){loads[src]=new Promise(function(resolve){
      var s=document.createElement('script');s.src=src;s.async=true;
      s.onload=function(){resolve(ready());};s.onerror=function(){resolve(false);};
      document.head.appendChild(s);});}
    return loads[src];
  }
  function deps(){return Promise.all([
    load('/assets/csrf-token.js',function(){return !!window.VSCsrf;}),
    load('/assets/turnstile.js',function(){return !!window.VSTurnstile;})]);}
  var MESSAGES={invalid_email:'That does not look like a valid email address.',
    turnstile_invalid:'Verification did not pass. Please try again.',
    turnstile_token_missing:'Verification did not complete. Please try again.',
    turnstile_not_configured:'Signup is temporarily unavailable. Please try again later.',
    invalid_form_body:'Something went wrong with the form. Please reload and try again.'};
  function post(email,source,turnstileToken,csrf){
    return fetch(ENDPOINT,{method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},
      body:JSON.stringify({email:email,source:source,turnstileToken:turnstileToken})})
    .then(function(r){return r.text().then(function(t){var b={};try{b=JSON.parse(t);}catch(e){b={raw:t};}return {status:r.status,ok:r.ok,body:b};});});
  }
  Array.prototype.forEach.call(forms,function(form){
    var status=form.querySelector('[data-dispatch-status]');
    var input=form.querySelector('input[name=email]');
    var button=form.querySelector('button');
    var label=button.textContent;
    function say(msg,kind){status.textContent=msg;status.className='desk-dispatch-status'+(kind?' is-'+kind:'');}
    function reset(){button.disabled=false;button.textContent=label;}
    input.addEventListener('focus',function(){deps();},{once:true});
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(form.classList.contains('is-done'))return;
      var email=(input.value||'').trim();
      if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){say('Enter a valid email address.','error');input.setAttribute('aria-invalid','true');input.focus();return;}
      input.removeAttribute('aria-invalid');
      button.disabled=true;button.textContent='Sending…';say('Verifying you are human (invisible check)…');
      var source=form.getAttribute('data-source')||'news';
      deps().then(function(ok){
        if(!ok[0]||!ok[1])throw {kind:'deps'};
        return window.VSTurnstile.getToken().catch(function(){throw {kind:'verify'};});
      }).then(function(token){
        say('Sending your confirmation email…');
        return window.VSCsrf.getToken().then(function(csrf){
          return post(email,source,token,csrf).then(function(res){
            // A stale session CSRF token answers 403 in plain text. Refresh once.
            if(res.status===403&&res.body&&res.body.raw!==undefined&&window.VSCsrf.invalidate){
              window.VSCsrf.invalidate();
              return window.VSTurnstile.getToken().then(function(t2){
                return window.VSCsrf.getToken().then(function(c2){return post(email,source,t2,c2);});
              });
            }
            return res;
          });
        });
      }).then(function(res){
        if(res.ok){form.classList.add('is-done');input.readOnly=true;button.textContent='Sent ✓';
          say('Check your inbox for an email from news@vaultsparkstudios.com and click the link to confirm. You are subscribed only after you confirm.','ok');return;}
        reset();
        if(res.status===429){say('Too many signup attempts from this network. Please try again in an hour.','error');return;}
        var code=res.body&&res.body.error;
        say(MESSAGES[code]||(typeof code==='string'&&code.indexOf(' ')>0?code:'Something went wrong. Please try again shortly.'),'error');
      }).catch(function(err){
        reset();
        if(err&&err.kind==='verify'){say('The invisible human check did not complete. Please try again.','error');return;}
        if(err&&err.kind==='deps'){say('Signup could not load its security check. Please reload and try again.','error');return;}
        say('Could not reach the signup service. Please try again shortly.','error');
      });
    });
  });
})();</script>`;

/** The dispatch CSS region from assets/news-desk.css (single source for inlined copies). */
export function deskDispatchCss(root = ROOT) {
  const css = fs.readFileSync(path.join(root, 'assets', 'news-desk.css'), 'utf8');
  const a = css.indexOf(CSS_START);
  const b = css.indexOf(CSS_END);
  if (a === -1 || b === -1 || b < a) throw new Error('assets/news-desk.css is missing the desk-dispatch CSS region');
  return css.slice(a + CSS_START.length, b).trim();
}

export function selfTest() {
  const cases = [];
  const t = (name, ok) => cases.push([name, Boolean(ok)]);
  const full = deskDispatchCta('hub');
  const compact = deskDispatchCta('story', { compact: true, heading: 'H <x>' });
  t('posts to the protected Worker route', DESK_DISPATCH_SCRIPT.includes(JSON.stringify(DESK_DISPATCH_ENDPOINT)));
  t('form is marked for the shared client', /<form class="desk-dispatch-form" data-dispatch data-source="hub"/.test(full));
  t('carries a Turnstile slot', full.includes('data-vs-turnstile-slot'));
  t('states cadence, no spam and unsubscribe', /Cadence/.test(full) && /No spam/.test(full) && /unsubscribe/i.test(full));
  t('names the list and keeps it separate from the Studio Dispatch', /The Desk Dispatch/.test(full) && /Separate from the Studio Dispatch/.test(full));
  t('discloses fictional AI correspondents', /fictional AI correspondents/.test(full));
  t('compact variant is marked', compact.includes('desk-dispatch-compact'));
  t('heading override is escaped', compact.includes('H &lt;x&gt;'));
  t('no inline event handlers', !/\son[a-z]+=/i.test(full + compact));
  t('no inline style attributes', !/\sstyle="/i.test(full + compact));
  t('ids are unique per source', full.includes('id="dispatch-email-hub"') && compact.includes('id="dispatch-email-story"'));
  t('a hostile source is refused', (() => { try { deskDispatchCta('"><x'); return false; } catch { return true; } })());
  const bar = deskDispatchCta('hub-top', { bar: true, anchor: 'desk-dispatch' });
  t('bar variant carries the anchor, the shared form and a Turnstile slot', bar.includes('id="desk-dispatch"') && /<form class="desk-dispatch-form" data-dispatch data-source="hub-top"/.test(bar) && bar.includes('data-vs-turnstile-slot'));
  t('bar variant tells the two lists apart', /not the Studio Dispatch/.test(bar));
  t('a hostile anchor is refused', (() => { try { deskDispatchCta('x', { bar: true, anchor: '"><x' }); return false; } catch { return true; } })());
  t('success copy never claims a confirmed subscription', /subscribed only after you confirm/.test(DESK_DISPATCH_SCRIPT));
  t('verification failure is not reported as a mail outage', /invisible human check did not complete/.test(DESK_DISPATCH_SCRIPT));
  t('a stale CSRF token is refreshed once', /VSCsrf\.invalidate\(\)/.test(DESK_DISPATCH_SCRIPT));
  t('rate limit has its own message', /res\.status===429/.test(DESK_DISPATCH_SCRIPT));
  t('lazy-loads the existing security helpers instead of forking them', DESK_DISPATCH_SCRIPT.includes("'/assets/csrf-token.js'") && DESK_DISPATCH_SCRIPT.includes("'/assets/turnstile.js'"));
  t('the done state keeps the form box (no layout shift)', !/is-done[^{]*\{[^}]*display:\s*none/.test(deskDispatchCss()));
  const css = deskDispatchCss();
  t('dispatch CSS region exists', css.length > 200);
  t('dispatch CSS has no theme-blind colour fallback', !/var\(--[a-z-]+\s*,\s*#[0-9a-f]{3,8}\)/i.test(css));
  t('dispatch CSS never sets gold as body text on light themes', !/desk-dispatch-(?:lede|points|status|fine)[^{]*\{[^}]*color:\s*var\(--gold\)/.test(css));
  t('signed-in members get the compact variant', /data-vs-signed-in="true"\][^{]*desk-dispatch-points/.test(css));
  for (const [name, ok] of cases) if (!ok) console.error(`✗ ${name}`);
  const failed = cases.filter(([, ok]) => !ok).length;
  console.log(`desk-dispatch-cta self-test: ${cases.length - failed}/${cases.length} passed`);
  return failed === 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  if (!selfTest()) process.exit(1);
}
