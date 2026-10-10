/**
 * pages-redirects.js — Cloudflare Pages `_redirects` semantics as pure functions.
 *
 * WHY (S373). Production's public routes are retired by `_redirects`, which Cloudflare
 * Pages applies before static assets. Staging is served from a Hetzner origin that knows
 * nothing about that file, so a retired route answered 200 or 404 on staging and 301 in
 * production: staging could not verify a route consolidation at all (measured in S372).
 * The staging Worker now applies the same file at the point it would fetch the origin.
 *
 * Only what this repository's `_redirects` uses is implemented, and each rule was
 * measured against production: exact sources, a trailing `/*` splat with optional
 * `:splat` in the target, 30x statuses, and the query string carried ahead of any
 * fragment. Rewrites (200) and placeholders other than `:splat` are ignored, never
 * guessed. The first matching rule wins, as in Pages.
 */

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Parse `_redirects` text into ordered rules. Unsupported lines are skipped. */
export function parsePagesRedirects(text) {
  const rules = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, statusText = '302'] = line.split(/\s+/);
    const status = Number(String(statusText).replace(/!$/, ''));
    if (!from || !to || !from.startsWith('/') || !REDIRECT_STATUSES.has(status)) continue;
    // Only a trailing splat is supported; a rule with any other wildcard or a
    // named placeholder is left to the origin rather than half-applied.
    const splat = from.endsWith('/*');
    const prefix = splat ? from.slice(0, -1) : null;
    if ((splat ? prefix : from).includes('*') || /:(?!splat\b)[a-z]/i.test(from)) continue;
    if (/:(?!splat\b)[a-z]/i.test(to.replace(/^https?:\/\//, ''))) continue;
    rules.push({ from, to, status, splat, prefix });
  }
  return rules;
}

/** First rule matching `pathname`, with `:splat` resolved. Returns { to, status } or null. */
export function matchPagesRedirect(rules, pathname) {
  for (const rule of rules) {
    if (!rule.splat) {
      if (pathname === rule.from) return { to: rule.to, status: rule.status };
      continue;
    }
    if (!pathname.startsWith(rule.prefix)) continue;
    const rest = pathname.slice(rule.prefix.length);
    return { to: rule.to.replace(/:splat\b/g, rest), status: rule.status };
  }
  return null;
}

/** Absolute Location: same-origin targets get `publicOrigin`; the query precedes a fragment. */
export function redirectLocation(to, search, publicOrigin) {
  if (/^https?:\/\//i.test(to)) return to;
  const hashAt = to.indexOf('#');
  const pathPart = hashAt < 0 ? to : to.slice(0, hashAt);
  const fragment = hashAt < 0 ? '' : to.slice(hashAt);
  return `${publicOrigin}${pathPart}${search || ''}${fragment}`;
}

// Per-isolate cache of the parsed file. Staging runs with the edge cache off, so a short
// TTL keeps a fresh staging publish visible within a minute without a fetch per request.
let cached = { at: 0, rules: null };
export const PAGES_REDIRECTS_TTL_MS = 60_000;

/**
 * Resolve a redirect for `url` from the origin's own `_redirects`. Returns a Response or
 * null. Any failure to read or parse the file yields null: emulation must never take a
 * route down, it can only decline to redirect.
 */
export async function pagesRedirectResponse(url, { originFetch, publicOrigin, now = Date.now() }) {
  try {
    if (!cached.rules || now - cached.at > PAGES_REDIRECTS_TTL_MS) {
      const res = await originFetch(new Request(`${url.origin}/_redirects`, { headers: { accept: 'text/plain' } }));
      if (!res || res.status !== 200) return null;
      cached = { at: now, rules: parsePagesRedirects(await res.text()) };
    }
    const hit = matchPagesRedirect(cached.rules, url.pathname);
    if (!hit) return null;
    return Response.redirect(redirectLocation(hit.to, url.search, publicOrigin), hit.status);
  } catch {
    return null;
  }
}

/** Test hook: drop the per-isolate cache. */
export function resetPagesRedirectsCache() { cached = { at: 0, rules: null }; }
