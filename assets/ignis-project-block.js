// IGNIS Project Block — live per-project intelligence widget
// S134. Reads /ignis/output/portfolio-pulse.json + project-voices.json client-side.
// Renders: vault status pill, health, current focus excerpt, freshness, IGNIS voice quote.
//
// Usage: drop <div class="ignis-project-block" data-project="<pulse-name>" data-voice="<voice-key>"></div>
// into a page. The widget auto-mounts on DOMContentLoaded.

(function () {
  'use strict';

  const ECOSYSTEM_URL = '/ignis/output/ecosystem-state.json';
  const PULSE_URL = '/ignis/output/portfolio-pulse.json';
  const VOICES_URL = '/ignis/output/project-voices.json';

  let _cache = null;
  async function loadData() {
    if (_cache) return _cache;
    try {
      // Prefer ecosystem-state (richer, voices baked in). Fall back to pulse + voices.
      const ecoRes = await fetch(ECOSYSTEM_URL, { cache: 'force-cache' }).catch(() => null);
      if (ecoRes && ecoRes.ok) {
        const eco = await ecoRes.json();
        if (eco?.projects?.length) {
          const pulse = {
            entries: eco.projects.map(p => ({
              id: p.slug, name: p.name, health: p.health, vaultStatus: p.vaultStatus,
              currentFocus: p.currentFocus, blockerCount: p.blockerCount,
              lastUpdated: p.lastUpdated, staleDays: p.staleDays,
            })),
          };
          const voices = { voices: Object.fromEntries(eco.projects.filter(p => p.voice).map(p => [p.slug, p.voice])) };
          _cache = { pulse, voices };
          return _cache;
        }
      }
      const [pulseRes, voicesRes] = await Promise.all([
        fetch(PULSE_URL, { cache: 'force-cache' }),
        fetch(VOICES_URL, { cache: 'force-cache' }),
      ]);
      const pulse = pulseRes.ok ? await pulseRes.json() : null;
      const voices = voicesRes.ok ? await voicesRes.json() : null;
      _cache = { pulse, voices };
      return _cache;
    } catch (e) {
      return { pulse: null, voices: null };
    }
  }

  function findPulseEntry(pulse, name) {
    if (!pulse?.entries) return null;
    const lower = String(name).toLowerCase();
    return (
      pulse.entries.find(e => String(e.name).toLowerCase() === lower) ||
      pulse.entries.find(e => String(e.id || '').toLowerCase().endsWith('\\' + lower)) ||
      pulse.entries.find(e => String(e.name).toLowerCase().replace(/[\s_-]/g, '') === lower.replace(/[\s_-]/g, '')) ||
      null
    );
  }

  function healthGlyph(h) {
    switch (String(h || '').toLowerCase()) {
      case 'green': return { dot: '#5ad28d', label: 'green' };
      case 'yellow': return { dot: '#f5b042', label: 'yellow' };
      case 'red': return { dot: '#ff5c5c', label: 'red' };
      default: return { dot: '#888', label: 'unknown' };
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function clipFocus(s, max = 200) {
    if (!s) return '';
    s = String(s).replace(/\s+/g, ' ').trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1).replace(/[\s,;.—-]+$/, '') + '…';
  }

  function publicText(s) {
    return String(s || '')
      .replace(/\bcommit counts?\b/gi, 'signal counts')
      .replace(/\bcommits?\b/gi, (match) => match.toLowerCase().endsWith('s') ? 'signals' : 'signal')
      .replace(/\bblocker counts?\b/gi, 'friction signals')
      .replace(/\bblockers?\b/gi, (match) => match.toLowerCase().endsWith('s') ? 'friction points' : 'friction point')
      .replace(/\binternal scoring\b/gi, 'studio scoring')
      .replace(/\binternal\b/gi, 'studio-side')
      .replace(/\bHuman Action Required\b/gi, 'Founder review needed')
      .replace(/\bHUMAN ACTION\b/gi, 'FOUNDER REVIEW')
      .replace(/\bHUMAN\b/g, 'FOUNDER')
      .replace(/\bhuman-blocked\b/gi, 'founder-review')
      .replace(/\boperator vocabulary\b/gi, 'studio vocabulary')
      .replace(/\boperator\b/gi, 'studio');
  }

  function ago(dateStr) {
    if (!dateStr) return '';
    const then = new Date(dateStr).getTime();
    if (!Number.isFinite(then)) return '';
    const days = Math.floor((Date.now() - then) / 86_400_000);
    if (days < 1) return 'today';
    if (days === 1) return '1d ago';
    return days + 'd ago';
  }

  function evidenceChips(evidence) {
    if (!evidence) return '';
    const chips = [];
    if (evidence.regime) {
      chips.push(`<span class="ignis-evidence-chip" title="regime.json"><strong>regime</strong> ${escapeHtml(evidence.regime)}</span>`);
    }
    if (typeof evidence.trendPerCycle === 'number') {
      const sign = evidence.trendPerCycle > 0 ? '+' : '';
      const cls = evidence.trendPerCycle > 100 ? 'up' : evidence.trendPerCycle < -100 ? 'down' : 'flat';
      chips.push(`<span class="ignis-evidence-chip ignis-evidence-${cls}" title="regime.json cues"><strong>trend</strong> ${sign}${evidence.trendPerCycle}/cycle</span>`);
    }
    if (typeof evidence.mindScore === 'number' && evidence.mindScore > 0) {
      chips.push(`<span class="ignis-evidence-chip" title="mind-score.json"><strong>score</strong> ${evidence.mindScore.toLocaleString()}</span>`);
    }
    if (typeof evidence.coveragePct === 'number') {
      chips.push(`<span class="ignis-evidence-chip" title="regime.json cues"><strong>coverage</strong> ${evidence.coveragePct}%</span>`);
    }
    if (evidence.topAuthorityPillar) {
      chips.push(`<span class="ignis-evidence-chip" title="evidence-centrality.json"><strong>top pillar</strong> ${escapeHtml(evidence.topAuthorityPillar)}</span>`);
    }
    if (typeof evidence.openContradictions === 'number' && evidence.openContradictions > 0) {
      chips.push(`<span class="ignis-evidence-chip ignis-evidence-warn" title="contradiction-ledger.json"><strong>open contradictions</strong> ${evidence.openContradictions}</span>`);
    }
    if (evidence.recommendationUnchanged === true) {
      chips.push(`<span class="ignis-evidence-chip" title="recommendation-diff.json"><strong>top-rec</strong> held last cycle</span>`);
    }
    if (typeof evidence.feedbackReliabilityPct === 'number') {
      chips.push(`<span class="ignis-evidence-chip" title="feedback-loop.json"><strong>feedback reliability</strong> ${evidence.feedbackReliabilityPct}%</span>`);
    }
    return chips.join('');
  }

  // S136: redesigned for public-facing /oracle/ — voice quote is the centerpiece,
  // dev metadata (evidence chips, raw .json sources, version eyebrows, blocker
  // counts, staleDays numbers) is gone. The card now reads like a curator's
  // note on a museum wall — status badge, project name, big serif quote, one
  // line of "what's underway right now", and a single primary CTA.
  function render(el, pulseEntry, voiceEntry, fallback) {
    const health = healthGlyph(pulseEntry?.health || fallback?.health);
    const status = String(pulseEntry?.vaultStatus || fallback?.vaultStatus || 'forge').toUpperCase();
    const focus = publicText(clipFocus(pulseEntry?.currentFocus || fallback?.focus || 'A new signal is being read…', 140));
    const updated = ago(pulseEntry?.lastUpdated || fallback?.lastUpdated);
    const quote = publicText(voiceEntry?.quote || fallback?.quote || 'The flame reads this project.');
    const projectName = el.getAttribute('data-project') || '';
    // Status-derived accent colour: SPARKED → gold, FORGE → orange, others → steel.
    // SEALED retired — VAULTED is what sealed means (coined vocab).
    const statusAccent = status === 'SPARKED' ? '#FFC400'
                      : status === 'FORGE'   ? '#FF7A00'
                      : status === 'VAULTED' ? '#94a3b8'
                      :                         '#94a3b8';
    const statusLabel = status === 'SPARKED' ? '🔥 Sparked'
                     : status === 'FORGE'   ? '⚒ In The Forge'
                     : status === 'VAULTED' ? '🔒 Vaulted'
                     :                         escapeHtml(status);
    const liveUrl = el.dataset.liveUrl || pulseEntry?.liveUrl || fallback?.liveUrl || '';

    el.innerHTML = `
      <div class="ignis-block-frame" style="--status-accent:${statusAccent};">
        <div class="ignis-block-header">
          <span class="ignis-block-pill" style="background:${statusAccent}14;border-color:${statusAccent}44;color:${statusAccent};">${statusLabel}</span>
          ${projectName ? `<h3 class="ignis-block-title">${escapeHtml(projectName)}</h3>` : ''}
        </div>

        <blockquote class="ignis-block-quote">
          <p>${escapeHtml(quote)}</p>
          <footer>— IGNIS, reading the vault</footer>
        </blockquote>

        ${focus ? `
        <div class="ignis-block-focus">
          <span class="ignis-block-focus-label">Right now</span>
          <p>${escapeHtml(focus)}</p>
        </div>` : ''}

        <div class="ignis-block-footer">
          ${liveUrl ? `<a href="${escapeHtml(liveUrl)}" class="ignis-block-link ignis-block-live" target="_blank" rel="noopener">Visit live →</a>` : ''}
          ${updated ? `<span class="ignis-block-meta">Touched ${escapeHtml(updated)}</span>` : ''}
        </div>
      </div>
    `;
  }

  async function mount(el) {
    const projectName = el.getAttribute('data-project');
    const voiceKey = el.getAttribute('data-voice') || projectName?.toLowerCase().replace(/\s+/g, '-');
    const fallback = {
      health: el.getAttribute('data-health') || 'green',
      vaultStatus: el.getAttribute('data-status') || 'forge',
      focus: el.getAttribute('data-focus') || '',
      lastUpdated: el.getAttribute('data-updated') || '',
      quote: el.getAttribute('data-quote') || '',
    };

    const { pulse, voices } = await loadData();
    const pulseEntry = projectName ? findPulseEntry(pulse, projectName) : null;
    const voiceEntry = voiceKey && voices?.voices ? voices.voices[voiceKey] : null;
    render(el, pulseEntry, voiceEntry, fallback);
  }

  function init() {
    const blocks = document.querySelectorAll('.ignis-project-block:not([data-ignis-mounted])');
    for (const el of blocks) {
      el.setAttribute('data-ignis-mounted', '1');
      mount(el);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // expose for hot remount (Oracle page reuses this)
  window.IgnisProjectBlock = { mount, init };
})();
