import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(run) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vs-ignis-cache-'));
 const write=(name,data)=>{const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);};
 for(const name of ['scripts/build-ignis-search-index.mjs','scripts/lib/build-cache.mjs'])write(name,fs.readFileSync(name));
 write('agents.json',JSON.stringify({projects:[{name:'Example',aiFactSheet:'https://vaultsparkstudios.com/example.ai/'}]}));
 write('example.ai/index.html','<meta name="description" content="First canonical fact"><p>Example facts</p>');
 write('data/.keep','');
 const call=(...args)=>spawnSync(process.execPath,['scripts/build-ignis-search-index.mjs',...args],{cwd:root,encoding:'utf8',windowsHide:true});
 const ok=(...args)=>{const result=call(...args);assert.equal(result.status,0,result.stdout+result.stderr);return result;};
 try{run({root,write,call,ok,output:()=>JSON.parse(fs.readFileSync(path.join(root,'data/ignis-search-index.json'),'utf8'))});}
 finally{fs.rmSync(root,{recursive:true,force:true});}
}

test('warm corpus cache cannot bypass --check, conceal output tampering or miss deleted output',()=>fixture(({root,write,call,ok})=>{
 ok();assert.match(ok().stdout,/SKIP/);
 write('data/ignis-search-index.json','{"documents":[]}');
 const bad=call('--check');assert.equal(bad.status,1);assert.match(bad.stderr,/stale/);
 assert.doesNotMatch(ok().stdout,/SKIP/);ok('--check');
 fs.unlinkSync(path.join(root,'data/ignis-search-index.json'));
 assert.doesNotMatch(ok().stdout,/SKIP/);assert.ok(fs.existsSync(path.join(root,'data/ignis-search-index.json')));
}));

test('canonical public pages are searchable prose rather than executable or hidden markup',()=>fixture(({write,ok,output})=>{
 for(const page of ['trust','beta','agents','devlog','studio','press','dispatch']) {
  write(page+'/index.html',`<html><head><style>invisible_style_sentinel{color:red}</style><script>private_script_sentinel()</script><meta name="description" content="Read ${page} guidance"></head><body><main><h1>${page}</h1><p>Visible public guidance for ${page}.</p><template>hidden_template_sentinel</template></main></body></html>`);
 }
 ok();
 for(const page of ['trust','beta','agents','devlog','studio','press','dispatch']) {
  const doc=output().documents.find(row=>row.url===`/${page}/`);
  assert.ok(doc,`missing canonical ${page}`);
  assert.equal(doc.summary,`Read ${page} guidance`);
  assert.match(doc.body,/Visible public guidance/);
  assert.doesNotMatch(doc.body,/invisible_style_sentinel|private_script_sentinel|hidden_template_sentinel/);
 }
}));

test('registry, dynamic canonical facts, every static page and builder logic invalidate cached corpus',()=>fixture(({write,ok,output})=>{
 ok();
 write('example.ai/index.html','<meta name="description" content="Changed canonical fact"><p>New facts</p>');
 assert.doesNotMatch(ok().stdout,/SKIP/);assert.ok(output().documents.some(row=>row.summary==='Changed canonical fact'));
 write('synthetic-intelligence/index.html','<meta name="description" content="Synthetic intelligence changed">');
 assert.doesNotMatch(ok().stdout,/SKIP/);assert.ok(output().documents.some(row=>row.url==='/synthetic-intelligence/'));
 write('agents.json',JSON.stringify({projects:[{name:'Second',aiFactSheet:'https://vaultsparkstudios.com/second.ai/'}]}));
 write('second.ai/index.html','<meta name="description" content="Second fact">');
 assert.doesNotMatch(ok().stdout,/SKIP/);assert.ok(output().documents.some(row=>row.title==='Second — canonical fact sheet'));
 write('scripts/build-ignis-search-index.mjs',fs.readFileSync('scripts/build-ignis-search-index.mjs','utf8')+'\n// Fixture builder change\n');
 assert.doesNotMatch(ok().stdout,/SKIP/);
 ok('--force');assert.match(ok().stdout,/SKIP/);
}));
