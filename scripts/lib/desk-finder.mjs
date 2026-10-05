/**
 * desk-finder.mjs — The Desk's search + filter UI (markup, client, self-test).
 *
 * Founder request (2026-10-05). The hub server-renders the finder at its final
 * size (no layout shift) with real <select> options, so the controls exist
 * before any script runs. The client:
 *   - fetches api/news-desk-search.json (+ its month shards) only when a reader
 *     reaches for search: focus, typing, opening Filters, changing a control, or
 *     arriving on a shared link that already carries ?q=/filters. Never on load,
 *     so LCP is untouched.
 *   - searches every edition, not just the seven the hub lists, and renders the
 *     result cards from the index.
 *   - mirrors state into the URL (?q=&persona=&topic=&edition=&format=&month=
 *     &pred=1&sort=) with replaceState, so a search is a shareable link.
 *   - builds every node with createElement/textContent. No innerHTML, so it is
 *     safe under the Worker's Trusted Types policy and cannot inject markup from
 *     a model-written headline.
 *
 * Without JavaScript the existing edition list and archive links remain, and a
 * <noscript> line says search needs JavaScript.
 *
 * The matching/highlighting helpers below are REAL exported functions; the
 * inline script embeds their source with Function#toString, so the self-test
 * exercises exactly the code that runs in the browser.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSearchText, tokenize, stemWord, STOPWORDS, ROW, FLAG_PREDICTION, FLAG_ART, SEARCH_INDEX_PATH } from './news-search-index.mjs';

export const FINDER_PARAMS = ['q', 'persona', 'topic', 'edition', 'format', 'month', 'pred', 'sort'];
export const FINDER_PAGE_SIZE = 24;

/** Query → unique stems, stopwords dropped unless the query is nothing else. */
export function queryStems(q, stop) {
  const words = tokenize(q);
  const kept = words.filter((w) => !stop.has(w));
  const use = kept.length ? kept : words;
  return use.map(stemWord).filter((w, i, all) => w && all.indexOf(w) === i);
}

/**
 * Score one prepared row against the query stems. Every stem must match a word
 * PREFIX somewhere (AND semantics). Fields are pre-normalised strings padded
 * with spaces: h headline, n persona names, k hook, t tldr, b body/fact bag.
 * @returns {{score:number, bodyOnly:boolean}|null}
 */
export function matchRow(p, stems) {
  if (!stems.length) return { score: 0, bodyOnly: false };
  let score = 0;
  let headHit = false;
  for (let i = 0; i < stems.length; i += 1) {
    const needle = ` ${stems[i]}`;
    let best = 0;
    if (p.h.indexOf(needle) >= 0) best = 8;
    else if (p.n.indexOf(needle) >= 0) best = 6;
    else if (p.k.indexOf(needle) >= 0) best = 4;
    else if (p.t.indexOf(needle) >= 0) best = 3;
    else if (p.b.indexOf(needle) >= 0) best = 1;
    if (!best) return null;
    if (best > 1) headHit = true;
    score += best;
  }
  return { score, bodyOnly: !headHit };
}

