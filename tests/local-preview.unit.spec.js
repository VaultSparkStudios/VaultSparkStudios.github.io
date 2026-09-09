import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { spawn } from '../scripts/lib/safe-spawn.mjs';

const script=fileURLToPath(new URL('../scripts/local-preview-server.mjs',import.meta.url));
test('local preview serves indented preload headers with duplicate values and path scoping', async t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'vs-preview-headers-'));
  fs.mkdirSync(path.join(root,'sub'));
  fs.mkdirSync(path.join(root,'assets'));
  fs.writeFileSync(path.join(root,'index.html'),'<h1>Home</h1>');
  fs.writeFileSync(path.join(root,'sub','index.html'),'<h1>Sub</h1>');
  fs.writeFileSync(path.join(root,'assets','main.shell-0123456789.css'),'body{}');
  fs.writeFileSync(path.join(root,'_headers'), '# comment\r\n/*\r\n  Link: </assets/main.css>; rel=preload; as=style\r\n\tLink: <https://example.invalid/a:b>; rel=preconnect\r\n  # indented comment\r\n\r\n/sub/\r\n  Link: </assets/sub.css>; rel=preload; as=style\r\n');
  fs.writeFileSync(path.join(root,'_redirects'),'/old/ /sub/ 301\n');
  const child=spawn(process.execPath,[script],{cwd:root,env:{...process.env,LOCAL_PREVIEW_PORT:'0',LOCAL_PREVIEW_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe'],windowsHide:true});
  t.after(async()=>{if(child.exitCode===null){child.kill();await once(child,'exit');}fs.rmSync(root,{recursive:true,force:true});});
  const origin=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Preview startup timed out')),10000);let output='';
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/Local preview running at (http:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
    child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exited '+code));});
  });
  const home=await fetch(origin+'/');assert.equal(home.status,200);assert.equal(home.headers.get('link'),'</assets/main.css>; rel=preload; as=style, <https://example.invalid/a:b>; rel=preconnect');
  assert.equal(home.headers.get('cache-control'),'no-store');
  const shell=await fetch(origin+'/assets/main.shell-0123456789.css');assert.equal(shell.status,200);assert.equal(shell.headers.get('cache-control'),'public, max-age=31536000, immutable');
  const sub=await fetch(origin+'/sub/');assert.equal(sub.status,200);assert.match(sub.headers.get('link'),/sub\.css/);assert.match(sub.headers.get('link'),/main\.css/);
  const redirect=await fetch(origin+'/old/',{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),'/sub/');
});
