import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {articleNewsCss,assertArticleCssCoverage} from '../scripts/lib/news-article-css.mjs';

test('article stylesheet preserves common cascade and rejects omitted classes used by an article',()=>{
 const source='.common{color:red}/* article-omit:start */.profile{color:blue}/* article-omit:end */.common:hover{color:gold}';
 assert.equal(articleNewsCss(source),'.common{color:red}.common:hover{color:gold}');
 assert.doesNotThrow(()=>assertArticleCssCoverage('<div class="common">article</div>',source));
 assert.throws(()=>assertArticleCssCoverage('<div class="profile">article</div>',source),/nonarticle region/);
 for(const invalid of ['.common{}',source+source,'/* article-omit:end *//* article-omit:start */'])assert.throws(()=>articleNewsCss(invalid));
});
test('actual preview response applies article-specific and exact nonarticle hints with the shared sheet',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'vs-article-hints-')),server=path.resolve('scripts/local-preview-server.mjs');
 for(const rel of ['index.html','aba/index.html','news/topic/index.html','news/2026-08-11/story/index.html']){const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'<!doctype html><h1>Fixture</h1>');}
 fs.writeFileSync(path.join(root,'_headers'),'/*\n Link: </shared.css>; rel=preload; as=style\n/news/topic/\n Link: </news.css>; rel=preload; as=style\n/news/20*\n Link: </article.css>; rel=preload; as=style\n/aba*ba/\n Link: </overlap.css>; rel=preload; as=style\n');
 const child=spawn(process.execPath,[server],{cwd:root,env:{...process.env,LOCAL_PREVIEW_HOST:'127.0.0.1',LOCAL_PREVIEW_PORT:'0'},windowsHide:true});const closed=new Promise(resolve=>child.once('close',resolve));let output='';
 try{const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);child.stdout.on('data',b=>{output+=b;const match=output.match(/Local preview running at (http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(timer);resolve(match[1]);}});child.on('error',reject);child.on('exit',code=>{clearTimeout(timer);reject(Error('Preview exited '+code));});});
 const home=await fetch(origin+'/'),listing=await fetch(origin+'/news/topic/'),article=await fetch(origin+'/news/2026-08-11/story/');
 assert.equal(home.status,200);assert.match(home.headers.get('link'),/shared.css/);assert.match(listing.headers.get('link'),/shared.css.*news.css/);assert.equal(article.status,200);assert.match(article.headers.get('link'),/shared.css.*article.css/);assert.doesNotMatch(article.headers.get('link'),/news.css/);
 assert.doesNotMatch((await fetch(origin+'/aba/')).headers.get('link'),/overlap.css/);
 }finally{if(child.pid&&child.exitCode===null&&child.signalCode===null)child.kill();await closed;fs.rmSync(root,{recursive:true,force:true});}
});
