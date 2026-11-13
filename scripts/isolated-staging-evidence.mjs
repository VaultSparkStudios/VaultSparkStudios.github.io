#!/usr/bin/env node
/** Explicit metadata broker. Default/help is inert; no privileged credentials in CI. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPOSITORY, sha256, requireFact as need, isHash, validatePublisherPolicy, parseBoundedJson } from './lib/isolated-staging-contract.mjs';
import { canonical, readOwned, verifyFrozenSource, githubApi, validateDeployment, validateInstallation, validateRequest,
  makeRequest, publishMetadata, findObservation, findRequest, admitRuntime, invokeProtectedObserver, observationFromProtected, invokeInstallProjection, validateObserverDescriptor } from './lib/isolated-staging-evidence.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if (!args.length || (args.length===1 && args[0]==='--help')) {
  console.log('isolated-staging-evidence: inert. Explicit --project-install / --publish-install / --request / --receive / --observe; unresolved publisher/observer refuses.');
} else {
  try {
    need(['--project-install','--publish-install','--request','--receive','--observe','--find-request'].includes(args[0]),'broker-mode');
    const flags={};
    for (const arg of args.slice(1)) {
      const match=arg.match(/^--([a-z-]+)=([^\r\n]+)$/); need(match && !flags[match[1]],'broker-argument'); flags[match[1]]=match[2];
    }
    const allowed=['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id',
      'request-payload-sha256','runtime-bindings','runtime-bindings-sha256','output','workflow-run-id','workflow-run-attempt','workflow-path'];
    need(Object.keys(flags).every(k=>allowed.includes(k)),'unknown-broker-argument');
    const perMode={
      '--request':['source-commit','installation-deployment-id','installation-payload-sha256'],
      '--receive':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256','output'],
      '--observe':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256','runtime-bindings','runtime-bindings-sha256'],
      '--project-install':['source-commit','runtime-bindings','runtime-bindings-sha256','output'],
      '--publish-install':['source-commit','runtime-bindings','runtime-bindings-sha256'],
      '--find-request':['source-commit','workflow-run-id','workflow-run-attempt','workflow-path','installation-deployment-id','installation-payload-sha256'],
    };
    need(Object.keys(flags).sort().join('\0')===[...perMode[args[0]]].sort().join('\0'),'mode-argument-set');
    for(const [name,value] of Object.entries(flags)) {
      if(name.endsWith('-sha256'))need(isHash(value),'argument-sha256');
      if(name.endsWith('-deployment-id'))need(/^[1-9][0-9]*$/.test(value)&&Number.isSafeInteger(Number(value)),'argument-deployment-id');
      if(name==='workflow-run-id'||name==='workflow-run-attempt')need(/^[1-9][0-9]*$/.test(value)&&Number.isSafeInteger(Number(value)),'argument-run-id');
    }
    if(flags.output)need(/^\.cache\/[A-Za-z0-9_/-]+[.]json$/.test(flags.output)&&!flags.output.includes('..'),'runtime-output');
    const frozen=verifyFrozenSource(ROOT,flags['source-commit']);
    const policy=validatePublisherPolicy(JSON.parse(readOwned(ROOT,'config/isolated-staging-admission.json')));
    async function localGithub(action, callback) {
      validateObserverDescriptor(ROOT,policy.protectedObserver);
      need(policy.protectedObserver.dependencyRows.some(r=>r.file==='../vaultspark-studio-ops/scripts/lib/github-broker.mjs'),'github-broker-not-pinned');
      const {withGithubToken}=await import(pathToFileURL(path.resolve(ROOT,'../vaultspark-studio-ops/scripts/lib/github-broker.mjs')).href);
      // The API and every token use remain inside the canonical signed action closure.
      return withGithubToken(action,token=>callback(githubApi(token)),{params:{repository:REPOSITORY,sourceCommit:frozen.sourceCommit}});
    }
    if(args[0]==='--find-request') {
      need(policy.workflowPaths.includes(flags['workflow-path']),'request-workflow-path');
      const selector={workflowRunId:Number(flags['workflow-run-id']),workflowRunAttempt:Number(flags['workflow-run-attempt']),
        workflowPath:flags['workflow-path'],installationDeploymentId:Number(flags['installation-deployment-id']),installationPayloadSha256:flags['installation-payload-sha256']};
      console.log(JSON.stringify(await localGithub('isolated-staging-request-discovery',api=>findRequest(api,policy,frozen,selector))));
    } else if(['--project-install','--publish-install'].includes(args[0])) {
      need(Object.keys(flags).every(k=>['source-commit','runtime-bindings','runtime-bindings-sha256','output'].includes(k)),'install-project-arguments');
      const bindings=parseBoundedJson(readOwned(ROOT,flags['runtime-bindings'],65536),flags['runtime-bindings-sha256']);
      const envelope=invokeInstallProjection(ROOT,policy,frozen,bindings);
      if(args[0]==='--project-install') {
        need(/^\.cache\/[A-Za-z0-9_/-]+[.]json$/.test(flags.output || '') && !flags.output.includes('..'),'runtime-output');
        const target=path.join(ROOT,flags.output);fs.mkdirSync(path.dirname(target),{recursive:true});
        fs.writeFileSync(target,canonical(envelope)+'\n',{flag:'wx',mode:0o600});
        console.log(JSON.stringify({file:flags.output,sha256:sha256(fs.readFileSync(target)),published:false}));
      } else {
      console.log(JSON.stringify(await localGithub('isolated-staging-install-publish',api=>publishMetadata(api,policy,frozen,envelope))));
      }
    } else {
    const metadataPhase=async api=>{
    const installationId=Number(flags['installation-deployment-id']),installationHash=flags['installation-payload-sha256'];
    need(Number.isSafeInteger(installationId) && installationId>0 && isHash(installationHash),'installation-reference');
    const installation=validateDeployment(await api('GET',`/deployments/${installationId}`),policy,'observer',installationId,installationHash,frozen);
    const baseHistoryText=String(readOwned(ROOT,'data/staging-deploy-history.ndjson'));
    validateInstallation(installation,frozen,baseHistoryText);
    if (args[0]==='--request') {
      const runId=Number(process.env.GITHUB_RUN_ID),run=await api('GET',`/actions/runs/${runId}`);
      need(run.run_attempt===Number(process.env.GITHUB_RUN_ATTEMPT) && process.env.GITHUB_SHA===frozen.sourceCommit,'ci-run-context');
      const request=makeRequest(frozen,policy,run,{id:installationId,sha256:installationHash},Date.now());
      const published=await publishMetadata(api,policy,frozen,request);
      console.log(JSON.stringify({requestDeploymentId:published.id,requestPayloadSha256:published.sha256}));
    } else {
      const requestId=Number(flags['request-deployment-id']),requestHash=flags['request-payload-sha256'];
      const request=validateDeployment(await api('GET',`/deployments/${requestId}`),policy,'request',requestId,requestHash,frozen);
      validateRequest(request,frozen,policy,Date.now());
      need(request.installationDeploymentId===installationId && request.installationPayloadSha256===installationHash,'request-installation');
      if (args[0]==='--observe') {
        const run=await api('GET',`/actions/runs/${request.workflowRunId}`);
        need(run.head_sha===frozen.sourceCommit && run.id===request.workflowRunId && run.run_attempt===request.workflowRunAttempt
          && run.path===request.workflowPath && policy.workflowPaths.includes(run.path) && run.event==='workflow_dispatch','observer-workflow-run');
        const bindings=parseBoundedJson(readOwned(ROOT,flags['runtime-bindings'],65536),flags['runtime-bindings-sha256']);
        const raw=invokeProtectedObserver(ROOT,policy,frozen,request,installation,bindings);
        const observation=observationFromProtected(raw,request,requestId,requestHash,installation,policy.protectedObserver);
        console.log(JSON.stringify(await publishMetadata(api,policy,frozen,observation)));
      } else {
        need(request.workflowRunId===Number(process.env.GITHUB_RUN_ID) && request.workflowRunAttempt===Number(process.env.GITHUB_RUN_ATTEMPT),'receive-run-context');
        let found;
        while (Date.now()<request.deadlineEpochMs) {
          found=await findObservation(api,policy,frozen,requestId,requestHash,request); if (found) break;
          await new Promise(resolve=>setTimeout(resolve,5000));
        }
        need(found,'rendezvous-timeout');
        const refs={schemaVersion:1,sourceCommit:frozen.sourceCommit,transport:{installationId,installationHash,requestId,requestHash,
          observationId:found.id,observationHash:found.sha256,runId:request.workflowRunId,runAttempt:request.workflowRunAttempt}};
        await admitRuntime({api,policy,frozen,...refs.transport,baseHistoryText});
        need(/^\.cache\/[A-Za-z0-9_/-]+[.]json$/.test(flags.output || '') && !flags.output.includes('..'),'runtime-output');
        const target=path.join(ROOT,flags.output); fs.mkdirSync(path.dirname(target),{recursive:true});
        fs.writeFileSync(target,canonical(refs)+'\n',{flag:'wx',mode:0o600});
        console.log(JSON.stringify({file:flags.output,sha256:sha256(fs.readFileSync(target))}));
      }
    }
    };
    if(args[0]==='--observe')await localGithub('isolated-staging-run-observation',metadataPhase);
    else {
      need(process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_SHA===frozen.sourceCommit
        && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''),'ci-execution-context');
      const {getSecret}=await import('./lib/secrets.mjs');
      await metadataPhase(githubApi(getSecret('GITHUB_TOKEN','github.api')));
    }
    }
  } catch (error) {
    console.error(/^isolated-staging:[a-z0-9-]+$/.test(error.message) ? error.message : 'isolated-staging:broker-refused'); process.exitCode=1;
  }
}
