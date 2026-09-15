#!/usr/bin/env node
/**
 * check-news-copy-quality.mjs — reader-facing copy defects in the published
 * Desk corpus.
 *
 * THE BUG THIS EXISTS TO PREVENT.
 *
 * "biowepon" shipped in a published story hook on 2026-09-12 and propagated
 * everywhere the hook travels: the article deck, the derived meta description,
 * /news/, the homepage Desk module, api/news-desk.json and
 * api/news-desk-feed.json. Six surfaces, one typo, zero gates. All six existing
 * check-news-* validators look at STRUCTURE (slugs, claim hashes, engagement
 * coherence, stats, disclosure, visual proof) — not one of them reads the prose
 * a human actually reads. A misspelling in the lead sentence of the flagship
 * story is the most visible possible defect and was the least guarded.
 *
 * WHY THIS IS SPELL-CHECK-SHAPED WITHOUT BEING A SPELL CHECKER.
 *
 * A general dictionary is the wrong tool here: this corpus is dense with model
 * names, company names, and jargon that any dictionary calls a misspelling, and
 * a gate that cries wolf on "DeepSeek" gets switched off within a week. So the
 * spelling rule is deliberately narrow and evidence-driven:
 *
 *   1. CURATED MISSPELLINGS — an explicit wrong → right map. Zero ambiguity.
 *   2. NEAR-MISS OF A DOMAIN TERM — a word ≥7 characters that is exactly ONE
 *      edit away from a term in DOMAIN_TERMS and is not itself allowlisted.
 *      This is the rule that catches "biowepon" (one deletion from "bioweapon")
 *      and, crucially, the NEXT unknown mangling of a domain word, which no
 *      wrong→right list can enumerate in advance.
 *
 * ALLOWLIST is the pressure valve: every legitimate term the near-miss rule
 * could otherwise reach lives there, so the gate stays silent on real
 * vocabulary. Adding a word to ALLOWLIST is the correct fix for a false
 * positive; loosening the rule is not.
 *
 * The remaining rules are mechanical, high-confidence copy defects that no
 * reviewer should have to catch by eye.
 *
 * Deterministic and offline: reads only data/news-desk/days/*.json.
 *
 * Usage:
 *   node scripts/check-news-copy-quality.mjs              # gate (exit 1 on findings)
 *   node scripts/check-news-copy-quality.mjs --json       # machine output
 *   node scripts/check-news-copy-quality.mjs --self-test
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = path.join(ROOT, 'data', 'news-desk', 'days');

/* ── Vocabulary ──────────────────────────────────────────────────────────── */

/**
 * Terms the near-miss rule measures against. Proper nouns and hard technical
 * jargon ONLY — never ordinary English. A generic word here (e.g. "training")
 * would flag its innocent neighbours ("draining"), which is how a gate like
 * this earns its way into the ignore pile.
 */
export const DOMAIN_TERMS = new Set([
  'bioweapon', 'bioweapons', 'biosecurity', 'biothreat',
  'anthropic', 'cloudflare', 'supabase', 'deepseek', 'moonshot', 'kubernetes',
  'nvidia', 'qualcomm', 'microsoft', 'alphabet', 'mistral', 'perplexity',
  'benchmark', 'benchmarks', 'benchmarking',
  'inference', 'throughput', 'latency', 'quantization', 'quantisation',
  'transformer', 'transformers', 'tokenizer', 'tokenizers',
  'embedding', 'embeddings', 'parameter', 'parameters',
  'hallucination', 'hallucinations', 'orchestration', 'interpretability',
  'datacenter', 'datacentre', 'accelerator', 'accelerators',
  'checkpoint', 'checkpoints', 'guardrail', 'guardrails',
]);

/**
 * Known-good terms. Everything in DOMAIN_TERMS is implicitly allowed; this set
 * adds (a) short names the curated map handles instead, (b) acronyms, and
 * (c) ordinary long English words that sit one edit from a domain term and
 * would otherwise be flagged — each one a real false positive this list exists
 * to suppress.
 */
