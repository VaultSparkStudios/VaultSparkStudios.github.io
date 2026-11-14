#!/usr/bin/env node
/** Explicit metadata broker. Default/help is inert; no privileged credentials in CI. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REPOSITORY, sha256, requireFact as need, isHash, validatePublisherPolicy, parseBoundedJson } from './lib/isolated-staging-contract.mjs';
import { canonical, readOwned, verifyFrozenSource, githubApi, validateDeployment, validateInstallation, validateRequest,
  makeRequest, publishMetadata, findObservation, findRequest, admitRuntime, invokeProtectedObserver, observationFromProtected, invokeInstallProjection, invokeNativeInstallProjection, validateObserverDescriptor, loadRuntimeContext, loadHistoricalStageContext, makeWorkerUploadRequest, makeProductionPostflightRequest, checkProductionWorkerUpload, admitProductionPhaseRequest, invokeProductionPostflight, admitProductionPostflightObservation, makeStagingRequest, nativeObservationFromProtected, makeProductionFinalizationObservation } from './lib/isolated-staging-evidence.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);
if (!args.length || (args.length===1 && args[0]==='--help')) {
  console.log('isolated-staging-evidence: inert. Explicit --project-install / --publish-install / --request / --receive / --observe; unresolved publisher/observer refuses.');
} else {
  try {
    need(['--project-install','--publish-install','--request','--receive','--observe','--find-request','--publish-install-native','--publish-worker-upload','--check-worker-upload','--request-production-postflight','--receive-production-postflight','--observe-production-postflight','--publish-finalization'].includes(args[0]),'broker-mode');
    const flags={};
    for (const arg of args.slice(1)) {
      const match=arg.match(/^--([a-z][a-z0-9-]*)=([^\r\n]+)$/); need(match && !flags[match[1]],'broker-argument'); flags[match[1]]=match[2];
    }
    const allowed=['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id',
      'request-payload-sha256','runtime-bindings','runtime-bindings-sha256','output','workflow-run-id','workflow-run-attempt','workflow-path','native-runtime','native-runtime-sha256','channel','actor-ready','isolated-staging-context','isolated-staging-context-sha256','worker-upload-deployment-id','worker-upload-payload-sha256','phase'];
    need(Object.keys(flags).every(k=>allowed.includes(k)),'unknown-broker-argument');
    const perMode={
      '--request':['source-commit','installation-deployment-id','installation-payload-sha256',...((Object.hasOwn(flags,'worker-upload-deployment-id')||Object.hasOwn(flags,'worker-upload-payload-sha256'))?['worker-upload-deployment-id','worker-upload-payload-sha256']:[])],
      '--receive':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256','output'],
      '--observe':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256','runtime-bindings','runtime-bindings-sha256'],
      '--project-install':['source-commit','runtime-bindings','runtime-bindings-sha256','output'],
      '--publish-install':['source-commit','runtime-bindings','runtime-bindings-sha256'],
      '--publish-install-native':['source-commit','runtime-bindings','runtime-bindings-sha256','native-runtime','native-runtime-sha256','channel','actor-ready'],
      '--find-request':['source-commit','workflow-run-id','workflow-run-attempt','workflow-path','installation-deployment-id','installation-payload-sha256',...(flags.phase?['phase']:[])],
      '--publish-worker-upload':['source-commit','isolated-staging-context','isolated-staging-context-sha256'],
      '--check-worker-upload':['source-commit','installation-deployment-id','installation-payload-sha256','worker-upload-deployment-id','worker-upload-payload-sha256'],
      '--request-production-postflight':['source-commit','installation-deployment-id','installation-payload-sha256','worker-upload-deployment-id','worker-upload-payload-sha256','isolated-staging-context','isolated-staging-context-sha256'],
      '--receive-production-postflight':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256','output'],
      '--observe-production-postflight':['source-commit','installation-deployment-id','installation-payload-sha256','request-deployment-id','request-payload-sha256',...(Object.hasOwn(flags,'channel')?['channel']:[])],
      '--publish-finalization':['source-commit','isolated-staging-context','isolated-staging-context-sha256'],
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
    if(['--publish-worker-upload','--check-worker-upload','--request-production-postflight','--receive-production-postflight','--publish-finalization'].includes(args[0])) {
      need(process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_SHA===frozen.sourceCommit&&Number.isSafeInteger(Number(process.env.GITHUB_RUN_ID))&&Number(process.env.GITHUB_RUN_ID)>0&&Number.isSafeInteger(Number(process.env.GITHUB_RUN_ATTEMPT))&&Number(process.env.GITHUB_RUN_ATTEMPT)>0,'ci-execution-context');
      const{getSecret}=await import('./lib/secrets.mjs');const api=githubApi(getSecret('GITHUB_TOKEN','github.api'));
      const parent={id:Number(flags['installation-deployment-id']),sha256:flags['installation-payload-sha256']};
      const workerRef={deploymentId:Number(flags['worker-upload-deployment-id']),payloadSha256:flags['worker-upload-payload-sha256']};
      if(args[0]==='--publish-finalization'){
        const context=await loadRuntimeContext(ROOT,flags['isolated-staging-context'],flags['isolated-staging-context-sha256'],{api});
        need(context.mode==='production-postflight'&&context.transport.runId===Number(process.env.GITHUB_RUN_ID)&&context.transport.runAttempt===Number(process.env.GITHUB_RUN_ATTEMPT),'finalization-ci-run');
        console.log(JSON.stringify(await publishMetadata(api,policy,frozen,await makeProductionFinalizationObservation(ROOT,context))));
      }else if(args[0]==='--publish-worker-upload'){
        const context=await loadRuntimeContext(ROOT,flags['isolated-staging-context'],flags['isolated-staging-context-sha256'],{api});
        need(context.transport.runId===Number(process.env.GITHUB_RUN_ID)&&context.transport.runAttempt===Number(process.env.GITHUB_RUN_ATTEMPT),'worker-upload-ci-run');
        console.log(JSON.stringify(await publishMetadata(api,policy,frozen,await makeWorkerUploadRequest(ROOT,policy,frozen,context))));
      }else if(args[0]==='--check-worker-upload'){
        console.log(JSON.stringify(await checkProductionWorkerUpload(ROOT,api,policy,frozen,parent,workerRef)));
      }else if(args[0]==='--request-production-postflight'){
        const original=await loadHistoricalStageContext(ROOT,flags['isolated-staging-context'],flags['isolated-staging-context-sha256'],api,policy,frozen);
        need(original.transport.runId===Number(process.env.GITHUB_RUN_ID)&&original.transport.runAttempt===Number(process.env.GITHUB_RUN_ATTEMPT)&&original.transport.installationId===parent.id&&original.transport.installationHash===parent.sha256,'postflight-ci-run-parent');
        const value=await makeProductionPostflightRequest(ROOT,api,policy,frozen,original,workerRef),published=await publishMetadata(api,policy,frozen,value);
        console.log(JSON.stringify({requestDeploymentId:published.id,requestPayloadSha256:published.sha256}));
      }else{
        need(flags.output==='.cache/isolated-staging/production-postflight-context.json','postflight-fixed-output');
        const requestId=Number(flags['request-deployment-id']),requestHash=flags['request-payload-sha256'];
        const request=validateDeployment(await api('GET','/deployments/'+requestId),policy,'request',requestId,requestHash,frozen);
        validateRequest(request,frozen,policy,request.requestedAtEpochMs);need(request.schemaVersion===2&&request.phase==='production-postflight'&&request.workflowRunId===Number(process.env.GITHUB_RUN_ID)&&request.workflowRunAttempt===Number(process.env.GITHUB_RUN_ATTEMPT),'postflight-receive-run');
        let found;while(Date.now()<request.deadlineEpochMs){found=await findObservation(api,policy,frozen,requestId,requestHash,request);if(found)break;await new Promise(r=>setTimeout(r,5000));}need(found,'rendezvous-timeout');
        const refs={schemaVersion:2,phase:'production-postflight',sourceCommit:frozen.sourceCommit,transport:{installationId:parent.id,installationHash:parent.sha256,requestId,requestHash,observationId:found.id,observationHash:found.sha256,runId:request.workflowRunId,runAttempt:request.workflowRunAttempt}};
        await admitProductionPostflightObservation({api,policy,frozen,...refs.transport,baseHistoryText:String(readOwned(ROOT,'data/staging-deploy-history.ndjson'))});
        const target=path.join(ROOT,flags.output);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,canonical(refs)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({file:flags.output,sha256:sha256(fs.readFileSync(target))}));
      }
    } else if(args[0]==='--find-request') {
      need(policy.workflowPaths.includes(flags['workflow-path']),'request-workflow-path');
      const selector={workflowRunId:Number(flags['workflow-run-id']),workflowRunAttempt:Number(flags['workflow-run-attempt']),
        workflowPath:flags['workflow-path'],installationDeploymentId:Number(flags['installation-deployment-id']),installationPayloadSha256:flags['installation-payload-sha256'],...(flags.phase?{phase:flags.phase}:{})};
      console.log(JSON.stringify(await localGithub('isolated-staging-request-discovery',api=>findRequest(api,policy,frozen,selector))));
    } else if(['--project-install','--publish-install','--publish-install-native'].includes(args[0])) {
      need(Object.keys(flags).every(k=>['source-commit','runtime-bindings','runtime-bindings-sha256','output','native-runtime','native-runtime-sha256','channel','actor-ready'].includes(k)),'install-project-arguments');
      const bindings=parseBoundedJson(readOwned(ROOT,flags['runtime-bindings'],65536),flags['runtime-bindings-sha256']);
      const envelope=args[0]==='--publish-install-native'
        ?await invokeNativeInstallProjection(ROOT,policy,frozen,bindings,{file:flags['native-runtime'],sha256:flags['native-runtime-sha256']},flags.channel,flags['actor-ready'])
        :invokeInstallProjection(ROOT,policy,frozen,bindings);
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
    validateInstallation(installation,frozen,baseHistoryText,policy);
    if (args[0]==='--request') {
      const runId=Number(process.env.GITHUB_RUN_ID),run=await api('GET',`/actions/runs/${runId}`);
      need(run.run_attempt===Number(process.env.GITHUB_RUN_ATTEMPT) && process.env.GITHUB_SHA===frozen.sourceCommit,'ci-run-context');
      const workerRef=Object.hasOwn(flags,'worker-upload-deployment-id')?{deploymentId:Number(flags['worker-upload-deployment-id']),payloadSha256:flags['worker-upload-payload-sha256']}:null;
      const request=await makeStagingRequest(ROOT,api,frozen,policy,run,{id:installationId,sha256:installationHash},installation,workerRef,Date.now());
      const published=await publishMetadata(api,policy,frozen,request);
      console.log(JSON.stringify({requestDeploymentId:published.id,requestPayloadSha256:published.sha256}));
    } else {
      const requestId=Number(flags['request-deployment-id']),requestHash=flags['request-payload-sha256'];
      const request=validateDeployment(await api('GET',`/deployments/${requestId}`),policy,'request',requestId,requestHash,frozen);
      validateRequest(request,frozen,policy,Date.now());
      need(request.installationDeploymentId===installationId && request.installationPayloadSha256===installationHash,'request-installation');
      if (['--observe','--observe-production-postflight'].includes(args[0])) {
        if(args[0]==='--observe-production-postflight'){
          need(request.schemaVersion===2&&request.phase==='production-postflight'&&(!Object.hasOwn(flags,'channel')||['chrome','msedge','chromium'].includes(flags.channel)),'observer-fixed-production-phase');
          const context=await admitProductionPhaseRequest({api,policy,frozen,installationId,installationHash,requestId,requestHash,baseHistoryText,runId:request.workflowRunId,runAttempt:request.workflowRunAttempt});
          console.log(JSON.stringify(await publishMetadata(api,policy,frozen,await invokeProductionPostflight(ROOT,policy,context,flags.channel??null))));return;
        }
        need(request.schemaVersion===1||request.schemaVersion===2&&request.phase==='staging-preflight','observer-fixed-stage-phase');
        const run=await api('GET',`/actions/runs/${request.workflowRunId}`);
        need(run.head_sha===frozen.sourceCommit && run.id===request.workflowRunId && run.run_attempt===request.workflowRunAttempt
          && run.path===request.workflowPath && policy.workflowPaths.includes(run.path) && run.event==='workflow_dispatch','observer-workflow-run');
        const bindings=parseBoundedJson(readOwned(ROOT,flags['runtime-bindings'],65536),flags['runtime-bindings-sha256']);
        const raw=invokeProtectedObserver(ROOT,policy,frozen,request,installation,bindings);
        const observation=installation.schemaVersion===2?await nativeObservationFromProtected(ROOT,api,raw,request,requestId,requestHash,installation,policy):observationFromProtected(raw,request,requestId,requestHash,installation,policy.protectedObserver);
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
    if(['--observe','--observe-production-postflight'].includes(args[0]))await localGithub('isolated-staging-run-observation',metadataPhase);
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
