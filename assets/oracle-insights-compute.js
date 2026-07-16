/**
 * assets/oracle-insights-compute.js (S136 test-coverage carry)
 *
 * Pure functions that turn velocity + ecosystem data into the narrative
 * cards rendered by `assets/oracle-extra.js`. Extracted from oracle-extra.js
 * so the compute layer is node-testable in isolation (see
 * `tests/oracle-insights.spec.js`).
 *
 * Dual-target export pattern:
 *   - Browser: attaches to `window.VSOracleInsights` (oracle-extra.js consumes it)
 *   - Node:    `module.exports = { computeInsights }` for the test runner
 *
 * Pure / deterministic / no DOM access — keeps unit tests fast and stable.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;                  // node: require('./oracle-insights-compute')
  } else {
    root.VSOracleInsights = api;           // browser: window.VSOracleInsights
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const fmtPct = (n) => (n >= 0 ? '+' : '') + Math.round(n) + '%';
  const fmtInt = (n) => Number(n || 0).toLocaleString();

  /**
   * @param {object} velocity   ecosystem-velocity.json shape (series + ecosystem)
   * @param {object} ecosystem  ecosystem-state.json shape (projects + studioTotals)
   * @param {Date}   now        injectable clock for deterministic tests
   * @returns {Array<{eyebrow:string,accent:string,headline:string,body:string}>}
   */
  function computeInsights(velocity, ecosystem, now) {
    const clock = (now instanceof Date ? now : new Date()).getTime();
    const out = [];
    if (!velocity || !velocity.series) return out;

    const commits = velocity.series.commits || [];
    const active  = velocity.series.activeRepos || [];
    const ignis   = velocity.series.ignis || [];
    const dates   = velocity.series.dates || [];
    const n = dates.length;

    // (a) Velocity vs 30-day average
    if (n >= 14) {
      const last7  = commits.slice(-7).reduce((a, b) => a + b, 0);
      const prior30 = commits.slice(Math.max(0, n - 30), n - 7);
      const avg30  = prior30.length ? prior30.reduce((a, b) => a + b, 0) / prior30.length : 0;
      const last7Daily = last7 / 7;
      const delta = avg30 > 0 ? ((last7Daily - avg30) / avg30) * 100 : 0;
      const tone = delta > 20 ? 'climbing' : delta < -20 ? 'cooling' : 'steady';
      out.push({
        eyebrow: 'Velocity',
        accent: delta > 20 ? '#5ad28d' : delta < -20 ? '#ff5c5c' : '#FFC400',
        headline: `Forge is ${tone}.`,
        body: `Last 7 days averaged ${last7Daily.toFixed(1)} studio signals a day — ${fmtPct(delta)} vs. the prior 30-day baseline of ${avg30.toFixed(1)} a day.`,
      });
    }

    // (b) Co-activity pattern
    if (active.length >= 14) {
      const recent14 = active.slice(-14);
      const multiActive = recent14.filter((c) => c >= 3).length;
      const pct = Math.round((multiActive / 14) * 100);
      if (multiActive >= 7) {
        out.push({
          eyebrow: 'Co-activity',
          accent: '#7EC9FF',
          headline: 'Multiple worlds move together.',
          body: `${multiActive} of the last 14 days had 3+ worlds active at the same time (${pct}% of the window). Cross-project momentum — the studio is firing on more than one axis.`,
        });
      }
    }

    // (c) IGNIS trajectory
    if (ignis.length >= 14) {
      const start = ignis.find((v) => v > 0) || ignis[0];
      const end   = ignis[ignis.length - 1] || start;
      const delta = end - start;
      const pct   = start > 0 ? (delta / start) * 100 : 0;
      out.push({
        eyebrow: 'Studio cognition',
        accent: delta > 0 ? '#5ad28d' : '#f5b042',
        headline: delta > 0 ? `Cognition climbed ${fmtInt(delta)}.` : delta < 0 ? `Cognition dipped ${fmtInt(Math.abs(delta))}.` : 'Cognition held steady.',
        body: `Studio cognition shifted ${fmtPct(pct)} across the window. This reads cross-project pattern strength — the studio's quality of attention — not raw activity. It tracks meaningful work over noise.`,
      });
    }

    // (d) Peak day callout
    if (velocity.ecosystem && velocity.ecosystem.peakCommitDay && velocity.ecosystem.peakCommitCount) {
      const peakDate = new Date(velocity.ecosystem.peakCommitDay + 'T00:00:00Z');
      const days = Math.round((clock - peakDate.getTime()) / 86400000);
      out.push({
        eyebrow: 'Loudest day',
        accent: '#FF7A00',
        headline: `${fmtInt(velocity.ecosystem.peakCommitCount)} signals in one day.`,
        body: `Heaviest single-day output in the 60-day window landed ${days} day${days === 1 ? '' : 's'} ago on ${velocity.ecosystem.peakCommitDay}. That's the studio's recent ceiling.`,
      });
    }

    // Public velocity deliberately omits repo-level and cognition internals.
    // Keep the promised 3-card minimum with a source-derived lifecycle read,
    // never a fabricated co-activity or cognition value.
    if (out.length < 3 && Array.isArray(ecosystem?.projects) && ecosystem.projects.length) {
      const total = ecosystem.projects.length;
      const sparked = ecosystem.projects.filter((project) => String(project.vaultStatus || '').toLowerCase() === 'sparked').length;
      const forge = ecosystem.projects.filter((project) => String(project.vaultStatus || '').toLowerCase() === 'forge').length;
      out.push({
        eyebrow: 'Lifecycle',
        accent: '#7EC9FF',
        headline: `${sparked} live world${sparked === 1 ? '' : 's'}, ${forge} in the forge.`,
        body: `${total} public projects are visible in the constellation. ${Math.round((sparked / total) * 100)}% are SPARKED; the rest remain honestly marked by their current vault status.`,
      });
    }

    return out.slice(0, 4);
  }

  // ─── Forge Forecast (S136) ────────────────────────────────────────────────
  // Forward-looking probabilistic predictions from ecosystem data. Three
  // distinct forecasts:
  //   1. LIKELY TO SHIP   — projects with ship-related focus + recent activity
  //   2. CLIMBING FAST    — projects with 2x+ commits in last 7d vs 30d baseline
  //   3. AWAKENING        — long-dormant projects that just got touched
  //
  // Each forecast carries a confidence percentage derived from signal strength
  // (no fake numbers — they're transparent functions of observed data).
  // Output is brand-voice prose ready for direct render.
  //
  // Note: pure function. Doesn't mention internal metric names in returned
  // strings; the body copy is public-facing studio voice.
  const SHIP_VERBS = /\b(launch|launching|launches|ship|shipping|ships|release|releasing|deploy|deploying|beta|public|live|sparked|cutover|rollout|reveal|drop|drops|dropping)\b/i;

  function computeForecasts(velocity, ecosystem) {
    const out = { shipSoon: [], climbing: [], awakening: [] };
    if (!ecosystem || !Array.isArray(ecosystem.projects)) return out;
    const projects = ecosystem.projects.filter((p) =>
      p && p.slug && (p.health === 'green' || p.health === 'yellow') && p.vaultStatus !== 'vaulted'
    );

    const perRepo = velocity && velocity.perRepo ? velocity.perRepo : {};
    const seriesDays = velocity && velocity.series && velocity.series.dates ? velocity.series.dates.length : 0;

    // 1. LIKELY TO SHIP — currentFocus contains ship verbs + recently touched
    for (const p of projects) {
      const focus = String(p.currentFocus || '');
      const milestone = String(p.nextMilestone || '');
      const text = `${focus} ${milestone}`;
      if (!SHIP_VERBS.test(text)) continue;
      const stale = typeof p.staleDays === 'number' ? p.staleDays : 99;
      if (stale > 14) continue; // hasn't been touched recently — promise without action
      // Confidence: stronger signal when (a) focus contains a ship verb,
      // (b) project is fresh (low stale), (c) per-repo activity is high.
      const repoStats = perRepo[p.slug] || perRepo[(p.slug || '').toLowerCase()] || null;
      const activeDays = repoStats ? (repoStats.activeDays || 0) : 0;
      const recencyBoost = stale <= 2 ? 30 : stale <= 7 ? 15 : 0;
      const activityBoost = Math.min(activeDays * 3, 25);
      const confidence = Math.min(85, 40 + recencyBoost + activityBoost);
      out.shipSoon.push({
        slug: p.slug,
        name: p.name || p.slug,
        confidence,
        body: `Recent focus mentions ${matchedVerb(text)}. Last touched ${stale === 0 ? 'today' : stale === 1 ? 'yesterday' : `${stale} days ago`}. Pattern reads pre-launch.`,
        liveUrl: p.liveUrl || null,
      });
    }
    out.shipSoon.sort((a, b) => b.confidence - a.confidence);

    // 2. CLIMBING FAST — last-7-days activity outpaces 30-day baseline by 2x+
    for (const p of projects) {
      const repoStats = perRepo[p.slug] || perRepo[(p.slug || '').toLowerCase()] || null;
      if (!repoStats || typeof repoStats.totalCommits !== 'number') continue;
      const total = repoStats.totalCommits;
      const activeDays = repoStats.activeDays || 0;
      if (activeDays < 3) continue;                  // need enough signal
      // Rough: if average commits per active-day climbs (proxy: high totalCommits
      // concentrated in few activeDays => intensity).
      const intensity = total / Math.max(activeDays, 1);
      if (intensity < 4 && total < 20) continue;
      const confidence = Math.min(80, 30 + Math.round(intensity * 4) + (activeDays * 2));
      out.climbing.push({
        slug: p.slug,
        name: p.name || p.slug,
        confidence,
        body: `Pace lifted recently — ${total} ships across ${activeDays} active days in the window. The forge is loud on this one.`,
        liveUrl: p.liveUrl || null,
      });
    }
    out.climbing.sort((a, b) => b.confidence - a.confidence);

    // 3. AWAKENING — long-dormant project that was just touched
    for (const p of projects) {
      const stale = typeof p.staleDays === 'number' ? p.staleDays : null;
      if (stale === null) continue;
      const repoStats = perRepo[p.slug] || perRepo[(p.slug || '').toLowerCase()] || null;
      const lastMtime = repoStats && repoStats.lastMtime ? new Date(repoStats.lastMtime).getTime() : null;
      const now = Date.now();
      const mtimeDays = lastMtime ? Math.floor((now - lastMtime) / 86400000) : 999;
      // "Awakening": recorded stale ≥ 14 days but lastMtime ≤ 3 days
      // (something just stirred even though the formal pulse hasn't updated).
      if (stale >= 14 && mtimeDays <= 3) {
        const confidence = Math.min(75, 35 + (stale > 30 ? 25 : 15) + (mtimeDays === 0 ? 10 : 0));
        out.awakening.push({
          slug: p.slug,
          name: p.name || p.slug,
          confidence,
          body: `Quiet for ${stale} days, then a fresh touch ${mtimeDays === 0 ? 'today' : mtimeDays + ' day' + (mtimeDays === 1 ? '' : 's') + ' ago'}. Something stirred. Worth watching.`,
          liveUrl: p.liveUrl || null,
        });
      }
    }
    out.awakening.sort((a, b) => b.confidence - a.confidence);

    return out;
  }

  function matchedVerb(text) {
    const m = SHIP_VERBS.exec(text);
    return m ? `“${m[0].toLowerCase()}”` : 'shipping signals';
  }

  return { computeInsights, computeForecasts, fmtPct, fmtInt };
}));
