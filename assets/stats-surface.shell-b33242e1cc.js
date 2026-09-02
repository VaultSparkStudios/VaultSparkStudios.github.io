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
    // S337: built with DOM calls rather than an innerHTML scaffold.
    //
    // The string carried no interpolation and every value below is written with
    // textContent, so this was never an XSS risk - but it IS a Trusted Types
    // injection sink, and this module can run before ambient-core.bundle.js
    // installs the `default` policy that lets the site's ~167 legacy sinks keep
    // working. Under the Report-Only header that race surfaces as a console
    // violation, which is what rejected the S337 release ceremony as `flaky-1`:
    // Firefox logged it on one run and not the retry, because the ordering is a
    // race rather than a constant. Under the founder-approved enforce flip the
    // same race throws and the stats surface renders nothing.
    //
    // A static scaffold needs no policy at all, so the fix is to stop being a
    // sink rather than to depend on load order or reach for a named policy. The
    // provenance rows below already build this way; this now matches them.
    const scaffold = [
      ['p', 'analytica-metric__value'],
      ['h3', null],
      ['p', 'analytica-metric__unit'],
      ['p', 'analytica-metric__reading'],
      ['p', 'analytica-metric__meta'],
    ];
    for (const [tag, className] of scaffold) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      article.append(node);
    }
    const details = document.createElement('details');
    details.className = 'analytica-metric__provenance';
    const summary = document.createElement('summary');
    summary.textContent = 'Measurement receipt';
    details.append(summary, document.createElement('dl'));
    article.append(details);
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
