#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

export function inspect(js, html) {
  const checks = [
    ['near-viewport observer', /new IntersectionObserver\(/.test(js)],
    ['generous approach margin', /rootMargin:\s*['"]600px 0px['"]/.test(js)],
    ['idle fallback', /requestIdleCallback/.test(js) && /mounted < 4/.test(js)],
    ['dynamic entries use scheduler', /vs:changelog-live-rendered['"],\s*scheduleAll/.test(js)],
    ['unavailable is explicit', /data-count-state['"],\s*['"]unavailable/.test(js)],
    ['available requires positive count', /if \(count > 0/.test(js) && /data-count-state['"],\s*['"]available/.test(js)],
    ['no eager all-entry mount loop', !/querySelectorAll\(['"]\.cl-phase['"]\)\.forEach/.test(js)],
    ['offscreen layout containment', /\.cl-phase\s*\{[^}]*content-visibility:auto;[^}]*contain-intrinsic-size:auto 240px;/s.test(html)],
  ];
  return { checks, ok: checks.every(([, ok]) => ok) };
}

function report(result, label) {
  for (const [name, ok] of result.checks) console.log(`  ${ok ? '✓' : '✘'} ${name}`);
  console.log(`check-changelog-reaction-hydration${label}: ${result.checks.filter(([, ok]) => ok).length}/${result.checks.length}`);
  return result.ok;
}

if (process.argv.includes('--self-test')) {
  const goodJs = `new IntersectionObserver(()=>{}, { rootMargin: '600px 0px' }); requestIdleCallback(()=>{}); while (x && mounted < 4){}; document.addEventListener('vs:changelog-live-rendered', scheduleAll); setAttribute('data-count-state', 'unavailable'); if (count > 0) setAttribute('data-count-state', 'available');`;
  const goodHtml = `.cl-phase { content-visibility:auto; contain-intrinsic-size:auto 240px; }`;
  const positive = inspect(goodJs, goodHtml);
  const eager = inspect(`document.querySelectorAll('.cl-phase').forEach(mountArticle)`, '.cl-phase{}');
  const ok = report(positive, ' --self-test') && !eager.ok && eager.checks.some(([name, pass]) => name === 'no eager all-entry mount loop' && !pass);
  console.log(`  ${ok ? '✓' : '✘'} eager baseline is rejected`);
  process.exit(ok ? 0 : 1);
}

const result = inspect(
  fs.readFileSync(path.join(ROOT, 'assets/changelog-reactions.js'), 'utf8'),
  fs.readFileSync(path.join(ROOT, 'changelog/index.html'), 'utf8'),
);
process.exit(report(result, '') ? 0 : 1);
