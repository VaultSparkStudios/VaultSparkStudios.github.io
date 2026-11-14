#!/usr/bin/env node
/** Fixed run-bound production metadata operations; default is inert. */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runtimeContextArgs,loadRuntimeContext,loadProductionPostflightContext} from './lib/isolated-staging-evidence.mjs';
import {captureProductionWorkerUpload,applyProductionMetadata,finalizeProductionMetadata} from './lib/production-postflight.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
 const args=process.argv.slice(2);
 if(!args.length||args[0]==='--help')console.log('production-postflight: --capture-deployment with exact admitted isolated context; read-only provider observation, no deploy');
 else{
  if(!['--capture-deployment','--apply-metadata-overlay','--verify-metadata-finalization'].includes(args[0])||args.length!==3||!args.slice(1).every(a=>a.startsWith('--isolated-staging-context')))throw Error('fixed production postflight operation required');
  const refs=runtimeContextArgs(args);if(!refs)throw Error('admitted runtime required');
  try{const loader=args[0]==='--capture-deployment'?loadRuntimeContext:loadProductionPostflightContext,context=await loader(ROOT,refs.file,refs.hash);const operation=args[0]==='--capture-deployment'?captureProductionWorkerUpload:args[0]==='--apply-metadata-overlay'?applyProductionMetadata:finalizeProductionMetadata;console.log(JSON.stringify(await operation(ROOT,context)));}
  catch{console.error('production Worker readback incomplete; no completion or deployment authorized');process.exitCode=1;}
 }
}
