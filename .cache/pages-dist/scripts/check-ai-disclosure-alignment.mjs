#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SELF_TEST = process.argv.includes('--self-test');

const OLD_BLANKET_CLAIMS = [
  /Ask IGNIS<\/strong> and certain studio-intelligence surfaces[\s\S]{0,180}Anthropic Claude API/i,
  /When you submit a question to Ask IGNIS[\s\S]{0,180}forwarded to Anthropic/i,
  /Portions of the Service[\s\S]{0,160}including <strong>Ask IGNIS<\/strong>[\s\S]{0,160}Anthropic Claude API/i
];

const REQUIRED_PRIVACY = [
  /local cited retrieval/i,
  /does not send the query to a model provider/i,
  /model-backed/i,
  /rate-limit and cost-control/i
];

const REQUIRED_TERMS = [
  /local retrieval/i,
  /model-backed/i,
  /probabilistic/i,
  /not legal, medical, financial, or professional advice/i
];

export function evaluate(files) {
  const findings = [];
  const privacy = files['privacy/index.html'] || '';
  const terms = files['terms/index.html'] || '';
  for (const pattern of OLD_BLANKET_CLAIMS) {
    if (pattern.test(privacy)) findings.push(`privacy/index.html contains outdated blanket AI claim: ${pattern}`);
    if (pattern.test(terms)) findings.push(`terms/index.html contains outdated blanket AI claim: ${pattern}`);
  }
  for (const pattern of REQUIRED_PRIVACY) {
    if (!pattern.test(privacy)) findings.push(`privacy/index.html missing AI disclosure phrase: ${pattern}`);
  }
  for (const pattern of REQUIRED_TERMS) {
    if (!pattern.test(terms)) findings.push(`terms/index.html missing AI terms phrase: ${pattern}`);
  }
  return findings;
}

if (SELF_TEST) {
  const good = evaluate({
    'privacy/index.html': 'Ask IGNIS local cited retrieval does not send the query to a model provider. Some model-backed features use rate-limit and cost-control.',
    'terms/index.html': 'Local retrieval is deterministic. Model-backed output is probabilistic and not legal, medical, financial, or professional advice.'
  });
  const bad = evaluate({
    'privacy/index.html': '<strong>Ask IGNIS</strong> and certain studio-intelligence surfaces are powered by the Anthropic Claude API. When you submit a question to Ask IGNIS it is forwarded to Anthropic.',
    'terms/index.html': 'Portions of the Service including <strong>Ask IGNIS</strong> are powered by the Anthropic Claude API.'
  });
  console.log(`  ${good.length === 0 ? 'ok' : 'fail'} good AI disclosure alignment`);
  console.log(`  ${bad.length >= 6 ? 'ok' : 'fail'} bad AI disclosure alignment`);
  process.exit(good.length === 0 && bad.length >= 6 ? 0 : 1);
}

const files = {};
for (const rel of ['privacy/index.html', 'terms/index.html']) {
  files[rel] = fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const findings = evaluate(files);
if (findings.length) {
  console.error(`AI disclosure alignment failed (${findings.length})`);
  findings.forEach((finding) => console.error(`  ${finding}`));
  process.exit(1);
}

console.log('AI disclosure alignment ok (privacy + terms)');