export const ALLOWLIST = new Set([
  ...DOMAIN_TERMS,
  // Companies, labs, products, models.
  'openai', 'chatgpt', 'gpt', 'claude', 'opus', 'sonnet', 'haiku', 'gemini',
  'llama', 'codex', 'cursor', 'copilot', 'bedrock', 'vertex', 'azure', 'aws',
  'huggingface', 'hugging', 'face', 'meta', 'apple', 'google', 'amazon',
  'tesla', 'oracle', 'databricks', 'snowflake', 'stripe', 'vercel', 'netlify',
  'github', 'gitlab', 'docker', 'wrangler', 'playwright', 'deno', 'node',
  'mtia', 'metaroce', 'captivecrunch', 'vaultspark', 'obelisk', 'ignis',
  'grok', 'mixtral', 'qwen', 'kimi', 'phi', 'olmo', 'falcon',
  // Acronyms and initialisms (also see ACRONYMS for the caps rule).
  'ai', 'agi', 'api', 'apis', 'llm', 'llms', 'gpu', 'gpus', 'cpu', 'tpu',
  'rdma', 'roce', 'sdk', 'cli', 'ui', 'ux', 'url', 'urls', 'http', 'https',
  'json', 'html', 'css', 'rag', 'moe', 'sota', 'flops', 'vram', 'nvlink',
  'ceo', 'cto', 'cfo', 'coo', 'gdpr', 'fda', 'sec', 'doj', 'nist', 'eu', 'us',
  // Ordinary English one edit from a domain term — suppressed deliberately.
  'reference', 'references', 'referenced', 'deference', 'difference',
  'parameters', 'perimeter', 'perimeters', 'barometer',
  'inferences', 'interface', 'interfaces',
  'benchmarked', 'tendency', 'latent', 'patency',
  'transfer', 'transformed', 'transforms',
  'checkpointed', 'accelerated', 'accelerate',
  'microsofts', 'alphabets',
]);

/** Explicit wrong → right. Cheap, exact, and covers the short names the near-miss rule skips. */
export const MISSPELLINGS = new Map(Object.entries({
  biowepon: 'bioweapon',
  bioweapen: 'bioweapon',
  bioweopon: 'bioweapon',
  anthropoc: 'Anthropic',
  antropic: 'Anthropic',
  anthorpic: 'Anthropic',
  openia: 'OpenAI',
  opeai: 'OpenAI',
  nvidea: 'Nvidia',
  nvida: 'Nvidia',
  gemeni: 'Gemini',
  cluade: 'Claude',
  claud: 'Claude',
  moonshoot: 'Moonshot',
  deepseak: 'DeepSeek',
  huggingfance: 'Hugging Face',
  cloudflair: 'Cloudflare',
  cloudfare: 'Cloudflare',
  supabse: 'Supabase',
  benchmarck: 'benchmark',
  benchmarkes: 'benchmarks',
  infrence: 'inference',
  inferance: 'inference',
  paramaters: 'parameters',
  paramters: 'parameters',
  throughtput: 'throughput',
  thoughput: 'throughput',
  lantency: 'latency',
  latancy: 'latency',
  quantisization: 'quantization',
  tranformer: 'transformer',
  transfomer: 'transformer',
  embeddigs: 'embeddings',
  seperate: 'separate',
  seperately: 'separately',
  occured: 'occurred',
  occurence: 'occurrence',
  recieve: 'receive',
  recieved: 'received',
  begining: 'beginning',
  definately: 'definitely',
  accomodate: 'accommodate',
  neccessary: 'necessary',
  publically: 'publicly',
  compatability: 'compatibility',
  existance: 'existence',
  independant: 'independent',
  maintenence: 'maintenance',
  perfomance: 'performance',
  performace: 'performance',
  releived: 'relieved',
  supress: 'suppress',
  supressed: 'suppressed',
  threshhold: 'threshold',
  untill: 'until',
  wich: 'which',
  teh: 'the',
  adn: 'and',
}));