/** Split text into [segment, isMatch] pairs, marking whole words that start with a stem. */
export function highlightSegments(text, stems) {
  const src = String(text || '');
  if (!stems.length) return [[src, false]];
  const out = [];
  const re = /[A-Za-z0-9À-ɏ]+(?:[’'.][A-Za-z0-9À-ɏ]+)*/g;
  let last = 0;
  let m = re.exec(src);
  while (m) {
    const word = normalizeSearchText(m[0]).split(' ')[0] || '';
    if (word && stems.some((s) => word.indexOf(s) === 0)) {
      if (m.index > last) out.push([src.slice(last, m.index), false]);
      out.push([m[0], true]);
      last = m.index + m[0].length;
    }
    m = re.exec(src);
  }
  if (last < src.length) out.push([src.slice(last), false]);
  return out;
}

/** A ~max-char window of `text` around its first match, highlighted; null when nothing matches. */
export function snippetSegments(text, stems, max = 180) {
  const src = String(text || '');
  const segs = highlightSegments(src, stems);
  let pos = -1;
  let at = 0;
  for (let i = 0; i < segs.length; i += 1) {
    if (segs[i][1]) { pos = at; break; }
    at += segs[i][0].length;
  }
  if (pos < 0) return null;
  if (src.length <= max) return segs;
  let start = Math.max(0, pos - Math.floor(max / 3));
  if (start > 0) { const sp = src.indexOf(' ', start); start = sp >= 0 && sp < pos ? sp + 1 : start; }
  let end = Math.min(src.length, start + max);
  if (end < src.length) { const sp = src.lastIndexOf(' ', end); end = sp > pos ? sp : end; }
  const body = highlightSegments(src.slice(start, end), stems);
  if (start > 0) body.unshift(['…', false]);
  if (end < src.length) body.push(['…', false]);
  return body;
}

/** URL query string → finder state (unknown params ignored, values trimmed). */
export function readFinderParams(search, names) {
  const params = new URLSearchParams(search || '');
  const state = {};
  for (let i = 0; i < names.length; i += 1) state[names[i]] = (params.get(names[i]) || '').trim().slice(0, 120);
  return state;
}

/** Finder state → "?a=b" (empty values omitted) or "" when nothing is set. */
export function writeFinderParams(state, names) {
  const params = new URLSearchParams();
  for (let i = 0; i < names.length; i += 1) if (state[names[i]]) params.set(names[i], state[names[i]]);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * The browser runtime. Self-contained apart from the helpers above, which the
 * inline script defines in the same scope under the same names.
 */
export function finderClient(cfg) {
  const root = document.querySelector('[data-desk-finder]');
  if (!root || !window.fetch || !window.URLSearchParams) return;
  const form = root.querySelector('[data-finder-form]');
  const input = form.elements.q;
  const filters = root.querySelector('[data-finder-filters]');
  const filterCount = root.querySelector('[data-finder-count]');
  const status = root.querySelector('[data-finder-status]');
  const panel = document.getElementById('desk-finder-results');
  const list = panel.querySelector('ol');
  const more = panel.querySelector('[data-finder-more]');
  const latest = document.querySelector('[data-desk-latest]');
  const stop = new Set(cfg.stop);
  let manifest = null;
  let loading = null;
  let pending = 0;
  let failed = false;
  const rows = [];
  let shown = cfg.pageSize;
  let timer = 0;

  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  const fill = (node, segs) => {
    segs.forEach((seg) => { node.appendChild(seg[1] ? el('mark', '', seg[0]) : document.createTextNode(seg[0])); });
    return node;
  };
  const state = () => {
    const s = {};
    cfg.params.forEach((name) => {
      const field = form.elements[name];
      s[name] = !field ? '' : field.type === 'checkbox' ? (field.checked ? '1' : '') : String(field.value || '').trim();
    });
    return s;
  };
  const setState = (s) => {
    cfg.params.forEach((name) => {
      const field = form.elements[name];
      if (!field) return;
      if (field.type === 'checkbox') field.checked = s[name] === '1';
      else if (field.tagName === 'SELECT') field.value = [...field.options].some((o) => o.value === s[name]) ? s[name] : '';
      else field.value = s[name] || '';
    });
  };
  const filterTotal = (s) => cfg.params.filter((n) => n !== 'q' && n !== 'sort' && s[n]).length;
  const active = (s) => !!(s.q || filterTotal(s));

  const prep = (row) => {
    const names = row[cfg.row.personas].map((i) => (manifest.personas[i] || [])[1] || '').join(' ');
    rows.push({
      row,
      h: ` ${normalizeSearchText(row[cfg.row.headline])} `,
      n: ` ${normalizeSearchText(names)} `,
      k: ` ${normalizeSearchText(row[cfg.row.hook])} `,
      t: ` ${normalizeSearchText(row[cfg.row.tldr])} `,
      b: ` ${row[cfg.row.bag]} `,
      names: row[cfg.row.personas].map((i) => (manifest.personas[i] || [])[1]).filter(Boolean),
    });
  };
  const load = () => {
    if (loading) return loading;
    status.textContent = 'Loading every story…';
    loading = fetch(cfg.manifest, { credentials: 'same-origin' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((m) => {
        manifest = m;
        pending = m.shards.length;
        return Promise.all(m.shards.map((shard) => fetch(shard.path, { credentials: 'same-origin' })
          .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
          .then((body) => { body.stories.forEach(prep); pending -= 1; run(false); })));
      })
      .catch(() => { failed = true; pending = 0; run(false); });
    return loading;
  };

  const card = (hit, stems) => {
    const row = hit.p.row;
    const R = cfg.row;
    const li = el('li');
    const a = el('a', 'desk-panel desk-result');
    a.href = `/news/${row[R.date]}/${row[R.slug]}/`;
    if (row[R.flags] & cfg.flagArt) {
      const base = `/assets/og/news/${row[R.date]}--${row[R.slug]}--meme--640`;
      const pic = el('picture', 'desk-result-art');
      const src = el('source');
      src.srcset = `${base}.avif`;
      src.type = 'image/avif';
      const img = el('img');
      img.src = `${base}.webp`;
      img.width = 640; img.height = 336; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      pic.appendChild(src); pic.appendChild(img); a.appendChild(pic);
    }
    const copy = el('span', 'desk-result-copy');
    const meta = el('span', 'desk-result-meta');
    const time = el('time', 'desk-time', `${row[R.timeSource] === 'slot' ? 'Scheduled ' : ''}${row[R.timeLabel]}`);
    time.dateTime = row[R.iso];
    meta.appendChild(time);
    const extra = [
      (manifest.editions[row[R.edition]] || [])[1],
      (manifest.formats[row[R.format]] || [])[1],
      row[R.flags] & cfg.flagPrediction ? 'Prediction on the record' : '',
    ].filter(Boolean);
    if (extra.length) meta.appendChild(document.createTextNode(` · ${extra.join(' · ')}`));
    copy.appendChild(meta);
    copy.appendChild(fill(el('span', 'desk-result-title'), highlightSegments(row[R.headline], stems)));
    const snip = snippetSegments(row[R.tldr], stems) || snippetSegments(row[R.hook], stems);
    copy.appendChild(fill(el('span', 'desk-result-snippet'), snip || [[row[R.hook], false]]));
    if (stems.length && hit.m.bodyOnly) copy.appendChild(el('span', 'desk-result-note', 'Matched in the full story text'));
    if (hit.p.names.length) {
      const names = hit.p.names;
      const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
      copy.appendChild(el('span', 'desk-result-by', `${joined} · AI persona${names.length > 1 ? 's' : ''}`));
    }
    a.appendChild(copy);
    li.appendChild(a);
    return li;
  };

  function run(fromUser) {
    const s = state();
    const n = filterTotal(s);
    filterCount.textContent = n ? ` (${n})` : '';
    if (fromUser !== false) history.replaceState(history.state, '', `${location.pathname}${writeFinderParams(s, cfg.params)}`);
    if (!active(s)) {
      panel.hidden = true;
      if (latest) latest.hidden = false;
      status.textContent = '';
      return;
    }
    if (!manifest) {
      if (failed) { status.textContent = 'Search could not load. Every story is still listed below and in the archive.'; panel.hidden = true; if (latest) latest.hidden = false; return; }
      load();
      return;
    }
    const R = cfg.row;
    const stems = queryStems(s.q, stop);
    const idx = (list2, id) => list2.findIndex((entry) => entry[0] === id);
    const persona = s.persona ? idx(manifest.personas, s.persona) : -1;
    const edition = s.edition ? idx(manifest.editions, s.edition) : -1;
    const format = s.format ? idx(manifest.formats, s.format) : -1;
    const topic = s.topic ? manifest.topics.indexOf(s.topic) : -1;
    const hits = [];
    rows.forEach((p) => {
      const row = p.row;
      if (s.persona && row[R.personas].indexOf(persona) < 0) return;
      if (s.edition && row[R.edition] !== edition) return;
      if (s.format && row[R.format] !== format) return;
      if (s.topic && row[R.topics].indexOf(topic) < 0) return;
      if (s.month && row[R.date].slice(0, 7) !== s.month) return;
      if (s.pred && !(row[R.flags] & cfg.flagPrediction)) return;
      const m = matchRow(p, stems);
      if (m) hits.push({ p, m });
    });
    const newer = (a, b) => (a.p.row[R.iso] < b.p.row[R.iso] ? 1 : a.p.row[R.iso] > b.p.row[R.iso] ? -1 : 0);
    const sort = s.sort || (stems.length ? 'relevance' : 'newest');
    hits.sort(sort === 'oldest' ? (a, b) => -newer(a, b) : sort === 'relevance' ? (a, b) => (b.m.score - a.m.score) || newer(a, b) : newer);
    if (fromUser !== false) shown = cfg.pageSize;
    list.textContent = '';
    hits.slice(0, shown).forEach((hit) => list.appendChild(card(hit, stems)));
    more.hidden = hits.length <= shown;
    panel.hidden = false;
    if (latest) latest.hidden = true;
    const what = s.q ? ` for “${s.q}”` : '';
    const scope = n ? ` with ${n} filter${n === 1 ? '' : 's'}` : '';
    status.textContent = `${hits.length} ${hits.length === 1 ? 'story matches' : 'stories match'}${what}${scope}${pending ? ' · still loading older months…' : ''}`
      + (!hits.length && !pending ? '. Try fewer words or clear a filter.' : '.');
  }

  const schedule = () => { clearTimeout(timer); timer = setTimeout(() => run(true), 160); };
  input.addEventListener('focus', load, { once: true });
  input.addEventListener('input', schedule);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; run(true); }
  });
  filters.addEventListener('toggle', () => { if (filters.open) load(); });
  form.addEventListener('change', (e) => { if (e.target !== input) run(true); });
  form.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); run(true); });
  root.querySelectorAll('[data-finder-clear]').forEach((btn) => btn.addEventListener('click', () => {
    form.reset();
    run(true);
    input.focus();
  }));
  more.addEventListener('click', () => {
    const before = list.children.length;
    shown += cfg.pageSize;
    run(false);
    const next = list.children[before];
    if (next) next.querySelector('a').focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    input.focus();
  });
  const initial = readFinderParams(location.search, cfg.params);
  if (active(initial) || initial.sort) {
    setState(initial);
    if (filterTotal(initial) || initial.sort) filters.open = true;
    run(false);
  }
}

