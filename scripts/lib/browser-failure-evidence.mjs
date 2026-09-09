/** Public-safe, bounded references extracted before browser error prose is cut. */
import assert from 'node:assert/strict';

const LIMIT = 32;
const ANSI = /\x1b\][^\x07]*(?:\x07|\x1b\\)|\x1b\[[0-?]*[ -/]*[@-~]/g;
const ROOTS = /^(?:assets|tests|scripts|cloudflare)\//;
function localFile(value) {
  const clean = String(value).replace(/\\/g, '/').replace(/^\//, '').replace(/:\d+(?::\d+)?$/, '');
  if (clean.length > 220 || !ROOTS.test(clean) || !/^[a-zA-Z0-9_./-]+\.(?:js|mjs|cjs|css|html|ts|tsx|jsx)$/.test(clean)) return null;
  if (clean.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) return null;
  return clean;
}
function trimPunctuation(value) { return value.replace(/[),;\]}]+$/, ''); }

export function sanitizeBrowserFailure(value, { projectRoot = '', allowedOrigins = [] } = {}) {
  let text = String(value || '').replace(ANSI, '');
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '');
  // Handle whole URLs before scanning paths, so an external host cannot lend
  // credibility to a lookalike /assets/ path. Queries/userinfo never survive.
  text = text.replace(/(?:\b(?:https?|file):\/\/|\/\/)[^\s"'<>]+/gi, raw => {
    try {
      const token = trimPunctuation(raw);
      if (/%|(?:^|\/)\.\.(?:\/|$)/.test(token)) return '[URL]';
      const url = new URL(token);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !allowedOrigins.includes(url.origin)) return '[URL]';
      return localFile(url.pathname) || '[URL]';
    } catch { return '[URL]'; }
  });
  // Private absolute paths are removed as units; never salvage a suffix from
  // an unknown machine's path. Only this explicitly supplied checkout maps back.
  const absolute = /(^|[\s("'=,:])((?:[a-zA-Z]:[\\/]|\\\\|\/(?!(?:assets|tests|scripts|cloudflare)\/)[a-zA-Z0-9_.-]+\/)[^\r\n"'<>)]*)/gm;
  text = text.replace(absolute, (_match, prefix, raw) => {
    const token = trimPunctuation(raw.trim()).replace(/\\/g, '/');
    if (root && token.toLowerCase().startsWith(root.toLowerCase() + '/')) {
      return prefix + (localFile(token.slice(root.length + 1)) || '[local path]');
    }
    return prefix + '[local path]';
  });
  // Scrub query/fragment material from relative asset references as well.
  text = text.replace(/((?:\/?(?:assets|tests|scripts|cloudflare)\/)[^\s"'<>?#]+)[?#][^\s"'<>]*/g, '$1');
  const files = new Set();
  const pattern = /(?:^|[\s("'=,:])((?:\/?(?:assets|tests|scripts|cloudflare)\/)[a-zA-Z0-9_./-]+\.(?:mjs|cjs|js|css|html|tsx|jsx|ts)(?::\d+(?::\d+)?)?)(?=$|[\s)"',;\]}])/g;
  for (const match of text.matchAll(pattern)) {
    const file = localFile(match[1]);
    if (file) files.add(file);
  }
  return { text, files: [...files].sort() };
}

export function summarizeBrowserFailures(failures) {
  const projects = new Set(), tests = new Set(), files = new Set();
  let truncated = false;
  for (const failure of failures || []) {
    if (failure.project) projects.add(failure.project);
    if (failure.title) tests.add(failure.title);
    for (const file of failure.files || []) if (localFile(file)) files.add(file);
    truncated ||= failure.evidenceTruncated === true;
  }
  const bounded = values => [...values].sort().slice(0, LIMIT);
  return { projects: bounded(projects), tests: bounded(tests), files: bounded(files),
    truncated: truncated || [projects, tests, files].some(values => values.size > LIMIT) };
}

export function compactBrowserFailures(report, options = {}) {
  const failures = [];
  function visit(suite) {
    for (const spec of suite?.specs || []) for (const test of spec.tests || []) {
      const bad = (test.results || []).filter(result => ['failed', 'timedOut'].includes(result.status));
      if (!bad.length) continue;
      const full = bad.flatMap(result => [result.error?.message || result.status,
        ...(result.errors || []).map(error => error?.message || '')]).join('\n');
      const evidence = sanitizeBrowserFailure(full, options);
      const specEvidence = sanitizeBrowserFailure(spec.file || suite.file || '', options);
      const files = [...new Set([...evidence.files, ...specEvidence.files])].sort();
      failures.push({
        title: sanitizeBrowserFailure(spec.title || 'unnamed test', options).text.slice(0, 160),
        project: sanitizeBrowserFailure(test.projectName || 'unknown', options).text.slice(0, 40),
        message: sanitizeBrowserFailure(bad[0].error?.message || bad[0].status || 'failed', options).text.slice(0, 500),
        files: files.slice(0, LIMIT), evidenceTruncated: files.length > LIMIT,
      });
    }
    for (const child of suite?.suites || []) visit(child);
  }
  for (const suite of report?.suites || []) visit(suite);
  return failures;
}

export function runBrowserFailureEvidenceSelfTest() {
  const options = { projectRoot: 'C:/work/site', allowedOrigins: ['https://stage.example'] };
  const fixture = message => ({ suites: [{ file: 'tests/release.spec.js', specs: [{ title: 'browser contract', tests: [{ projectName: 'chromium', results: [{ status: 'failed', error: { message } }] }] }] }] });
  const files = Array.from({ length: 6 }, (_, i) => `assets/failure-${i}.js`);
  const long = compactBrowserFailures(fixture('x'.repeat(550) + '\n' + files.join('\n')), options);
  assert.equal(long[0].message.length, 500);
  for (const file of files) assert.ok(summarizeBrowserFailures(long).files.includes(file));
  const unsafe = '\x1b[31mhttps://stage.example/assets/ok.js?token=secret#private\x1b[0m\n'
    + 'https://evil.example/assets/evil.js?secret=bad\nhttps://u:password@stage.example/assets/auth.js\n'
    + 'https://stage.example/assets/%2e%2e/private.js\nhttps://[malformed/assets/bad.js\n'
    + 'C:\\Users\\Private Person\\secrets\\private.js\n/home/private/person/secrets.js\n'
    + 'C:\\work\\site\\assets\\local.js:4:2\nassets/ok.js\n../assets/traversal.js';
  const clean = sanitizeBrowserFailure(unsafe + '\n/opt/private/assets/hidden.js\n//private.example/assets/hidden.js\n\\\\server\\private\\assets\\hidden.js', options);
  assert.deepEqual(clean.files, ['assets/local.js', 'assets/ok.js']);
  assert.doesNotMatch(clean.text, /Private Person|\/home\/private|password|token=|secret=|\x1b|evil\.example|private\.example|server|\/opt\/private/);
  const many = Array.from({ length: 7 }, (_, i) => ({ ...long[0], title: `test ${i}`, files: [`assets/test-${i}.js`] }));
  assert.equal(summarizeBrowserFailures(many).files.length, 7);
  const capped = summarizeBrowserFailures([{ files: Array.from({ length: 40 }, (_, i) => `assets/${i}.js`) }]);
  assert.equal(capped.files.length, LIMIT); assert.equal(capped.truncated, true);
  return 4;
}
