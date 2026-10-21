import fs from 'node:fs';
import path from 'node:path';
import {compactCssTransport} from './css-transport.mjs';

const START='/* article-omit:start */',END='/* article-omit:end */';
export function articleNewsCss(source){
  if(source.split(START).length!==2||source.split(END).length!==2)throw Error('Exactly one explicit nonarticle CSS region required');
  const start=source.indexOf(START),end=source.indexOf(END);
  if(end<start)throw Error('Nonarticle CSS region reversed');
  return source.slice(0,start)+source.slice(end+END.length);
}
export function newsArticleCss(root){
  const news=fs.readFileSync(path.join(root,'assets/news-desk.css'),'utf8');
  // The generated sheet stays in assets/, preserving relative URL bases.
  return compactCssTransport(articleNewsCss(news))+'\n';
}
export function assertArticleCssCoverage(html,source){
  const classes=css=>new Set([...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(x=>x[1]));
  const kept=classes(articleNewsCss(source)),omitted=[...classes(source)].filter(x=>!kept.has(x)),used=new Set([...html.matchAll(/\bclass=["']([^"']*)["']/g)].flatMap(x=>x[1].split(/\s+/)));
  const missing=omitted.filter(x=>used.has(x));
  if(missing.length)throw Error('Article uses CSS from a nonarticle region: '+missing.join(', '));
}