/** The inline <script>. Plain <script>: the Worker nonces inline scripts. */
export function deskFinderScript() {
  const cfg = {
    manifest: `/${SEARCH_INDEX_PATH}`,
    pageSize: FINDER_PAGE_SIZE,
    params: FINDER_PARAMS,
    row: ROW,
    flagPrediction: FLAG_PREDICTION,
    flagArt: FLAG_ART,
    stop: [...STOPWORDS],
  };
  const helpers = [normalizeSearchText, tokenize, stemWord, queryStems, matchRow, highlightSegments, snippetSegments, readFinderParams, writeFinderParams]
    .map((fn) => fn.toString()).join('\n');
  return `<script>(function(){"use strict";\n${helpers}\n(${finderClient.toString()})(${JSON.stringify(cfg)});\n})();</script>`;
}

/**
 * Server-rendered finder markup at its final size.
 * @param o { escape, storyCount, personas:[[id,name]], topics:[name], editions:[[id,name]], formats:[[id,name]], months:[[value,label]] }
 */
export function deskFinderHtml(o) {
  const esc = o.escape;
  if (typeof esc !== 'function') throw new Error('deskFinderHtml requires an escape function');
  const options = (pairs, any) => `<option value="">${esc(any)}</option>${pairs.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('')}`;
  const select = (name, label, pairs, any) => `<label class="desk-finder-field"><span>${esc(label)}</span><select name="${name}">${options(pairs, any)}</select></label>`;
  return `<section class="desk-finder" data-desk-finder aria-labelledby="desk-finder-title">
  <h2 class="visually-hidden" id="desk-finder-title">Search The Desk</h2>
  <form class="desk-finder-form" role="search" action="/news/" method="get" data-finder-form>
    <div class="desk-finder-bar">
      <label class="visually-hidden" for="desk-finder-q">Search every Desk story</label>
      <svg class="desk-finder-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input class="desk-finder-input" id="desk-finder-q" name="q" type="search" placeholder="Search every story" autocomplete="off" spellcheck="false" enterkeyhint="search" maxlength="120" aria-describedby="desk-finder-hint" aria-controls="desk-finder-results">
      <button class="desk-finder-go" type="submit">Search</button>
    </div>
    <details class="desk-finder-filters" data-finder-filters>
      <summary>Filter and sort<span data-finder-count></span></summary>
      <div class="desk-finder-grid">
        ${select('persona', 'Correspondent', o.personas, 'Any')}
        ${select('topic', 'Company or topic', o.topics.map((t) => [t, t]), 'Any')}
        ${select('edition', 'Edition', o.editions, 'Any')}
        ${select('format', 'Format', o.formats, 'Any')}
        ${select('month', 'Month', o.months, 'Any')}
        ${select('sort', 'Sort', [['newest', 'Newest first'], ['oldest', 'Oldest first'], ['relevance', 'Best match']], 'Best match')}
        <label class="desk-finder-check"><input type="checkbox" name="pred" value="1"><span>Has a prediction on the record</span></label>
        <button class="desk-finder-reset" type="button" data-finder-clear>Clear all</button>
      </div>
    </details>
    <p class="desk-finder-hint" id="desk-finder-hint">Searches all ${esc(String(o.storyCount))} stories in every edition, including the archive: headlines, full story text, sources and correspondents.<span class="desk-finder-kbd"> Press <kbd>/</kbd> to jump here.</span></p>
  </form>
  <p class="desk-finder-status" role="status" aria-live="polite" data-finder-status></p>
  <noscript><p class="desk-finder-hint">Search needs JavaScript. Every recent story is listed below, and every edition is in <a href="/news/archive/">the archive</a>.</p></noscript>
  <div class="desk-finder-results" id="desk-finder-results" hidden>
    <div class="desk-finder-results-head"><h2 class="desk-finder-results-title">Search results</h2><button class="desk-finder-reset" type="button" data-finder-clear>Clear search</button></div>
    <ol class="desk-finder-list"></ol>
    <button class="desk-finder-more" type="button" data-finder-more hidden>Show more results</button>
  </div>
</section>`;
}

