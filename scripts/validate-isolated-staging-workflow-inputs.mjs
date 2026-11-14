#!/usr/bin/env node
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {printHelpIfRequested} from './lib/cli-contract.mjs';

export function validateIsolatedStagingWorkflowInputs(input) {
  const allowed = ['event', 'confirmProduction', 'confirmContent', 'confirmHotfix', 'confirmDesk', 'installationId', 'installationHash','workerUploadId','workerUploadHash'];
  if (!input || Object.keys(input).some(key => !allowed.includes(key))) throw new Error('isolated-staging-inputs:unknown-field');
  if(['workerUploadId','workerUploadHash'].some(k=>Object.hasOwn(input,k)&&input[k]!==undefined&&typeof input[k]!=='string'))throw new Error('isolated-staging-inputs:invalid-worker-type');
  const id = input.installationId ?? '', hash = input.installationHash ?? '';
  const workerId=input.workerUploadId??'',workerHash=input.workerUploadHash??'';
  const workerPresent=workerId!==''||workerHash!=='';
  if (id === '' && hash === '') {if(workerPresent)throw new Error('isolated-staging-inputs:worker-parent-without-installation');return {configured: false};}
  if (typeof id !== 'string' || !/^[1-9]\d{0,15}$/.test(id) || !Number.isSafeInteger(Number(id))
      || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('isolated-staging-inputs:invalid-reference');
  if (input.event !== 'workflow_dispatch' || input.confirmProduction !== 'true') throw new Error('isolated-staging-inputs:confirmed-dispatch-required');
  if (['confirmContent', 'confirmHotfix', 'confirmDesk'].some(key => !['', 'false', undefined].includes(input[key]))) {
    throw new Error('isolated-staging-inputs:exclusive-full-promotion-required');
  }
  if(workerPresent&&(typeof workerId!=='string'||!(/^[1-9]\d{0,15}$/.test(workerId))||!Number.isSafeInteger(Number(workerId))
    ||typeof workerHash!=='string'||!(/^[a-f0-9]{64}$/.test(workerHash))))throw new Error('isolated-staging-inputs:invalid-worker-reference');
  return {configured: true};
}

export function isolatedStagingInputsFromEnvironment(env) {
  return {event: env.GITHUB_EVENT_NAME, confirmProduction: env.PRODUCTION_CONFIRM,
    confirmContent: env.CONFIRM_CONTENT, confirmHotfix: env.CONFIRM_HOTFIX, confirmDesk: env.CONFIRM_DESK,
    installationId: env.INSTALLATION_DEPLOYMENT_ID, installationHash: env.INSTALLATION_PAYLOAD_SHA256,
    workerUploadId:env.WORKER_UPLOAD_DEPLOYMENT_ID,workerUploadHash:env.WORKER_UPLOAD_PAYLOAD_SHA256};
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  const args = process.argv.slice(2);
  if (printHelpIfRequested(args, 'Validate paired isolated-staging deployment inputs. --emit-github-output reads explicit workflow environment; default is inert.')) {
    // Introspection performs no workflow environment reads or writes.
  } else if (!args.length) {
    console.log(JSON.stringify({mode: 'plan-only', network: false, executed: false}));
  } else {
    try {
      if (args.length !== 1 || args[0] !== '--emit-github-output') throw new Error('isolated-staging-inputs:fixed-mode-required');
      const result = validateIsolatedStagingWorkflowInputs(isolatedStagingInputsFromEnvironment(process.env));
      console.log('configured=' + result.configured);
    } catch {
      console.error('isolated-staging-inputs:refused');
      process.exitCode = 2;
    }
  }
}