/** Acronyms that may legitimately appear in caps without reading as shouting. */
export const ACRONYMS = new Set([
  'AI', 'AGI', 'API', 'APIS', 'LLM', 'LLMS', 'GPU', 'GPUS', 'CPU', 'TPU', 'NPU',
  'RDMA', 'ROCE', 'MTIA', 'SDK', 'CLI', 'UI', 'UX', 'URL', 'HTTP', 'HTTPS',
  'JSON', 'HTML', 'CSS', 'RAG', 'MOE', 'SOTA', 'FLOPS', 'VRAM', 'NVLINK',
  'CEO', 'CTO', 'CFO', 'COO', 'GDPR', 'FDA', 'SEC', 'DOJ', 'NIST', 'EU', 'US',
  'USA', 'UK', 'GTG', 'IP', 'ML', 'NLP', 'OS', 'PR', 'QA', 'RL', 'RLHF', 'SLA',
  'TLS', 'VPN', 'XSS', 'CSP', 'DNS', 'SSO', 'MFA', 'PQC', 'TBA',
  // Brands whose own house style is all-caps — flagging these reads as noise.
  'NVIDIA', 'IBM', 'AMD', 'ARM', 'TSMC', 'HBM', 'PCIE', 'DDR', 'SRAM', 'DRAM',
  'CUDA', 'ROCM', 'MLPERF', 'NASA', 'DARPA', 'MIT', 'IEEE', 'ACM',
]);

/** Brands and identifiers that legitimately begin a sentence in lowercase. */
export const LOWERCASE_SENTENCE_OK = new Set([
  'iphone', 'ipad', 'ipados', 'ios', 'macos', 'ebay', 'openai', 'gpt', 'o1',
  'o3', 'o4', 'e', 'x', 'llama', 'deepseek', 'vLLM'.toLowerCase(), 'nano',
]);

/**
 * Abbreviations whose trailing period does NOT end a sentence. Without these,
 * "paged at 3 a.m. because someone…" reads as a sentence starting lowercase —
 * a false positive straight out of the live corpus.
 */
export const ABBREVIATIONS = new Set([
  'a.m', 'p.m', 'inc', 'llc', 'ltd', 'co', 'corp', 'vs', 'etc', 'e.g', 'i.e',
  'no', 'dr', 'mr', 'mrs', 'ms', 'prof', 'fig', 'approx', 'est', 'al', 'st',
  'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'u.s', 'u.k', 'q1', 'q2', 'q3', 'q4',
]);

/* ── Text helpers ────────────────────────────────────────────────────────── */

const MIN_NEAR_MISS_LEN = 7;

/** Exactly one substitution, insertion, or deletion apart. */
export function isOneEdit(a, b) {
  if (a === b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;
  let i = 0;
  let j = 0;
  let slack = 1;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) { i++; j++; continue; }
    if (!slack) return false;
    slack = 0;
    if (short.length === long.length) { i++; j++; } else { j++; }
  }
  return true;
}

/**
 * Spell-checkable segments.
 *
 * Tokens KEEP digits so a version identifier stays one token, hyphenated
 * compounds are then split, and any segment carrying a digit is dropped.
 * Product identifiers are not dictionary words, and the first version of this
 * tokenizer — letters only, hyphens collapsed — manufactured two false
 * positives on the live corpus by joining across the hyphen: "DeepSeek-V3"
 * became "deepseekv" (one edit from "deepseek") and "200B-parameter" became
 * "bparameter" (one edit from "parameter"). Neither is a typo.
 */
const segments = (text) => (String(text).match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || [])
  .flatMap((token) => token.split(/[-–—]/))
  .filter((segment) => segment && /[A-Za-z]/.test(segment) && !/\d/.test(segment));
/** Bare comparison form: lowercase, apostrophes/possessives dropped. */
const bare = (word) => String(word).toLowerCase().replace(/['’]s$/, '').replace(/['’-]/g, '');

const allowed = (word) => {
  const w = bare(word);
  if (!w) return true;
  if (ALLOWLIST.has(w)) return true;
  // Plurals/possessives of allowlisted terms.
  if (w.endsWith('s') && ALLOWLIST.has(w.slice(0, -1))) return true;
  if (w.endsWith('es') && ALLOWLIST.has(w.slice(0, -2))) return true;
  return false;
};

/**
 * Split prose into sentences without treating abbreviations, initials, or
 * decimals as terminators.
 */
