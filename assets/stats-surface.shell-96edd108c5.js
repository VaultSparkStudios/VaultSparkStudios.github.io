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
    article.innerHTML = `<p class="analytica-metric__value"></p><h3></h3><p class="analytica-metric__unit"></p><p class="analytica-metric__reading"></p><p class="analytica-metric__meta"></p>`;
    article.querySelector('.analytica-metric__value').textContent = fmt(metric);
    article.querySelector('h3').textContent = metric.label;
    article.querySelector('.analytica-metric__unit').textContent = `${metric.unitOrDenominator} · ${metric.period}`;
    article.querySelector('.analytica-metric__reading').textContent = deep ? (metric.interpretation || definition || '') : (metric.interpretation || '');
    article.querySelector('.analytica-metric__meta').textContent = `Computed ${date(metric.computedAt)}`;
    return article;
  };
  fetch('/stats.json', { headers: { Accept: 'application/json' } })
    .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then((feed) => {
      if (feed.feedVersion !== 'analytica-feed-v1') throw new Error('unsupported feed');
      const byId = new Map(feed.metrics.map((metric) => [metric.id, metric]));
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
