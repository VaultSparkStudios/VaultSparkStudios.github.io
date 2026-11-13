#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from './lib/safe-spawn.mjs';
import {printHelpIfRequested} from './lib/cli-contract.mjs';
import {validateIsolatedStagingWorkflowInputs, isolatedStagingInputsFromEnvironment} from './validate-isolated-staging-workflow-inputs.mjs';

export const CONTEXT_FILE = '.cache/isolated-staging/context.json';
const need = (value, code) => {if (!value) throw new Error('isolated-rendezvous:' + code);};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const validHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validId = value => Number.isSafeInteger(value) && value > 0;

export async function runWorkflowRendezvous(env, {invoke, readContext, log = () => {}}) {
  const input = isolatedStagingInputsFromEnvironment(env);
  if (!validateIsolatedStagingWorkflowInputs(input).configured) return {configured: false};
  need(typeof env.GITHUB_SHA === 'string' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA), 'source');
  const common = ['--source-commit=' + env.GITHUB_SHA, '--installation-deployment-id=' + input.installationId,
    '--installation-payload-sha256=' + input.installationHash];
  const parse = value => {need(typeof value === 'string' && Buffer.byteLength(value) <= 8192, 'response-size'); return JSON.parse(value);};
  const request = parse(await invoke(['--request', ...common]));
  need(validId(request.requestDeploymentId) && validHash(request.requestPayloadSha256), 'request-reference');
  log({requestDeploymentId: request.requestDeploymentId, requestPayloadSha256: request.requestPayloadSha256});
  const result = parse(await invoke(['--receive', ...common, '--request-deployment-id=' + request.requestDeploymentId,
    '--request-payload-sha256=' + request.requestPayloadSha256, '--output=' + CONTEXT_FILE]));
  need(result.file === CONTEXT_FILE && validHash(result.sha256), 'context-reference');
  const bytes = await readContext(CONTEXT_FILE);
  need(bytes instanceof Uint8Array && bytes.length > 0 && bytes.length <= 65536 && hash(bytes) === result.sha256, 'context-readback');
  need(JSON.parse(Buffer.from(bytes).toString('utf8')).sourceCommit === env.GITHUB_SHA, 'context-source');
  return {configured: true, contextFile: CONTEXT_FILE, contextSha256: result.sha256};
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const args = process.argv.slice(2);
  if (printHelpIfRequested(args, 'Run the paired isolated staging request/receive protocol in the confirmed release workflow. Default is inert; --emit-github-output performs the bounded rendezvous.')) {
    // No environment read or process launch on introspection.
  } else if (!args.length) console.log(JSON.stringify({mode: 'plan-only', network: false, executed: false}));
  else {
    try {
      need(args.length === 1 && args[0] === '--emit-github-output', 'fixed-mode');
      const root = path.resolve(import.meta.dirname, '..');
      const result = await runWorkflowRendezvous(process.env, {
        invoke: values => execFileSync(process.execPath, [path.join(root, 'scripts/isolated-staging-evidence.mjs'), ...values],
          {cwd: root, env: process.env, encoding: 'utf8', timeout: 960000, maxBuffer: 131072}),
        readContext: file => {const target = path.join(root, file), stat = fs.lstatSync(target);
          need(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'context-kind'); return fs.readFileSync(target);},
        log: value => console.error('[isolated-staging-request] ' + JSON.stringify(value)),
      });
      console.log('configured=' + result.configured);
      if (result.configured) {
        console.log('context_file=' + result.contextFile);
        console.log('context_sha256=' + result.contextSha256);
      }
    } catch {
      console.error('isolated-rendezvous:refused');
      process.exitCode = 1;
    }
  }
}
