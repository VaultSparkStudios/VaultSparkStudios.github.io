import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';

const root = path.resolve(import.meta.dirname, '..');
const scripts = ['sync-staging-headers', 'provision-vault-test-accounts', 'purge-promoted-urls',
  'provision-tt-storage', 'provision-worker-staging-origin', 'apply-supabase-migration'];

test('operational CLI admission exits before credentials, reads, network, writes or children', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vss-operational-admission-'));
  const preload = path.join(dir, 'tripwire.mjs');
  fs.writeFileSync(preload, `import {registerHooks, syncBuiltinESMExports} from 'node:module';
import fs from 'node:fs'; import fsp from 'node:fs/promises'; import cp from 'node:child_process'; import http from 'node:http'; import https from 'node:https';
const trap=()=>{throw Error('OPERATIONAL_IO_TRIPWIRE');};
// Node's ESM loader may use public fs.readFileSync. Preserve that capability
// exclusively inside the module-source load hook; runtime reads stay trapped.
const readModuleSource=fs.readFileSync.bind(fs);
registerHooks({
resolve(spec,context,next){if(/(?:secrets|model-router|csp-policy|static-csp)[.]mjs$/.test(spec))trap(); return next(spec,context);},
load(url,context,next){
  const sourceUrl=new URL(url);
  if(sourceUrl.protocol==='file:' && sourceUrl.pathname.endsWith('.mjs'))return {format:'module',source:readModuleSource(sourceUrl,'utf8'),shortCircuit:true};
  return next(url,context);
}});
for(const key of ['readFileSync','readdirSync','writeFileSync','appendFileSync','mkdirSync','rmSync','unlinkSync','renameSync','mkdtempSync'])fs[key]=trap;
for(const key of ['readFile','readdir','writeFile','appendFile','mkdir','rm','unlink','rename','mkdtemp'])fsp[key]=trap;
for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])cp[key]=trap;
http.request=trap; http.get=trap; https.request=trap; https.get=trap; globalThis.fetch=trap; syncBuiltinESMExports();`);
  try {
    const runtimeRead = path.join(dir, 'runtime-read.mjs');
    fs.writeFileSync(runtimeRead, `import {readFileSync} from 'node:fs';
console.log('RUNTIME_READ_REACHED');
readFileSync(new URL(import.meta.url), 'utf8');`);
    const control = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, runtimeRead], {
      cwd: root, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(control.status, 1, `runtime read control: ${control.stderr}`);
    assert.match(control.stdout, /RUNTIME_READ_REACHED/);
    assert.match(control.stderr, /OPERATIONAL_IO_TRIPWIRE/);
    for (const script of scripts) {
      const provisioning = script.startsWith('provision-') && script !== 'provision-vault-test-accounts';
      const migration = script === 'apply-supabase-migration';
      const operationalModes = provisioning || migration;
      const safe = [['--help'], ['-h'], ['-?'], ['/?'], ['--dry'], ['-n']];
      if (!provisioning) safe.push(['--check']);
      if (!migration) safe.push(['--dry-run']);
      if (operationalModes) safe.push(['--apply', '--dry-run'], ['--apply', '--dry'], ['--apply', '-n']);
      if (provisioning) safe.push(['--check', '--dry']);
      if (migration) safe.push(['--migration', 'not-read.sql', '--apply', '--dry-run']);
      const invalid = [['--typo'], ['oops'], ['--help=false'], ['--dry-run=false'], ['--dryrun'], ['--help', '--typo'], ['--dry', 'oops'], ['--dry', '--dry'], ['--help', '--help']];
      if (operationalModes) invalid.push(['--apply', '--apply'], ['--apply', '--self-test']);
      else invalid.push(['--apply']);
      if (provisioning) invalid.push(['--apply', '--check'], ['--check', '--check']);
      if (migration) invalid.push(['--migration'], ['--migration', '--apply'], ['--migration=a', '--migration=b'], ['--probe'], ['--probe', 'x', '--probe', 'y'], ['--probe', 'unknown'], ['--migration', 'not-read.sql', '--apply', '--probe', 'unknown']);
      if (script === 'sync-staging-headers' || script === 'provision-vault-test-accounts') invalid.push(['--self-test']);
      for (const [cases, status] of [[safe, 0], [invalid, 2]]) {
        for (const argv of cases) {
          const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, `scripts/${script}.mjs`, ...argv], {
            cwd: root, encoding: 'utf8', timeout: 15000,
          });
          assert.equal(result.status, status, `${script} ${argv.join(' ')}: ${result.stderr}`);
          assert.doesNotMatch(result.stderr || '', /OPERATIONAL_IO_TRIPWIRE/);
          if (status === 0) assert.match(result.stdout, /Usage:|preview only/);
        }
      }
    }
    const id = '1e2d3c4b-5a69-4788-99aa-bbccddeeff00';
    const cases = {
      'moderate-desk-comments': {
        safe: [['--help'], ['-h'], ['list', '--help']],
        invalid: [[], ['--typo'], ['list', '--status'], ['list', '--status', '--json'],
          ['list', '--limit', 'NaN'], ['list', '--limit', '0'], ['list', '--limit', '1.5'], ['list', '--limit', '501'],
          ['list', '--limit', '4', '--limit', '5'], ['list', id], ['list', '--status', 'bogus'],
          ['list', '--slug', 'bad'], ['approve', id, '--status', 'held'], ['reject', id, '--json'],
          ['remove', id, '--limit', '3'], ['feature', id, '--slug', '2026-09-14/a-story'],
          ['approve', id, '--dry-run'], ['--self-test', '--json'], ['--help', '--typo'], ['toString', id]],
      },
      'check-public-rest-contract': {
        safe: [['--help'], ['-h'], ['-?'], ['/?'], ['--dry'], ['-n'], ['--check'], ['--live', '--dry-run']],
        invalid: [['--typo'], ['oops'], ['--live=false'], ['--write'], ['--write', '--dry-run'], ['--write', '--help'], ['--live', '--live'],
          ['--self-test', '--live'], ['--self-test', '--write'], ['--help', '--typo'], ['--help=false']],
      },
    };
    for (const [script, modes] of Object.entries(cases)) {
      for (const [kind, argvList] of Object.entries(modes)) for (const argv of argvList) {
        const result = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, `scripts/${script}.mjs`, ...argv], {
          cwd: root, encoding: 'utf8', timeout: 15000,
        });
        assert.equal(result.status, kind === 'safe' ? 0 : 2, `${script} ${argv.join(' ')}: ${result.stderr}`);
        assert.doesNotMatch(result.stderr || '', /OPERATIONAL_IO_TRIPWIRE/);
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