export function sentences(text) {
  const out = [];
  const src = String(text);
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    if (!'.!?'.includes(src[i])) continue;
    const next = src.slice(i + 1);
    if (!/^["'”’)\]]*\s/.test(next) && i !== src.length - 1) continue;
    if (src[i] === '.') {
      // An ellipsis is not a terminator. "It was just... there." is one
      // sentence; treating the last dot as an end made "there." read as a
      // sentence starting lowercase — a false positive from the live corpus.
      if (src[i - 1] === '.' || src[i + 1] === '.') continue;
      const before = src.slice(start, i);
      const lastToken = (before.match(/[A-Za-z][A-Za-z.]*$/) || [''])[0].toLowerCase();
      // Abbreviation, single initial, or a numeric decimal: not a sentence end.
      if (ABBREVIATIONS.has(lastToken) || /^[a-z]$/.test(lastToken) || /\d$/.test(before)) continue;
    }
    let end = i + 1;
    while (end < src.length && /["'”’)\]]/.test(src[end])) end++;
    out.push(src.slice(start, end).trim());
    start = end;
  }
  const tail = src.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

/* ── Rules ───────────────────────────────────────────────────────────────── */

const RULES = [
  {
    id: 'misspelling',
    run(text) {
      const out = [];
      for (const word of segments(text)) {
        const w = bare(word);
        const fix = MISSPELLINGS.get(w);
        if (fix) out.push({ text: word, detail: `misspelling — did you mean "${fix}"?` });
      }
      return out;
    },
  },
  {
    id: 'near-miss-domain-term',
    run(text) {
      const out = [];
      const seen = new Set();
      for (const word of segments(text)) {
        const w = bare(word);
        if (w.length < MIN_NEAR_MISS_LEN || seen.has(w)) continue;
        if (allowed(word) || MISSPELLINGS.has(w)) continue;
        for (const term of DOMAIN_TERMS) {
          if (term.length < MIN_NEAR_MISS_LEN) continue;
          if (!isOneEdit(w, term)) continue;
          seen.add(w);
          out.push({ text: word, detail: `one edit from the domain term "${term}" but is not an allowed spelling` });
          break;
        }
      }
      return out;
    },
  },
  {
    id: 'doubled-word',
    run(text) {
      const out = [];
      const re = /\b([A-Za-z]{2,})\s+\1\b/gi;
      let m;
      while ((m = re.exec(String(text)))) out.push({ text: m[0], detail: `the word "${m[1]}" is repeated` });
      return out;
    },
  },
  {
    id: 'unbalanced-delimiter',
    run(text) {
      const src = String(text);
      const out = [];
      const count = (ch) => src.split(ch).length - 1;
      const pairs = [['(', ')'], ['[', ']'], ['{', '}'], ['“', '”']];
      for (const [open, close] of pairs) {
        if (count(open) !== count(close)) {
          out.push({ text: `${open}${close}`, detail: `unbalanced ${open}${close} (${count(open)} open, ${count(close)} close)` });
        }
      }
      if (count('"') % 2 !== 0) out.push({ text: '"', detail: `odd number of straight double quotes (${count('"')})` });
      return out;
    },
  },
  {
    id: 'markdown-artifact',
    run(text) {
      const out = [];
      const patterns = [
        [/\*\*/, '** bold markers'],
        [/~~/, '~~ strikethrough markers'],
        [/`/, 'backtick'],
        [/\[[^\]\n]+\]\([^)\n]+\)/, 'markdown link'],
        [/(^|\n)\s*#{1,6}\s/, 'markdown heading'],
        [/(^|\n)\s*[-*+]\s/, 'markdown bullet'],
        [/\\n|\\t/, 'escaped whitespace literal'],
      ];
      for (const [re, label] of patterns) {
        const m = String(text).match(re);
        if (m) out.push({ text: m[0].replace(/\n/g, '\\n'), detail: `stray ${label}` });
      }
      return out;
    },
  },
  {
    id: 'double-space',
    run(text) {
      const m = String(text).match(/\S( {2,})\S/);
      return m ? [{ text: m[0], detail: 'double space between words' }] : [];
    },
  },
  {
    id: 'sentence-starts-lowercase',
    run(text) {
      const out = [];
      for (const sentence of sentences(text)) {
        const first = sentence.replace(/^["'“‘(\[]+/, '');
        if (!/^[a-z]/.test(first)) continue;
        const firstWord = bare((first.match(/^[A-Za-z][A-Za-z'’-]*/) || [''])[0]);
        if (LOWERCASE_SENTENCE_OK.has(firstWord)) continue;
        out.push({ text: sentence.slice(0, 60), detail: 'sentence starts with a lowercase letter' });
      }
      return out;
    },
  },
  {
    id: 'all-caps-run',
    run(text) {
      const out = [];
      const tokens = String(text).match(/[A-Za-z][A-Za-z'’-]*/g) || [];
      // A single shouted word.
      for (const token of tokens) {
        const t = token.replace(/['’-]/g, '');
        if (t.length >= 5 && t === t.toUpperCase() && !ACRONYMS.has(t)) {
          out.push({ text: token, detail: 'ALL-CAPS word (shouting, or an unknown acronym)' });
        }
      }
      // A run of caps tokens, even when each one is a known acronym.
      let run = [];
      for (const token of tokens.concat([''])) {
        const t = token.replace(/['’-]/g, '');
        if (t.length >= 2 && t === t.toUpperCase() && /[A-Z]/.test(t)) { run.push(token); continue; }
        if (run.length >= 4) out.push({ text: run.join(' '), detail: `${run.length} consecutive ALL-CAPS words` });
        run = [];
      }
      return out;
    },
  },
  {
    id: 'ellipsis-truncated-quote',
    run(text) {
      const out = [];
      const src = String(text);
      const spans = [...src.matchAll(/“([^”]{1,400})”/g), ...src.matchAll(/"([^"]{1,400})"/g)];
      for (const span of spans) {
        if (/…|\.\.\./.test(span[1])) {
          out.push({ text: span[0].slice(0, 80), detail: 'quoted claim is elided with an ellipsis — quote it whole or paraphrase' });
        }
      }
      return out;
    },
  },
  {
    id: 'placeholder-text',
    run(text) {
      const out = [];
      const re = /\b(TBD|TODO|FIXME|XXX|PLACEHOLDER|LOREM IPSUM|LOREM|DUMMY TEXT|INSERT [A-Z]+ HERE)\b/gi;
      let m;
      while ((m = re.exec(String(text)))) out.push({ text: m[0], detail: 'placeholder text left in published copy' });
      return out;
    },
  },
];

export const RULE_IDS = RULES.map((r) => r.id);

/** Every reader-facing string on a story, with the field path a human can find. */
export function readerFacingFields(story) {
  const out = [];
  const push = (field, value) => {
    if (typeof value === 'string' && value.trim()) out.push({ field, text: value });
  };
  push('headline', story?.headline);
  push('hook', story?.hook);
  push('tldr', story?.tldr);
  push('memeLine.text', story?.memeLine?.text);
  (story?.stances || []).forEach((s, i) => push(`stances[${i}].position (${s?.personaId || '?'})`, s?.position));
  (story?.body || []).forEach((p, i) => push(`body[${i}].text`, p?.text));
  (story?.transcript || []).forEach((p, i) => push(`transcript[${i}].text (${p?.personaId || '?'})`, p?.text));
  return out;
}

/** Pure: one text blob → findings. */
export function checkText(text) {
  return RULES.flatMap((rule) => rule.run(text).map((f) => ({ rule: rule.id, ...f })));
}

/** Pure: days → findings, each located by file + story + field. */
export function evaluateCorpus(days) {
  const findings = [];
  for (const day of days || []) {
    if (day?.simulated === true) continue;
    for (const story of day.stories || []) {
      for (const { field, text } of readerFacingFields(story)) {
        for (const f of checkText(text)) {
          findings.push({
            file: `data/news-desk/days/${day.date}.json`,
            date: day.date,
            story: story.slug || '?',
            field,
            ...f,
          });
        }
      }
    }
  }
  return findings;
}

function loadDays() {
  return fs.readdirSync(DAYS)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort()
    .map((n) => JSON.parse(fs.readFileSync(path.join(DAYS, n), 'utf8')));
}

/* ── Self-test ───────────────────────────────────────────────────────────── */

function selfTest() {
  const fires = (id, text) => checkText(text).some((f) => f.rule === id);
  const clean = (text) => checkText(text).length === 0;

  const cases = [
    // ── Each rule fires ──
    ['THE LIVE CASE: "biowepon" in a story hook is caught',
      () => fires('misspelling', 'Moonshot routed 300k requests, revealing a scaled biowepon misuse vector.')],
    ['THE NEXT ONE: an unknown mangling no wrong→right list contains is caught as a near-miss',
      () => fires('near-miss-domain-term', 'It revealed a scaled bioweapn misuse vector.')
        && !MISSPELLINGS.has('bioweapn')],
    ['a model version identifier is not mistaken for a misspelling',
      () => clean('DeepSeek-V3 and a 200B-parameter checkpoint both shipped this week.')],
    ['a brand written in its own all-caps house style passes',
      () => clean('NVIDIA and AMD both announced accelerators at the show.')],
    ['the live case is located in the hook field of the real story shape',
      () => {
        const found = evaluateCorpus([{
          date: '2026-09-12',
          stories: [{ slug: 'a-story', hook: 'A scaled biowepon misuse vector.' }],
        }]);
        return found.length === 1 && found[0].field === 'hook' && found[0].story === 'a-story'
          && found[0].file === 'data/news-desk/days/2026-09-12.json' && /bioweapon/.test(found[0].detail);
      }],
    ['a curated misspelling fires', () => fires('misspelling', 'They recieve the report.')],
    ['a curated misspelling names the correction',
      () => checkText('Paramaters grew.').some((f) => /did you mean "parameters"/.test(f.detail))],
    ['a doubled word fires', () => fires('doubled-word', 'The the model shipped.')],
    ['an unbalanced bracket fires', () => fires('unbalanced-delimiter', 'The lab (formerly a startup said no.')],
    ['an odd straight quote count fires', () => fires('unbalanced-delimiter', 'He said "we will not ship it.')],
    ['an unbalanced curly quote fires', () => fires('unbalanced-delimiter', 'He said “we will not ship it.')],
    ['markdown bold fires', () => fires('markdown-artifact', 'This is **important** context.')],
    ['a markdown link fires', () => fires('markdown-artifact', 'See [the report](https://example.com) for detail.')],
    ['a markdown heading fires', () => fires('markdown-artifact', '## The stakes\nIt matters.')],
    ['a double space fires', () => fires('double-space', 'The model  shipped today.')],
    ['a lowercase sentence start fires', () => fires('sentence-starts-lowercase', 'The model shipped. it was late.')],
    ['a shouted word fires', () => fires('all-caps-run', 'This is ENORMOUS for the field.')],
    ['a run of caps words fires', () => fires('all-caps-run', 'The AI API GPU LLM stack is fragile.')],
    ['an elided quote fires', () => fires('ellipsis-truncated-quote', 'He said “we blocked it … eventually” in the report.')],
    ['an elided straight-quoted claim fires', () => fires('ellipsis-truncated-quote', 'He said "we blocked it ... eventually" today.')],
    ['placeholder text fires', () => fires('placeholder-text', 'Impact: TBD before publication.')],
    ['lorem ipsum fires', () => fires('placeholder-text', 'Lorem ipsum dolor sit amet.')],

    // ── Negative controls: legitimate tech vocabulary must pass ──
    ['real model and company names pass',
      () => clean('Anthropic, OpenAI, Nvidia, DeepSeek, Cloudflare, Supabase, Gemini, Claude Opus and Moonshot all shipped.')],
    ['Hugging Face and hyphenated products pass',
      () => clean('Hugging Face mirrored the weights, and GPT-5 class models followed.')],
    ['dense jargon passes',
      () => clean('Inference throughput, latency, parameters, quantization and embeddings all improved on the benchmark.')],
    ['acronyms in normal prose pass',
      () => clean('The GPU cluster exposed an RDMA fabric through a private API.')],
    ['a short caps run of real acronyms passes',
      () => clean('The AI API layer held under load.')],
    ['possessives and curly apostrophes pass',
      () => clean('Anthropic’s Opus model answered Moonshot’s relayed requests.')],
    ['THE ABBREVIATION TRAP: "3 a.m. because" is not a lowercase sentence start',
      () => clean('I was paged at 3 a.m. because the logs were split across three dashboards.')],
    ['decimals and figures do not split sentences',
      () => clean('Revenue hit 1.5 billion dollars in the quarter and kept climbing.')],
    ['Inc./U.S. abbreviations do not split sentences',
      () => clean('The filing named Example Inc. and the U.S. regulator as parties to the dispute.')],
    ['"reference" is not mistaken for "inference"',
      () => clean('The paper included a reference to the original architecture.')],
    ['balanced quotes and parentheses pass',
      () => clean('He said “we blocked it” (after four hours) in a written statement.')],
    ['a whole quoted sentence with no elision passes',
      () => clean('She said “the model refused the request outright” in the report.')],
    ['an ellipsis outside a quote is left alone',
      () => clean('The pattern repeated again … and the team finally saw it.')],
    ['THE ELLIPSIS TRAP (live corpus): "It was just... there." is one sentence, not a lowercase start',
      () => clean('It wasn’t even a complex attack. It was just... there. We spent six months patching it.')],
    ['the real 2026-09-12 story shape passes once the typo is corrected',
      () => evaluateCorpus([{
        date: '2026-09-12',
        stories: [{
          slug: 'anthropic-says-it-blocked-potential-ai-bioweapon-misuse',
          headline: 'Anthropic Blocks AI Bioweapon Misuse via Moonshot Relay',
          hook: 'Moonshot routed 300k requests to Anthropic’s Opus in ten days, revealing a scaled bioweapon misuse vector.',
          memeLine: { text: 'We blocked the bioweapon; now we’re arguing about who paid for the server rack.' },
          stances: [{ personaId: 'vera', position: 'The scale of this abuse proves that defense is about infrastructure resilience.' }],
        }],
      }]).length === 0],
    ['simulated days are exempt',
      () => evaluateCorpus([{ date: '2026-01-01', simulated: true, stories: [{ slug: 's', hook: 'A biowepon.' }] }]).length === 0],

    // ── Helper properties ──
    ['isOneEdit sees a deletion, substitution and insertion',
      () => isOneEdit('biowepon', 'bioweapon') && isOneEdit('nvidea', 'nvidia') && isOneEdit('bioweapons', 'bioweapon')],
    ['isOneEdit rejects identity and distance ≥2',
      () => !isOneEdit('bioweapon', 'bioweapon') && !isOneEdit('biowepn', 'bioweapon')],
    ['every rule is reachable from the rule table',
      () => RULE_IDS.length === 10 && new Set(RULE_IDS).size === 10],
  ];

  let failed = 0;
  for (const [name, fn] of cases) {
    let pass = false;
    try { pass = fn() === true; } catch { pass = false; }
    if (!pass) failed++;
    console.log(`  ${pass ? 'ok' : 'FAIL'} ${name}`);
  }
  console.log(`check-news-copy-quality --self-test: ${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
}

/* ── Entry ───────────────────────────────────────────────────────────────── */

function main() {
  if (process.argv.includes('--self-test')) return selfTest();
  const findings = evaluateCorpus(loadDays());
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
    process.exit(findings.length ? 1 : 0);
  }
  if (!findings.length) {
    console.log('check-news-copy-quality: ok — no copy defects in reader-facing Desk prose');
    return;
  }
  console.error('✗ check-news-copy-quality: reader-facing copy defects in the published corpus:');
  for (const f of findings) {
    console.error(`    ${f.file} · ${f.story} · ${f.field}`);
    console.error(`      [${f.rule}] ${f.detail}`);
    console.error(`      → ${JSON.stringify(f.text)}`);
  }
  console.error('  Fix the corpus in data/news-desk/days/, then regenerate the derived surfaces.');
  process.exit(1);
}

main();
