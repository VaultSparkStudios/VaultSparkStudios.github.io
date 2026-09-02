#!/usr/bin/env node
/**
 * S339 (D-S339.2) — every origin a workflow VERIFIES AGAINST must have a publisher.
 *
 * THE DEFECT THIS CLOSES, measured live in S339.
 * `website.staging.vaultsparkstudios.com` is named 14 times across the workflows.
 * Every one of those references READS it: `run-release-ceremony --url=<staging>`,
 * the Lighthouse targets, the uptime probe. Not one of them WRITES it. The only
 * publisher in the repo, `scripts/deploy-staging-content.mjs`, was invoked by zero
 * workflows and reachable only through an npm alias nothing called — so staging
 * had drifted five days and 23 advertised routes behind production, and CANON-007
 * was running backwards: the release ceremony was clearing a tree five days newer
 * than the one it measured. S338 measured the drift correctly but recorded the
 * cause as "find what deploys staging and why it stopped". Nothing ever did.
 * There was no publisher to stop.
 *
 * THE RULE, which names no origin and no script:
 *   an origin a release workflow verifies against is a surface we are responsible
 *   for keeping current, so it must have a declared publisher, that publisher must
 *   exist, must actually reference the origin, and must be reachable by the exact
 *   route it claims — an `automated` claim needs a workflow that really invokes it,
 *   an `operator` claim needs an npm script that really exists.
 *
 * Declaration: config/verification-origins.json.
 *
 * Usage:
 *   node scripts/check-verification-origin-publisher.mjs            # check
 *   node scripts/check-verification-origin-publisher.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONFIG_REL = 'config/verification-origins.json';
const WORKFLOW_DIR = '.github/workflows';
const ORIGIN_RE = /https:\/\/[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.(?:com|dev|net|io|org)/g;

/** Origins literally named by any workflow. This is the demand side. */
export function originsNamedByWorkflows(workflows) {
  const found = new Map();
  for (const [name, body] of Object.entries(workflows)) {
    for (const origin of String(body).match(ORIGIN_RE) || []) {
      if (!found.has(origin)) found.set(origin, new Set());
      found.get(origin).add(name);
    }
  }
  return found;
}

/**
 * The whole check, as a pure function over a filesystem snapshot, so the
 * self-test exercises the SAME code the live run does rather than a paraphrase
 * of it. `files` maps repo-relative path to contents; `npmScripts` is
 * package.json's scripts block.
 */
