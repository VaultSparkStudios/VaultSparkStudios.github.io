/**
 * assets/oracle-extra.js (S136 Oracle expansion)
 *
 * Adds five new intelligence layers to /oracle/:
 *   1. SMART INSIGHTS — auto-generated narrative observations on the data
 *      ("Velocity climbing — 32% above 30-day average this week")
 *   2. ACTIVITY HEATMAP — 60-day calendar grid, commit intensity per day
 *   3. LIFECYCLE DONUT — SPARKED/FORGE/VAULTED/SEALED distribution
 *   4. TOP MOVERS — Most Active · Biggest Climber · Most Cross-Referenced
 *   5. CROSS-PROJECT GRAVITY — projects pulled toward each other via public focus/voice
 *
 * Plus enhances the existing 60-day velocity SVG chart:
 *   - Hover tooltip with date + values (was empty placeholder line element)
 *   - Vertical event markers for peak/today/cognition inflection
 *
 * Data sources (no new endpoints — all already fetched on this page):
 *   - /ignis/output/ecosystem-velocity.json   (chart series + ecosystem totals)
 *   - /ignis/output/ecosystem-state.json      (per-project snapshots + voices)
 *   - /ignis/output/portfolio-pulse.json      (fallback for pulse data)
 *
 * Loads only on /oracle/ via inline <script src> at the end of oracle/index.html.
 * Self-contained module — pulls its mount points by id, exits gracefully if
 * they don't exist (e.g. on other pages where this script happens to be
 * loaded via service-worker cache prefetch).
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  // Insights compute logic lives in oracle-insights-compute.js so it's
  // node-testable in isolation; fall back to local fmt helpers if the module
  // didn't load (e.g. cached page from before the split).
  const Compute = (typeof self !== 'undefined' && self.VSOracleInsights) ? self.VSOracleInsights : null;
  const fmtPct = Compute ? Compute.fmtPct : (n) => (n >= 0 ? '+' : '') + Math.round(n) + '%';
  const fmtInt = Compute ? Compute.fmtInt : (n) => (n || 0).toLocaleString();
  const safeDiv = (a, b) => (b > 0 ? a / b : 0);

  async function load() {
    const [velRes, ecoRes] = await Promise.all([
      fetch('/ignis/output/ecosystem-velocity.json', { cache: 'no-cache' }).catch(() => null),
      fetch('/ignis/output/ecosystem-state.json',    { cache: 'no-cache' }).catch(() => null),
    ]);
    let velocity  = velRes  && velRes.ok  ? await velRes.json()  : null;
    let ecosystem = ecoRes  && ecoRes.ok  ? await ecoRes.json()  : null;
    // Public-safe deployed fallbacks (S193 + S200) so the panels render on prod
    // where /ignis/output/* is gitignored and 404s. ecosystem ← /api/ecosystem-state.json;
    // velocity ← /api/ecosystem-velocity.json (S200 #1 — public daily commit series,
    // no internal data) which makes the 60-day heatmap + velocity insights live.
    if (!ecosystem) {
      const pub = await fetch('/api/ecosystem-state.json', { cache: 'no-cache' }).catch(() => null);
      ecosystem = pub && pub.ok ? await pub.json() : null;
    }
    if (!velocity) {
      const pubV = await fetch('/api/ecosystem-velocity.json', { cache: 'no-cache' }).catch(() => null);
      velocity = pubV && pubV.ok ? await pubV.json() : null;
    }
    return { velocity, ecosystem };
  }

  // ─── 1. SMART INSIGHTS ───────────────────────────────────────────────────
  // Compute extracted to assets/oracle-insights-compute.js for node testability.
  const computeInsights = Compute
    ? (v, e) => Compute.computeInsights(v, e)
    : () => [];   // graceful no-op if extracted module didn't load

  function renderInsights(insights, mount) {
    if (!mount || !insights.length) return;
    mount.innerHTML = '';
    for (const i of insights) {
      const card = document.createElement('article');
      card.style.cssText = `padding:1.2rem 1.3rem;border-radius:14px;background:linear-gradient(140deg,rgba(13,17,28,0.96),rgba(20,14,8,0.93));border:1px solid ${i.accent}40;border-left:3px solid ${i.accent};`;
      card.innerHTML =
        `<div class="eyebrow" style="color:${i.accent};margin-bottom:0.5rem;">${i.eyebrow}</div>` +
        `<h3 style="font-family:Georgia,serif;font-size:1.15rem;letter-spacing:-0.02em;margin:0 0 0.4rem;color:var(--text);">${i.headline}</h3>` +
        `<p style="font-size:0.9rem;line-height:1.55;color:var(--muted);margin:0;">${i.body}</p>`;
      mount.appendChild(card);
    }
  }

  // ─── 2. ACTIVITY HEATMAP ──────────────────────────────────────────────────
  // 60-day calendar grid colored by daily commit intensity.
  function renderHeatmap(velocity, mount) {
    if (!mount || !velocity?.series?.commits) return;
    const commits = velocity.series.commits;
    const dates   = velocity.series.dates;
    const max     = Math.max(...commits, 1);

    const bands = (v) => {
      if (v === 0) return 'rgba(255,255,255,0.04)';
      const intensity = v / max;
      if (intensity < 0.15) return '#3a2a08';
      if (intensity < 0.35) return '#6b4d10';
      if (intensity < 0.65) return '#b8841a';
      return '#FFC400';
    };

    mount.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(12px,1fr));gap:3px;padding:0.4rem 0 0.6rem;';
    for (let i = 0; i < commits.length; i++) {
      const cell = document.createElement('div');
      const v = commits[i];
      cell.style.cssText = `aspect-ratio:1;background:${bands(v)};border-radius:2px;cursor:pointer;transition:transform 100ms ease;`;
      cell.title = `${dates[i]} — ${v} studio signal${v === 1 ? '' : 's'}`;
      cell.addEventListener('mouseenter', () => { cell.style.transform = 'scale(1.4)'; });
      cell.addEventListener('mouseleave', () => { cell.style.transform = 'scale(1)'; });
      grid.appendChild(cell);
    }
    mount.appendChild(grid);

    // Legend
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;align-items:center;gap:0.6rem;font-size:0.72rem;color:var(--muted);';
    legend.innerHTML =
      `<span>Quiet</span>` +
      `<span style="width:11px;height:11px;background:rgba(255,255,255,0.04);border-radius:2px;"></span>` +
      `<span style="width:11px;height:11px;background:#3a2a08;border-radius:2px;"></span>` +
      `<span style="width:11px;height:11px;background:#6b4d10;border-radius:2px;"></span>` +
      `<span style="width:11px;height:11px;background:#b8841a;border-radius:2px;"></span>` +
      `<span style="width:11px;height:11px;background:#FFC400;border-radius:2px;"></span>` +
      `<span>Loud</span>` +
      `<span style="margin-left:auto;">${dates[0]} → ${dates[dates.length - 1]}</span>`;
    mount.appendChild(legend);
  }

  // ─── 3. LIFECYCLE DONUT ───────────────────────────────────────────────────
  function renderLifecycleDonut(ecosystem, mount) {
    if (!mount || !ecosystem?.projects) return;
    const buckets = { sparked: 0, forge: 0, vaulted: 0, other: 0 };
    for (const p of ecosystem.projects) {
      const s = String(p.vaultStatus || '').toLowerCase();
      if (s.includes('sparked')) buckets.sparked++;
      else if (s.includes('forge')) buckets.forge++;
      // SEALED retired — folded into VAULTED (coined vocab: vaulted is sealed).
      else if (s.includes('vaulted') || s.includes('sealed')) buckets.vaulted++;
      else buckets.other++;
    }
    const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
    const colors = { sparked: '#FFC400', forge: '#FF7A00', vaulted: '#94a3b8', other: '#475569' };
    const labels = { sparked: '🔥 Sparked', forge: '⚒ Forge', vaulted: '🔒 Vaulted', other: 'Other' };

    let cumulative = 0;
    const segments = Object.entries(buckets).filter(([_, v]) => v > 0).map(([k, v]) => {
      const startPct = cumulative / total;
      const endPct = (cumulative + v) / total;
      cumulative += v;
      const startAngle = startPct * Math.PI * 2 - Math.PI / 2;
      const endAngle = endPct * Math.PI * 2 - Math.PI / 2;
      const r = 70, R = 95, cx = 110, cy = 110;
      const x1 = cx + R * Math.cos(startAngle), y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle),   y2 = cy + R * Math.sin(endAngle);
      const x3 = cx + r * Math.cos(endAngle),   y3 = cy + r * Math.sin(endAngle);
      const x4 = cx + r * Math.cos(startAngle), y4 = cy + r * Math.sin(startAngle);
      const largeArc = endPct - startPct > 0.5 ? 1 : 0;
      return `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${largeArc} 0 ${x4} ${y4} Z" fill="${colors[k]}" opacity="0.92"><title>${labels[k]}: ${v}</title></path>`;
    }).join('');

    mount.innerHTML =
      `<div style="display:grid;grid-template-columns:auto 1fr;gap:1.2rem;align-items:center;">` +
        `<svg viewBox="0 0 220 220" width="180" height="180" role="img" aria-label="Lifecycle distribution donut">${segments}` +
          `<text x="110" y="105" text-anchor="middle" font-family="Inter" font-size="32" font-weight="800" fill="#FFC400">${total}</text>` +
          `<text x="110" y="128" text-anchor="middle" font-family="Inter" font-size="11" font-weight="600" letter-spacing="0.1em" fill="var(--muted)">PROJECTS</text>` +
        `</svg>` +
        `<div style="display:grid;gap:0.55rem;">` +
          Object.entries(buckets).filter(([_, v]) => v > 0).map(([k, v]) => {
            const pct = Math.round((v / total) * 100);
            return `<div style="display:flex;align-items:center;gap:0.6rem;font-size:0.92rem;">` +
              `<span style="width:14px;height:14px;border-radius:3px;background:${colors[k]};flex-shrink:0;"></span>` +
              `<span style="color:var(--text);font-weight:600;">${labels[k]}</span>` +
              `<span style="color:var(--muted);margin-left:auto;font-variant-numeric:tabular-nums;">${v} · ${pct}%</span>` +
            `</div>`;
          }).join('') +
        `</div>` +
      `</div>`;
  }

  // ─── 4. TOP MOVERS ────────────────────────────────────────────────────────
  // Three cards: most-active-this-week, biggest-ignis-climber, most-cross-referenced.
  function renderTopMovers(ecosystem, mount) {
    if (!mount || !ecosystem?.projects) return;
    const projects = ecosystem.projects.filter((p) => p.health !== 'red');

    // Sort by ignisScore descending — top IGNIS climbers
    const byIgnis = [...projects].filter((p) => typeof p.ignisScore === 'number')
      .sort((a, b) => (b.ignisScore || 0) - (a.ignisScore || 0));
    // Sort by inverse staleDays — most recently touched
    const byFresh = [...projects].filter((p) => typeof p.staleDays === 'number')
      .sort((a, b) => (a.staleDays || 999) - (b.staleDays || 999));
    // Sort by blockerCount ascending — cleanest pipelines
    const byClean = [...projects].filter((p) => typeof p.blockerCount === 'number')
      .sort((a, b) => (a.blockerCount || 0) - (b.blockerCount || 0));

    const card = (eyebrow, accent, project, metricLabel, metricValue) => {
      if (!project) return '';
      return `<article style="padding:1.1rem 1.2rem;border-radius:12px;background:linear-gradient(140deg,rgba(13,17,28,0.96),rgba(20,14,8,0.93));border:1px solid ${accent}30;border-left:3px solid ${accent};">` +
        `<div class="eyebrow" style="color:${accent};margin-bottom:0.4rem;font-size:0.7rem;">${eyebrow}</div>` +
        `<h3 style="font-family:Georgia,serif;font-size:1.2rem;letter-spacing:-0.02em;margin:0 0 0.3rem;color:var(--text);">${project.name || project.slug}</h3>` +
        `<p style="font-size:0.82rem;color:var(--muted);margin:0 0 0.5rem;line-height:1.4;">${project.currentFocus ? String(project.currentFocus).slice(0, 90) + (project.currentFocus.length > 90 ? '…' : '') : '(no recent focus recorded)'}</p>` +
        `<div style="font-size:0.78rem;color:${accent};font-weight:700;letter-spacing:0.04em;">${metricLabel}: ${metricValue}</div>` +
      `</article>`;
    };

    mount.innerHTML =
      card('🏆 IGNIS Leader',     '#FFC400', byIgnis[0], 'Score', fmtInt(byIgnis[0]?.ignisScore) + ' · ' + (byIgnis[0]?.ignisGrade || '—')) +
      card('⚡ Most Recently Touched', '#5ad28d', byFresh[0], 'Days since touch', byFresh[0]?.staleDays ?? '—') +
      card('✓ Cleanest Pipeline', '#7EC9FF', byClean[0], 'Friction points', byClean[0]?.blockerCount ?? 0);
  }

  // ─── 5. CHART HOVER TOOLTIP ───────────────────────────────────────────────
  // Upgrade the existing #oracle-velocity-chart SVG with a true crosshair +
  // value readout following pointer position.
  function wireChartHover(velocity) {
    const svg = document.getElementById('oracle-velocity-chart');
    const label = document.getElementById('vel-hover-label');
    const line = document.getElementById('vel-hover-line');
    if (!svg || !velocity?.series?.dates) return;
    const dates   = velocity.series.dates;
    const commits = velocity.series.commits || [];
    const ignis   = velocity.series.ignis || [];
    const active  = velocity.series.activeRepos || [];
    const n = dates.length;
    const W = 1000, H = 360;
    const padLeft = 38, padRight = 18, plotW = W - padLeft - padRight;
    const colW = plotW / Math.max(n - 1, 1);

    svg.addEventListener('pointermove', (e) => {
      const rect = svg.getBoundingClientRect();
      const xPx = ((e.clientX - rect.left) / rect.width) * W;
      const idx = Math.round((xPx - padLeft) / colW);
      if (idx < 0 || idx >= n) return;
      const x = padLeft + idx * colW;
      line.setAttribute('x1', x);
      line.setAttribute('x2', x);
      line.setAttribute('y1', 0);
      line.setAttribute('y2', H);
      label.textContent = `${dates[idx]} · ${commits[idx]||0} signals · ${active[idx]||0} worlds · cognition ${fmtInt(ignis[idx])}`;
    });
    svg.addEventListener('pointerleave', () => {
      line.setAttribute('x1', -10);
      line.setAttribute('x2', -10);
      label.textContent = '';
    });
  }

  // ─── 6. FORGE FORECAST (S136) ─────────────────────────────────────────────
  // Three forward-looking prediction cards: Likely to ship · Climbing fast ·
  // Awakening from rest. Data sourced from computeForecasts() in the shared
  // module. Each card carries a confidence band + IGNIS-voice rationale.
  function renderForecasts(forecasts, mount) {
    if (!mount || !forecasts) return;
    const bands = (c) => c >= 70 ? 'high' : c >= 50 ? 'mid' : 'low';
    const bandColor = { high: '#5ad28d', mid: '#FFC400', low: '#7EC9FF' };
    function card(eyebrow, accent, picks, emptyCopy, ctaPrefix) {
      const top = picks[0];
      if (!top) {
        return `<article style="padding:1.3rem 1.4rem;border-radius:14px;background:linear-gradient(140deg,rgba(13,17,28,0.92),rgba(20,14,8,0.92));border:1px solid ${accent}22;border-left:3px solid ${accent}66;opacity:0.6;">
          <div class="eyebrow" style="color:${accent};margin-bottom:0.5rem;">${eyebrow}</div>
          <p style="color:var(--muted);font-style:italic;margin:0;font-size:0.9rem;">${emptyCopy}</p>
        </article>`;
      }
      const band = bands(top.confidence);
      const badge = bandColor[band];
      const second = picks[1] ? `<p style="color:var(--muted);font-size:0.78rem;margin:0.7rem 0 0;padding-top:0.7rem;border-top:1px solid rgba(255,255,255,0.06);">Also watching: <strong style="color:var(--text);">${escapeHtml(picks[1].name)}</strong> (${picks[1].confidence}%)</p>` : '';
      return `<article style="padding:1.3rem 1.4rem;border-radius:14px;background:linear-gradient(140deg,rgba(13,17,28,0.96),rgba(20,14,8,0.93));border:1px solid ${accent}3a;border-left:3px solid ${accent};">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:0.6rem;">
          <div class="eyebrow" style="color:${accent};">${eyebrow}</div>
          <span style="font-size:0.7rem;font-weight:800;letter-spacing:0.08em;color:${badge};background:${badge}14;border:1px solid ${badge}44;padding:0.18rem 0.5rem;border-radius:999px;">${top.confidence}% · ${band}</span>
        </div>
        <h3 style="font-family:Georgia,serif;font-size:1.3rem;letter-spacing:-0.02em;margin:0 0 0.4rem;color:var(--text);">${escapeHtml(top.name)}</h3>
        <p style="color:var(--muted);font-size:0.92rem;line-height:1.55;margin:0;">${escapeHtml(top.body)}</p>
        ${top.liveUrl ? `<a href="${escapeHtml(top.liveUrl)}" target="_blank" rel="noreferrer" style="display:inline-block;margin-top:0.8rem;font-size:0.82rem;font-weight:700;color:${accent};text-decoration:none;">${ctaPrefix} →</a>` : ''}
        ${second}
      </article>`;
    }
    mount.innerHTML =
      card('🜂 Likely to ship soon', '#FF7A00', forecasts.shipSoon, 'No imminent ships read from current signals.', 'Visit the live build') +
      card('↑ Climbing fast', '#5ad28d', forecasts.climbing, 'No projects climbing sharply in the window.', 'See it live') +
      card('◐ Awakening from rest', '#7EC9FF', forecasts.awakening, 'No long-dormant projects stirring right now.', 'See it live');
  }

  // ─── 7. LAYER 3 CONSTELLATION (S138) ─────────────────────────────────────
  function activeProjects(ecosystem) {
    return (ecosystem?.projects || [])
      .filter((p) => p && p.slug && p.health !== 'red')
      .sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug)));
  }

  function projectSignals(project, velocity) {
    const repo = velocity?.perRepo?.[project.slug] || velocity?.perRepo?.[String(project.slug).toLowerCase()] || {};
    const friction = Number(project.blockerCount || 0);
    const stale = typeof project.staleDays === 'number' ? project.staleDays : null;
    const focus = String(project.currentFocus || project.nextMilestone || '').trim();
    return {
      signals: Number(repo.totalCommits || 0),
      activeDays: Number(repo.activeDays || 0),
      working: Boolean(repo.workingChanges),
      freshness: stale === null ? 'unknown' : stale === 0 ? 'today' : stale === 1 ? 'yesterday' : `${stale} days ago`,
      friction: friction === 0 ? 'clear' : friction === 1 ? '1 friction point' : `${friction} friction points`,
      focus: focus ? focus.slice(0, 140) + (focus.length > 140 ? '…' : '') : 'No public focus line recorded yet.',
    };
  }

  function populateCompareSelect(select, projects, selectedSlug) {
    if (!select) return;
    select.innerHTML = projects.map((p) =>
      `<option value="${escapeHtml(p.slug)}"${p.slug === selectedSlug ? ' selected' : ''}>${escapeHtml(p.name || p.slug)}</option>`
    ).join('');
  }

  function renderComparisonCard(project, velocity, accent) {
    const s = projectSignals(project, velocity);
    return `<article style="padding:1.2rem 1.3rem;border-radius:14px;background:linear-gradient(140deg,rgba(13,17,28,0.96),rgba(8,17,24,0.92));border:1px solid ${accent}33;border-left:3px solid ${accent};">
      <div class="eyebrow" style="color:${accent};margin-bottom:0.5rem;">${escapeHtml(String(project.vaultStatus || 'forge').toUpperCase())}</div>
      <h3 style="font-family:Georgia,serif;font-size:1.25rem;letter-spacing:-0.02em;margin:0 0 0.5rem;color:var(--text);">${escapeHtml(project.name || project.slug)}</h3>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0.55rem;margin:0 0 0.8rem;">
        <span style="font-size:0.78rem;color:var(--muted);"><strong style="display:block;color:var(--text);font-size:1.05rem;">${fmtInt(s.signals)}</strong>signals</span>
        <span style="font-size:0.78rem;color:var(--muted);"><strong style="display:block;color:var(--text);font-size:1.05rem;">${fmtInt(s.activeDays)}</strong>active days</span>
        <span style="font-size:0.78rem;color:var(--muted);"><strong style="display:block;color:var(--text);font-size:1.05rem;">${escapeHtml(s.freshness)}</strong>freshness</span>
        <span style="font-size:0.78rem;color:var(--muted);"><strong style="display:block;color:var(--text);font-size:1.05rem;">${escapeHtml(s.friction)}</strong>friction</span>
      </div>
      <p style="font-size:0.86rem;line-height:1.55;color:var(--muted);margin:0;">${escapeHtml(s.focus)}</p>
    </article>`;
  }

  function renderComparison(ecosystem, velocity, mount) {
    const selectA = $('oracle-compare-a');
    const selectB = $('oracle-compare-b');
    const share = $('oracle-compare-share');
    if (!mount || !selectA || !selectB) return;
    const projects = activeProjects(ecosystem);
    if (projects.length < 2) return;

    const params = new URLSearchParams(window.location.search);
    const requested = String(params.get('compare') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const byScore = [...projects].sort((a, b) => (b.ignisScore || 0) - (a.ignisScore || 0));
    let aSlug = projects.some((p) => p.slug === requested[0]) ? requested[0] : byScore[0].slug;
    let bSlug = projects.some((p) => p.slug === requested[1]) && requested[1] !== aSlug
      ? requested[1]
      : (byScore.find((p) => p.slug !== aSlug)?.slug || projects[1].slug);

    const draw = () => {
      if (selectA.value === selectB.value) {
        const replacement = projects.find((p) => p.slug !== selectA.value);
        if (replacement) selectB.value = replacement.slug;
      }
      const a = projects.find((p) => p.slug === selectA.value) || projects[0];
      const b = projects.find((p) => p.slug === selectB.value) || projects[1];
      mount.innerHTML = renderComparisonCard(a, velocity, '#FF7A00') + renderComparisonCard(b, velocity, '#7EC9FF');
      const next = new URL(window.location.href);
      next.searchParams.set('compare', `${a.slug},${b.slug}`);
      history.replaceState(null, '', next);
      if (share) share.href = next.pathname + next.search;
    };

    populateCompareSelect(selectA, projects, aSlug);
    populateCompareSelect(selectB, projects, bSlug);
    selectA.addEventListener('change', draw);
    selectB.addEventListener('change', draw);
    draw();
  }

  function scoreGravityPair(a, b) {
    const bName = String(b.name || '').toLowerCase();
    const bSlug = String(b.slug || '').toLowerCase();
    const haystack = [
      a.currentFocus,
      a.nextMilestone,
      a.voice?.quote,
      ...(Array.isArray(a.voice?.signals) ? a.voice.signals : []),
    ].join(' ').toLowerCase();
    let score = 0;
    if (bName && haystack.includes(bName)) score += 6;
    if (bSlug && haystack.includes(bSlug)) score += 4;
    if (a.medium && b.medium && a.medium === b.medium) score += 1;
    if (a.type && b.type && a.type === b.type) score += 1;
    if (String(a.currentFocus || '').toLowerCase().includes('cross') || String(a.voice?.quote || '').toLowerCase().includes('cross')) score += 1;
    return score;
  }

  function renderGravity(ecosystem, mount) {
    if (!mount) return;
    const projects = activeProjects(ecosystem);
    const pairs = [];
    for (const a of projects) {
      for (const b of projects) {
        if (a.slug === b.slug) continue;
        const score = scoreGravityPair(a, b);
        if (score > 0) pairs.push({ a, b, score });
      }
    }
    pairs.sort((x, y) => y.score - x.score || String(x.a.name).localeCompare(String(y.a.name)));
    const top = pairs.slice(0, 3);
    if (!top.length) {
      mount.innerHTML = `<article style="padding:1.2rem 1.3rem;border-radius:14px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);grid-column:1/-1;"><p style="color:var(--muted);margin:0;">No strong cross-project gravity surfaced in the public feed yet.</p></article>`;
      return;
    }
    mount.innerHTML = top.map((pair, index) => {
      const accent = ['#FFC400', '#5ad28d', '#7EC9FF'][index] || '#FFC400';
      const reason = pair.score >= 6 ? 'directly named in public focus or voice' : 'shares medium, type, or cross-project language';
      return `<article style="padding:1.2rem 1.3rem;border-radius:14px;background:linear-gradient(140deg,rgba(13,17,28,0.96),rgba(8,17,24,0.92));border:1px solid ${accent}33;border-left:3px solid ${accent};">
        <div class="eyebrow" style="color:${accent};margin-bottom:0.5rem;">Gravity ${index + 1}</div>
        <h3 style="font-family:Georgia,serif;font-size:1.15rem;letter-spacing:-0.02em;margin:0 0 0.45rem;color:var(--text);">${escapeHtml(pair.a.name || pair.a.slug)} → ${escapeHtml(pair.b.name || pair.b.slug)}</h3>
        <p style="font-size:0.86rem;line-height:1.55;color:var(--muted);margin:0;">These worlds pull together because ${reason}. Gravity score ${pair.score}.</p>
      </article>`;
    }).join('');
  }

  function renderChartMarkers(velocity) {
    const markerGroup = $('vel-event-markers');
    if (!markerGroup || !velocity?.series?.dates?.length) return;
    const dates = velocity.series.dates;
    const ignis = velocity.series.ignis || [];
    const commits = velocity.series.commits || [];
    const W = 1000, H = 360, padLeft = 38, padRight = 18, plotW = W - padLeft - padRight;
    const xForDate = (date) => {
      const idx = dates.indexOf(date);
      if (idx < 0) return null;
      return padLeft + (idx * (plotW / Math.max(dates.length - 1, 1)));
    };
    const bestCognitionIdx = ignis.reduce((best, value, idx) => value > (ignis[best] || -Infinity) ? idx : best, 0);
    const peakDate = velocity.ecosystem?.peakCommitDay;
    const markers = [
      peakDate && { date: peakDate, label: 'Loudest day', accent: '#FF7A00' },
      dates[bestCognitionIdx] && { date: dates[bestCognitionIdx], label: 'Cognition crest', accent: '#5ad28d' },
      dates[dates.length - 1] && { date: dates[dates.length - 1], label: commits[commits.length - 1] > 0 ? 'Latest pulse' : 'Today', accent: '#7EC9FF' },
    ].filter(Boolean);
    markerGroup.innerHTML = markers.map((m, i) => {
      const x = xForDate(m.date);
      if (x === null) return '';
      const y = 24 + (i * 17);
      return `<g class="vel-event-marker" data-label="${escapeHtml(m.label)}">
        <line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="${m.accent}" stroke-width="1" stroke-dasharray="4 5" opacity="0.45"></line>
        <rect x="${Math.min(x + 6, W - 150)}" y="${y - 11}" width="138" height="16" rx="8" fill="rgba(13,17,28,0.88)" stroke="${m.accent}" stroke-opacity="0.45"></rect>
        <text x="${Math.min(x + 14, W - 142)}" y="${y}" fill="${m.accent}" font-family="Inter, sans-serif" font-size="9" font-weight="700" letter-spacing="0.08em">${escapeHtml(m.label.toUpperCase())}</text>
      </g>`;
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ─── INIT ────────────────────────────────────────────────────────────────
  async function init() {
    const insightsMount  = $('oracle-insights');
    const heatmapMount   = $('oracle-heatmap');
    const donutMount     = $('oracle-lifecycle');
    const moversMount    = $('oracle-movers');
    const forecastsMount = $('oracle-forecasts');
    const comparisonMount = $('oracle-comparison');
    const gravityMount = $('oracle-gravity');
    // Bail if none of our mount points exist (page isn't /oracle/).
    if (!insightsMount && !heatmapMount && !donutMount && !moversMount && !forecastsMount && !comparisonMount && !gravityMount) return;

    const { velocity, ecosystem } = await load();

    if (insightsMount)  renderInsights(computeInsights(velocity, ecosystem), insightsMount);
    if (heatmapMount)   renderHeatmap(velocity, heatmapMount);
    if (donutMount)     renderLifecycleDonut(ecosystem, donutMount);
    if (moversMount)    renderTopMovers(ecosystem, moversMount);
    if (forecastsMount && Compute && Compute.computeForecasts) {
      renderForecasts(Compute.computeForecasts(velocity, ecosystem), forecastsMount);
    }
    if (comparisonMount) renderComparison(ecosystem, velocity, comparisonMount);
    if (gravityMount) renderGravity(ecosystem, gravityMount);
    if (velocity) renderChartMarkers(velocity);
    if (velocity)       wireChartHover(velocity);

    // Honest-dark sweep: hide any panel whose mount ended up empty. On prod the
    // public ecosystem feed (S193) fills cognition/lifecycle/movers/gravity/
    // comparison, while the velocity-only panels (insights/heatmap/forecasts)
    // have no public series yet and self-hide rather than show an empty box.
    [insightsMount, heatmapMount, donutMount, moversMount, forecastsMount, comparisonMount, gravityMount]
      .forEach((m) => { if (m && !m.children.length && !m.textContent.trim()) { const sec = m.closest('section'); if (sec) sec.style.display = 'none'; } });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
