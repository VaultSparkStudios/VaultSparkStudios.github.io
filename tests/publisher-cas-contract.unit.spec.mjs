import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';
import { checkWorkflow } from '../scripts/check-publisher-resync.mjs';
import { verifyImmutableDeskPublication, immutableDeskPublicationRunBody } from '../scripts/lib/immutable-desk-publication.mjs';
const source=fs.readFileSync(new URL('../.github/workflows/news-publish.yml',import.meta.url),'utf8').replaceAll('\r\n','\n');
const graph=JSON.parse(fs.readFileSync(new URL('../config/evidence-graph.json',import.meta.url),'utf8'));
function mutate(from,to){assert.ok(source.includes(from),from);return source.replace(from,to);}
test('actual immutable publisher validates its executable protocol independently of workflow filename',()=>{
 const a=checkWorkflow('news-publish.yml',source,graph),b=checkWorkflow('another-reviewed-publisher.yml',source,graph);
 assert.equal(a.ok,true);assert.equal(a.mode,'immutable-artifact-cas');assert.ok(a.staged.length>0);assert.equal(a.resync,false);assert.equal(b.ok,true);assert.equal(verifyImmutableDeskPublication(source).ok,true);assert.match(immutableDeskPublicationRunBody(source),/^if ! git push origin HEAD:main; then$/m);
});
test('missing/weakened hash binding, download identity, apply/base source and critical gates fail closed',()=>{
 for(const [from,to]of [
  ['EXPECTED_MANIFEST_SHA256: ${{ needs.author.outputs.manifest_sha256 }}','EXPECTED_MANIFEST_SHA256: '+ 'a'.repeat(64)],
  [' --expected-manifest-sha256 "$EXPECTED_MANIFEST_SHA256"',''],
  [' --apply --input "$RUNNER_TEMP/desk-publication"',' --capture --input "$RUNNER_TEMP/desk-publication"'],
  ['ARTIFACT_NAME: desk-publication-${{ github.run_id }}-${{ github.run_attempt }}','ARTIFACT_NAME: latest-unrelated'],
  ['RUN_ID: ${{ github.run_id }}','RUN_ID: 123'],
  ['ref: ${{ github.sha }}','ref: main'],
  ['persist-credentials: false','persist-credentials: true'],
  ['node scripts/check-news-ai-disclosure.mjs','echo node scripts/check-news-ai-disclosure.mjs'],
  ['node scripts/build-news-desk.mjs --check','node scripts/build-news-desk.mjs --check || true'],
  ['      - name: Verify and stage the exact validated candidate','      - name: Verify and stage the exact validated candidate\n        continue-on-error: true'],
 ]){const verdict=checkWorkflow('news-publish.yml',mutate(from,to),graph);assert.equal(verdict.ok,false,from);assert.ok(verdict.immutable.errors.length,from);}
});
test('rebase, force, wrong CAS target, weak race handling and missing containment are rejected even with --resync present',()=>{
 for(const [from,to]of [
  ['if ! git push origin HEAD:main; then','if ! git push --force origin HEAD:main; then'],
  ['if ! git push origin HEAD:main; then','if ! git push --force-with-lease origin HEAD:main; then'],
  ['if ! git push origin HEAD:main; then','if ! git push origin HEAD:other; then'],
  ['if ! git push origin HEAD:main; then','git rebase origin/main\n          if ! git push origin HEAD:main; then'],
  ['if ! git push origin HEAD:main; then','bash scripts/ci/publish-push.sh "unsafe mutation" --resync\n          if ! git push origin HEAD:main; then'],
  ['if git merge-base --is-ancestor "$candidate_sha" "$remote_sha"; then','if true; then'],
  ['            exit 1\n          fi\n          echo "Published','            exit 0\n          fi\n          echo "Published'],
  ['retry_attempt != \'2\'','retry_attempt != \'200\''],
 ])assert.equal(checkWorkflow('news-publish.yml',mutate(from,to),graph).ok,false,from);
});
test('comments cannot satisfy missing executable protocol and unrelated extra jobs/indirection refuse',()=>{
 const commented=source.split('\n').map(l=>'# '+l).join('\n');assert.equal(verifyImmutableDeskPublication(commented).applicable,false);
 const bad=mutate(' --expected-manifest-sha256 "$EXPECTED_MANIFEST_SHA256"','')+'\n'+commented;assert.equal(checkWorkflow('news-publish.yml',bad,graph).ok,false);
 assert.equal(checkWorkflow('news-publish.yml',source+'\n  other:\n    runs-on: ubuntu-latest\n    steps: []\n',graph).ok,false);
 assert.equal(checkWorkflow('news-publish.yml',mutate('  publish:\n','  publish: *copied\n'),graph).ok,false);
});
test('ordinary rebasing publishers retain --resync enforcement and comment-only flags never pass',()=>{
 for(const name of ['leaderboard-api.yml','refresh-live-data.yml','weekly-maintenance.yml']){
  const current=fs.readFileSync(new URL('../.github/workflows/'+name,import.meta.url),'utf8');assert.equal(checkWorkflow(name,current,graph).ok,true);assert.equal(checkWorkflow(name,current.replaceAll(' --resync',''),graph).ok,false);
 }
 const actual='run: |\n  git add api/public-intelligence.json\n  git commit -m "generated [skip ci]"\n  bash scripts/ci/publish-push.sh "publisher" # --resync';assert.equal(checkWorkflow('ordinary.yml',actual,graph).ok,false);
});
test('importing the validator with self-test argv cannot execute either checker CLI or exit the caller',()=>{
 const helper=new URL('../scripts/lib/immutable-desk-publication.mjs',import.meta.url).href;
 const code=`process.argv.push('--self-test');await import(${JSON.stringify(helper)});console.log('IMPORT_SAFE_SENTINEL');`;
 const r=spawnSync(process.execPath,['--input-type=module','-e',code],{encoding:'utf8',timeout:10000});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'IMPORT_SAFE_SENTINEL');
});
test('no ungated author byte mutation may occur after gates, before capture/upload, or after upload/summary',()=>{
 const injected='      - name: Unreviewed byte mutation\n        run: echo changed >> index.html\n\n';
 for(const anchor of ['      - name: Cascade the derived public feeds','      - name: Capture the exact gated publication artifact','      - name: Upload the validated candidate','      - name: Slot summary']){
  const changed=mutate(anchor,injected+anchor),r=verifyImmutableDeskPublication(changed);assert.equal(r.ok,false,anchor);assert.ok(r.errors.some(e=>e.includes('post-gate')),anchor);assert.equal(checkWorkflow('news-publish.yml',changed,graph).ok,false);
 }
 const changed=mutate('\n  publish:\n','\n'+injected+'  publish:\n');assert.equal(verifyImmutableDeskPublication(changed).ok,false);assert.equal(checkWorkflow('news-publish.yml',changed,graph).ok,false);
 for(const [from,to]of [['node scripts/build-studio-timeline.mjs --check','node scripts/build-studio-timeline.mjs --check\n          echo changed >> index.html'],['echo "A non-zero status is a dropped slot, not an incident — the next scheduled edition retries."','echo changed >> index.html\n          echo "A non-zero status is a dropped slot, not an incident — the next scheduled edition retries."']])assert.equal(verifyImmutableDeskPublication(mutate(from,to)).ok,false,from);
});
