(() => {
  'use strict';
  const roots = [...document.querySelectorAll('[data-analytica-surface]')];
  if (!roots.length) return;
  const fmt = (metric) => metric.available === false
    ? 'Unavailable'
    : new Intl.NumberFormat('en-US', metric.format === 'percent' ? { style: 'percent', maximumFractionDigits: 0 } : undefined)
      .format(metric.format === 'percent' ? metric.value / 100 : metric.value);
  const date = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value));
  const card = (metric, definition, deep) => {
    const article = document.createElement('article');
    article.className = 'analytica-metric';
    article.dataset.state = metric.available === false ? 'unavailable' : (metric.freshnessState || 'unknown');
    article.innerHTML = `<p class="analytica-metric__value"></p><h3></h3><p class="analytica-metric__unit"></p><p class="analytica-metric__reading"></p><p class="analytica-metric__meta"></p><details class="analytica-metric__provenance"><summary>Measurement receipt</summary><dl></dl></details>`;
    article.querySelector('.analytica-metric__value').textContent = fmt(metric);
    article.querySelector('h3').textContent = metric.label;
    article.querySelector('.analytica-metric__unit').textContent = `${metric.unitOrDenominator} · ${metric.period}`;
    article.querySelector('.analytica-metric__reading').textContent = metric.available === false
      ? metric.unavailableReason
      : deep ? (metric.interpretation || definition || '') : (metric.interpretation || '');
    const estimate = metric.measurement?.kind === 'estimate' ? ` · estimated (sample interval up to ${metric.measurement.sampleInterval}×)` : '';
    article.querySelector('.analytica-metric__meta').textContent = `Observed through ${date(metric.observedThrough || metric.computedAt)} · ${metric.freshnessState || 'unknown'}${estimate}`;
    const provenance = article.querySelector('dl');
    const rows = [
      ['Source', metric.sourceType],
      ['Dataset', metric.sourceDataset],
      ['Environment', metric.environment],
      ['Bots', metric.botPolicy],
      ['Window', metric.window ? `${metric.window.start} to ${metric.window.endExclusive} (exclusive)` : metric.period],
    ];
    rows.forEach(([term, value]) => {
      const dt = document.createElement('dt'); dt.textContent = term;
      const dd = document.createElement('dd'); dd.textContent = value || 'Not applicable';
      provenance.append(dt, dd);
    });
    return article;
  };

  const reconciliation = (feed) => {
    const target = document.querySelector('[data-analytics-reconciliation]');
    if (!target || !Array.isArray(feed.reconciliation?.dimensions)) return;
    const cards = feed.reconciliation.dimensions.map((dimension) => {
      const article = document.createElement('article');
      const title = document.createElement('h3'); title.textContent = dimension.id.replaceAll('-', ' ');
      const copy = document.createElement('p'); copy.textContent = dimension.meaning;
      article.append(title, copy);
      return article;
    });
    target.replaceChildren(...cards);
  };
  fetch('/stats.json', { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((feed) => {
      if (feed.feedVersion !== 'analytica-feed-v1') throw new Error('unsupported feed');
      const byId = new Map(feed.metrics.map((metric) => [metric.id, metric]));
      reconciliation(feed);
      roots.forEach((root) => {
        const deep = root.dataset.analyticaSurface === 'deep';
        const metrics = deep ? feed.metrics : feed.showcase.map((id) => byId.get(id)).filter(Boolean);
        const grid = root.querySelector('[data-analytica-grid]');
        grid.replaceChildren(...metrics.map((metric) => card(metric, feed.definitions?.[metric.id], deep)));
        const stamp = root.querySelector('[data-analytica-asof]');
        if (stamp) stamp.textContent = `Precomputed daily · feed as of ${date(feed.generatedAt)}`;
        root.dataset.state = 'ready';
      });
    })
    .catch(() => roots.forEach((root) => {
      root.dataset.state = 'unavailable';
      const status = root.querySelector('[data-analytica-status]');
      if (status) status.textContent = 'The public feed is temporarily unavailable. No cached number is being presented as current.';
    }));
})();