export function evaluate({ config, workflows, files, npmScripts }) {
  const findings = [];
  const declared = new Map();
  const external = new Set(config?.external || []);

  for (const entry of config?.origins || []) {
    if (declared.has(entry.origin)) findings.push(`duplicate declaration for ${entry.origin}`);
    declared.set(entry.origin, entry);
  }

  // R1 — demand side: nothing a workflow names may be undeclared.
  for (const [origin, usedBy] of originsNamedByWorkflows(workflows)) {
    if (declared.has(origin) || external.has(origin)) continue;
    findings.push(`${origin} is verified by ${[...usedBy].sort().join(', ')} but is declared in neither origins nor external of ${CONFIG_REL}`);
  }

  // An exemption may not be claimed for something we actually publish.
  for (const origin of external) {
    if (declared.has(origin)) findings.push(`${origin} is declared both as a published origin and as external`);
  }

  for (const entry of declared.values()) {
    const { origin, publisher, invocation, invokedBy } = entry;

    // R2 — the publisher must exist.
    if (!publisher || !(publisher in files)) {
      findings.push(`${origin} declares publisher ${publisher || '(none)'}, which does not exist`);
      continue;
    }

    // R3 — and must actually concern this origin. A publisher that never names
    // the origin it claims to publish is a paper declaration.
    // A publisher usually names its origin outright. A deploy lane sometimes
    // cannot: `wrangler pages deploy --project-name <project>` publishes to a
    // hostname bound at the provider, which never appears in the workflow. That
    // case declares `binding` — the exact text in the publisher that ties it to
    // this origin — so the link is still checked against the file rather than
    // taken on trust, and the escape hatch cannot be used to wave anything
    // through: an absent or non-matching binding is a finding.
    const publisherBody = files[publisher];
    const invokedByBody = invokedBy && invokedBy in files ? files[invokedBy] : '';
    const namesOrigin = publisherBody.includes(origin) || invokedByBody.includes(origin);
    const binding = String(entry.binding || '').trim();
    if (!namesOrigin) {
      if (!binding) findings.push(`${origin} declares publisher ${publisher}, which never references it and declares no binding`);
      else if (!publisherBody.includes(binding)) findings.push(`${origin} declares binding "${binding}", which does not appear in ${publisher}`);
    }

    const base = path.posix.basename(publisher);
    if (invocation === 'automated') {
      // R4a — an automated claim is the strong one: a real workflow must invoke it.
      if (!invokedBy || !invokedBy.startsWith(`${WORKFLOW_DIR}/`) || !(invokedBy in files)) {
        findings.push(`${origin} claims automated publication but invokedBy ${invokedBy || '(none)'} is not an existing workflow`);
      } else if (invokedBy !== publisher && !files[invokedBy].includes(base)) {
        findings.push(`${origin} claims ${invokedBy} invokes ${base}, but that workflow never mentions it`);
      }
    } else if (invocation === 'operator') {
      // R4b — an operator claim is weaker but must still be REAL: the npm script
      // it names must exist and must actually run the publisher. This is the half
      // that catches "reachable only through an alias nothing calls" being dressed
      // up as a publication path.
      const scriptName = String(invokedBy || '').replace(/^npm run\s+/, '').trim();
      const command = npmScripts?.[scriptName];
      if (!command) findings.push(`${origin} claims operator publication via "${invokedBy}", but no such npm script exists`);
      else if (!command.includes(base)) findings.push(`${origin} claims npm script "${scriptName}" publishes it, but that script does not run ${base}`);
      if (!entry.note) findings.push(`${origin} is operator-published and must carry a note saying why it is not automated`);
    } else {
      findings.push(`${origin} declares unknown invocation "${invocation}" (expected automated or operator)`);
    }
  }

  return { ok: findings.length === 0, findings, declaredCount: declared.size, externalCount: external.size };
}

function loadLive() {
  const files = {};
  const workflows = {};
  const dir = path.join(ROOT, WORKFLOW_DIR);
  for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    if (!/\.ya?ml$/.test(name)) continue;
    const rel = `${WORKFLOW_DIR}/${name}`;
    const body = fs.readFileSync(path.join(dir, name), 'utf8');
    workflows[rel] = body;
    files[rel] = body;
  }
  for (const name of fs.readdirSync(path.join(ROOT, 'scripts'))) {
    if (!name.endsWith('.mjs')) continue;
    files[`scripts/${name}`] = fs.readFileSync(path.join(ROOT, 'scripts', name), 'utf8');
  }
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG_REL), 'utf8'));
  const npmScripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts || {};
  return { config, workflows, files, npmScripts };
}

