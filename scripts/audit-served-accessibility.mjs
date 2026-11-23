#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

export const ORIGIN = 'https://vaultsparkstudios.com';
export const ROUTES = Object.freeze([
  '/', '/games/', '/community/', '/leaderboards/', '/journal/', '/contact/',
]);
export const OUTPUT = 'axe-results/served-accessibility.json';

export async function readOnlyRequest(route) {
  const request = route.request();
  let url;
  try {
    url = new URL(request.url());
  } catch {
    return route.abort('blockedbyclient');
  }
  if (!['GET', 'HEAD'].includes(request.method())
      || !['https:', 'data:', 'blob:'].includes(url.protocol)) {
    return route.abort('blockedbyclient');
  }
  return route.continue();
}

async function scanWithDeadline(page, analyze) {
  let timer;
  const scan = Promise.resolve().then(() => analyze(page));
  scan.catch(() => {});
  try {
    return await Promise.race([
      scan,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('served_audit_timeout')), 30000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function auditServed({ launchBrowser, analyze, writeReport } = {}) {
  if (!launchBrowser || !analyze) {
    const { chromium } = require('@playwright/test');
    const AxeBuilder = require('@axe-core/playwright').default;
    launchBrowser = () => chromium.launch();
    analyze = page => new AxeBuilder({ page }).analyze();
  }

  const report = {
    scope: 'Supplementary served production accessibility; clean public browser, no auth/form submission',
    origin: ORIGIN,
    routes: ROUTES,
    allImpacts: true,
    results: [],
  };
  const browser = await launchBrowser();
  try {
    for (const route of ROUTES) {
      const row = { requestedUrl: ORIGIN + route, violations: [], error: null };
      let context;
      try {
        context = await browser.newContext({ serviceWorkers: 'block' });
        await context.route('**/*', readOnlyRequest);
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const response = await page.goto(row.requestedUrl, {
          waitUntil: 'load', timeout: 30000,
        });
        row.httpStatus = response?.status() ?? null;
        row.finalUrl = page.url();
        row.title = await page.title();

        const challenged = /just a moment|attention required|checking your browser/i.test(row.title)
          || await page.locator('#challenge-running,#challenge-stage,[data-cf-chl]').count();
        if (row.httpStatus !== 200 || new URL(row.finalUrl).origin !== ORIGIN || challenged) {
          throw Error('served_page_unavailable_or_challenged');
        }

        const results = await scanWithDeadline(page, analyze);
        if (!Array.isArray(results?.violations)) throw Error('served_audit_incomplete');
        // Retain every default rule and impact; no tag, iframe or impact exclusion.
        row.violations = results.violations.map(violation => ({
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          nodes: violation.nodes.map(node => ({
            target: node.target, html: node.html, failureSummary: node.failureSummary,
          })),
        }));
      } catch (error) {
        const publicErrors = [
          'served_page_unavailable_or_challenged', 'served_audit_timeout', 'served_audit_incomplete',
        ];
        row.error = publicErrors.includes(error?.message) ? error.message : 'served_audit_failed';
      } finally {
        if (context) await context.close();
        report.results.push(row);
      }
    }
  } finally {
    await browser.close();
  }

  report.complete = report.results.length === ROUTES.length
    && report.results.every(row => !row.error);
  report.failed = !report.complete || report.results.some(row => row.violations.length > 0);
  report.finishedAt = new Date().toISOString();
  const write = writeReport || (value => {
    fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
    fs.writeFileSync(OUTPUT, JSON.stringify(value, null, 2) + '\n');
  });
  await write(report);
  return report;
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') {
    return { usage: 'node scripts/audit-served-accessibility.mjs --audit-served-production', network: false };
  }
  if (args.length !== 1 || args[0] !== '--audit-served-production') {
    throw Error('explicit_served_production_audit_required');
  }
  const report = await auditServed();
  console.log(JSON.stringify({
    routes: report.results.map(row => ({
      url: row.requestedUrl, violations: row.violations.length, error: row.error,
    })),
    output: OUTPUT,
    complete: report.complete,
    failed: report.failed,
  }));
  if (report.failed) process.exitCode = 1;
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Served accessibility audit unavailable');
    process.exitCode = 1;
  });
}
