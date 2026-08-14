(() => {
  'use strict';
  const root = document.querySelector('[data-ecosystem-stats]');
  if (!root) return;
  const number = new Intl.NumberFormat('en-US');
  const percent = (value) => `${number.format(value)}%`;
  const compact = (value) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const summaryCard = (label, value, note, state = 'ready') => {
    const card = document.createElement('article');
    card.className = 'ecosystem-kpi'; card.dataset.state = state;
    const val = document.createElement('p'); val.className = 'ecosystem-kpi__value'; val.textContent = value;
    const title = document.createElement('h3'); title.textContent = label;
    const copy = document.createElement('p'); copy.textContent = note;
    card.append(val, title, copy); return card;
  };
  const projectCard = (project) => {
    const card = document.createElement('article'); card.className = 'ecosystem-project'; card.dataset.state = project.measurementState;
    const header = document.createElement('div'); header.className = 'ecosystem-project__head';
    const title = document.createElement('h3');
    if (project.liveUrl) { const link = document.createElement('a'); link.href = project.liveUrl; link.textContent = project.name; title.append(link); } else title.textContent = project.name;
    const badge = document.createElement('span'); badge.className = 'ecosystem-badge'; badge.textContent = project.vaultStatus.toUpperCase();
    header.append(title, badge);
    const state = document.createElement('p'); state.className = 'ecosystem-project__state'; state.textContent = project.measurementState.replaceAll('-', ' ');
    const metrics = document.createElement('dl');
    const rows = [
      ['Human page loads', project.audience30.available ? `≈${number.format(project.audience30.pageLoads.estimate)}` : 'Unmeasured'],
      ['Visits', project.audience30.available ? `≈${number.format(project.audience30.visits.estimate)}` : 'Unmeasured'],
      ['HTML responses', project.infrastructure30.available ? number.format(project.infrastructure30.htmlPageViews) : 'Unmeasured'],
      ['Edge requests', project.infrastructure30.available ? number.format(project.infrastructure30.edgeRequests) : 'Unmeasured'],
    ];
    rows.forEach(([term, value]) => { const dt = document.createElement('dt'); dt.textContent = term; const dd = document.createElement('dd'); dd.textContent = value; metrics.append(dt, dd); });
    const scope = document.createElement('p'); scope.className = 'ecosystem-project__scope'; scope.textContent = `${project.hostsMeasured.length || 0} measured host${project.hostsMeasured.length === 1 ? '' : 's'} · ${project.zones.length} registered zone${project.zones.length === 1 ? '' : 's'}`;
    card.append(header, state, metrics, scope); return card;
  };
  fetch('/api/ecosystem-stats.json', { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((data) => {
      const totals = root.querySelector('[data-ecosystem-totals]');
      totals.replaceChildren(
        summaryCard('Human page loads', `≈${number.format(data.totals.humanPageLoads30.estimate)}`, 'Bot-excluded production browser loads · 30 complete UTC days'),
        summaryCard('Human visits', `≈${number.format(data.totals.humanVisits30.estimate)}`, 'Cloudflare visits · production-only · 30 complete UTC days'),
        summaryCard('Audience coverage', percent(data.coverage.audienceProjectCoveragePct), `${data.totals.audienceMeasuredProjects} of ${data.totals.publicProjects} public projects`),
        summaryCard('Edge coverage', percent(data.coverage.edgeProjectCoveragePct), `${data.totals.edgeMeasuredProjects} of ${data.totals.publicProjects} public projects`)
      );
      root.querySelector('[data-ecosystem-projects]').replaceChildren(...data.projects.map(projectCard));
      const form = root.querySelector('[data-ecosystem-filters]');
      const count = form.querySelector('[data-filter-count]');
      const applyFilters = () => {
        const query = form.elements.query.value.trim().toLowerCase();
        const measurement = form.elements.measurement.value;
        const status = form.elements.status.value;
        let visible = 0;
        root.querySelectorAll('.ecosystem-project').forEach((card, index) => {
          const project = data.projects[index];
          const matches = (!query || project.name.toLowerCase().includes(query) || project.slug.includes(query))
            && (measurement === 'all' || project.measurementState === measurement)
            && (status === 'all' || project.vaultStatus === status);
          card.hidden = !matches;
          if (matches) visible++;
        });
        count.textContent = `${visible} of ${data.projects.length} public projects shown`;
      };
      form.addEventListener('input', applyFilters);
      form.addEventListener('change', applyFilters);
      applyFilters();
      root.querySelector('[data-infrastructure-totals]').replaceChildren(
        summaryCard('Edge requests', compact(data.totals.edgeRequests30), 'All requests across registered zones'),
        summaryCard('HTML responses', compact(data.totals.htmlResponses30), 'Cloudflare HTTP pageViews; includes automated traffic'),
        summaryCard('Cached requests', compact(data.totals.cachedRequests30), 'Requests served from cache'),
        summaryCard('Threat events', compact(data.totals.threats30), 'Cloudflare-classified threats at the edge')
      );
      const stamp = root.querySelector('[data-ecosystem-asof]');
      stamp.textContent = `Complete UTC days through ${data.observedThrough} · adaptive estimates labeled · staging and bots excluded from audience`;
      root.dataset.state = 'ready';
    })
    .catch(() => {
      root.dataset.state = 'unavailable';
      root.querySelector('[data-ecosystem-asof]').textContent = 'The aggregate feed is unavailable. Missing data is not shown as zero.';
    });
})();