function selfTest() {
  const base = () => ({
    config: {
      origins: [{ origin: 'https://s.example.com', role: 'staging', publisher: 'scripts/pub.mjs', invocation: 'operator', invokedBy: 'npm run deploy:s', note: 'why' }],
      external: [],
    },
    workflows: { '.github/workflows/rel.yml': 'run-release-ceremony --url=https://s.example.com' },
    files: { '.github/workflows/rel.yml': 'run-release-ceremony --url=https://s.example.com', 'scripts/pub.mjs': 'const S = "https://s.example.com";' },
    npmScripts: { 'deploy:s': 'node scripts/pub.mjs' },
  });
  const drop = (o, mutate) => { mutate(o); return o; };
  const cases = [
    ['a declared, existing, reachable operator publisher passes', evaluate(base()).ok],

    // THE LIVE S339 SHAPE: an origin every release workflow verifies against,
    // with no publisher declared anywhere.
    ['an origin a workflow verifies against with no declaration at all fails',
      !evaluate(drop(base(), (o) => { o.config.origins = []; })).ok],

    ['the finding names the origin and the workflow that verifies it',
      evaluate(drop(base(), (o) => { o.config.origins = []; })).findings.join(' ').includes('https://s.example.com')
      && evaluate(drop(base(), (o) => { o.config.origins = []; })).findings.join(' ').includes('rel.yml')],

    ['a publisher that does not exist fails',
      !evaluate(drop(base(), (o) => { delete o.files['scripts/pub.mjs']; })).ok],

    ['a publisher that never references the origin fails',
      !evaluate(drop(base(), (o) => { o.files['scripts/pub.mjs'] = 'const S = "https://other.example.com";'; })).ok],

    // The half that catches an alias nothing calls being dressed up as a path.
    ['an operator claim naming an npm script that does not exist fails',
      !evaluate(drop(base(), (o) => { o.npmScripts = {}; })).ok],
    ['an operator claim whose npm script does not run the publisher fails',
      !evaluate(drop(base(), (o) => { o.npmScripts = { 'deploy:s': 'node scripts/something-else.mjs' }; })).ok],
    ['an operator claim with no reason recorded fails',
      !evaluate(drop(base(), (o) => { delete o.config.origins[0].note; })).ok],

    ['an automated claim needs a workflow that really invokes the publisher',
      !evaluate(drop(base(), (o) => { o.config.origins[0].invocation = 'automated'; o.config.origins[0].invokedBy = '.github/workflows/rel.yml'; })).ok],
    ['an automated claim passes when the workflow really does invoke it',
      evaluate(drop(base(), (o) => {
        o.config.origins[0].invocation = 'automated';
        o.config.origins[0].invokedBy = '.github/workflows/rel.yml';
        o.files['.github/workflows/rel.yml'] += '\n  run: node scripts/pub.mjs';
      })).ok],
    ['an automated claim pointing at a non-workflow fails',
      !evaluate(drop(base(), (o) => { o.config.origins[0].invocation = 'automated'; o.config.origins[0].invokedBy = 'npm run deploy:s'; })).ok],

    ['an unknown invocation mode fails rather than passing by omission',
      !evaluate(drop(base(), (o) => { o.config.origins[0].invocation = 'someday'; })).ok],
    ['a duplicate declaration fails',
      !evaluate(drop(base(), (o) => { o.config.origins.push({ ...o.config.origins[0] }); })).ok],

    ['a third-party API host may be exempted explicitly',
      evaluate(drop(base(), (o) => {
        o.workflows['.github/workflows/rel.yml'] += ' https://api.vendor.example.com';
        o.config.external = ['https://api.vendor.example.com'];
      })).ok],
    ['but an exemption cannot be claimed for something we also publish',
      !evaluate(drop(base(), (o) => { o.config.external = ['https://s.example.com']; })).ok],

    // A deploy lane binds its origin at the provider, so `binding` names the exact
    // text in the publisher that ties the two together. It is checked, not trusted.
    ['a publisher bound by declared text that really appears in it passes',
      evaluate(drop(base(), (o) => {
        o.files['scripts/pub.mjs'] = 'wrangler pages deploy --project-name my-site';
        o.config.origins[0].binding = '--project-name my-site';
      })).ok],
    ['a binding that does not appear in the publisher fails',
      !evaluate(drop(base(), (o) => {
        o.files['scripts/pub.mjs'] = 'wrangler pages deploy --project-name my-site';
        o.config.origins[0].binding = '--project-name some-other-site';
      })).ok],
    ['an empty binding cannot substitute for referencing the origin',
      !evaluate(drop(base(), (o) => {
        o.files['scripts/pub.mjs'] = 'nothing relevant here';
        o.config.origins[0].binding = '   ';
      })).ok],

    ['origin extraction attributes each origin to every workflow that names it',
      (() => {
        const found = originsNamedByWorkflows({ a: 'https://x.example.com', b: 'https://x.example.com and https://y.example.com' });
        return found.get('https://x.example.com').size === 2 && found.get('https://y.example.com').size === 1;
      })()],
  ];
  const failed = cases.filter(([, ok]) => !ok);
  for (const [name, ok] of cases) console.log(`  ${ok ? 'ok' : 'FAIL'} ${name}`);
  console.log(`check-verification-origin-publisher --self-test: ${cases.length - failed.length}/${cases.length}`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv.includes('--self-test')) selfTest();

const result = evaluate(loadLive());
if (!result.ok) {
  console.error('check-verification-origin-publisher: FAILED');
  for (const finding of result.findings) console.error(`  x ${finding}`);
  console.error(`\n  Every origin a release workflow verifies against must have a publisher declared in ${CONFIG_REL}.`);
  console.error('  An origin we verify but never publish drifts silently, and the ceremony then clears a tree it did not measure.');
  process.exit(1);
}
console.log(`check-verification-origin-publisher: ${result.declaredCount} published origin(s), ${result.externalCount} external — every verification target has a publisher`);