export function selfTestDeskFinder() {
  const results = [];
  const t = (name, ok) => results.push([name, !!ok]);
  const stems = queryStems('The agents of OpenAI', STOPWORDS);
  t('query drops stopwords and stems', stems.join(',') === 'agent,openai');
  t('an all-stopword query is kept rather than emptied', queryStems('the', STOPWORDS).join() === 'the');
  const pad = (s) => ` ${normalizeSearchText(s)} `;
  const p = { h: pad('OpenAI agents breach a government site'), n: pad('MARA REX'), k: pad('A hook'), t: pad('Short version here'), b: ' guardrail robinhood ' };
  t('headline match outranks a body-only match', matchRow(p, ['openai']).score > matchRow(p, ['robinhood']).score);
  t('every stem must match (AND)', matchRow(p, ['openai', 'zebra']) === null);
  t('body-only matches are flagged', matchRow(p, ['guardrail']).bodyOnly === true && matchRow(p, ['openai']).bodyOnly === false);
  t('persona names are searchable', matchRow(p, ['mara']) !== null);
  t('prefix matching: agent finds agents', matchRow(p, queryStems('agent', STOPWORDS)) !== null);
  t('no query matches everything (filter-only browse)', matchRow(p, []).score === 0);
  const segs = highlightSegments('OpenAI’s agents hit Medicare.', ['openai', 'medicar']);
  t('highlight marks whole matched words only', segs.filter(([, m]) => m).map(([s]) => s).join('|') === 'OpenAI’s|Medicare'
    && segs.map(([s]) => s).join('') === 'OpenAI’s agents hit Medicare.');
  const long = `${'word '.repeat(80)}needle ${'tail '.repeat(80)}`;
  const snip = snippetSegments(long, ['needle'], 120);
  t('snippet windows around the first match with ellipses', snip[0][0] === '…' && snip[snip.length - 1][0] === '…' && snip.some(([s, m]) => m && s === 'needle'));
  t('snippet is null when the text does not match', snippetSegments('nothing here', ['zebra']) === null);
  const qs = writeFinderParams({ q: 'open ai', persona: 'rex', pred: '1', sort: '' }, FINDER_PARAMS);
  t('URL state round-trips and omits empties', qs === '?q=open+ai&persona=rex&pred=1' && readFinderParams(qs, FINDER_PARAMS).q === 'open ai' && readFinderParams(qs, FINDER_PARAMS).sort === '');
  const script = deskFinderScript();
  t('script is a single plain inline script (Worker nonces it)', /^<script>\(function\(\)\{/.test(script) && script.endsWith('</script>') && (script.match(/<script/g) || []).length === 1);
  t('script never uses innerHTML/outerHTML/insertAdjacentHTML/eval (Trusted Types safe)', !/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(script));
  t('script fetches only the same-origin Desk index', script.includes('"/api/news-desk-search.json"') && !/https?:\/\//.test(script.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, '')));
  t('script embeds the real helpers it calls', ['function normalizeSearchText', 'function stemWord', 'function matchRow', 'function snippetSegments'].every((s) => script.includes(s)));
  t('script contains no closing-tag or comment breakouts', !/<\/script/i.test(script.slice(8, -9)) && !script.includes('<!--'));
  const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const html = deskFinderHtml({ escape: esc, storyCount: 3, personas: [['rex', 'REX']], topics: ['A&B'], editions: [['wire', 'The Wire']], formats: [['debate', 'The Argument']], months: [['2026-10', 'October 2026']] });
  t('markup is a labelled search landmark with a live status', html.includes('role="search"') && html.includes('for="desk-finder-q"') && html.includes('role="status" aria-live="polite"'));
  t('every filter param has a control', FINDER_PARAMS.every((name) => html.includes(`name="${name}"`)));
  t('options are escaped', html.includes('value="A&amp;B">A&amp;B<') && !html.includes('A&B<'));
  t('results start hidden and degrade with a noscript note', html.includes('id="desk-finder-results" hidden') && html.includes('<noscript>'));
  t('markup has no inline style attributes', !/\sstyle="/.test(html));
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  const results = selfTestDeskFinder();
  for (const [name, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  const failed = results.filter(([, ok]) => !ok).length;
  console.log(`desk-finder self-test: ${results.length - failed}/${results.length}`);
  if (failed) process.exit(1);
}
