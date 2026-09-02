#!/usr/bin/env node
/**
 * author-news-edition.mjs — S319. Fill a prepared draft's judgment fields so the
 * Desk can publish on a schedule without a human in the loop.
 *
 * WHAT CHANGED AND WHY (founder directive, S319)
 * `news-draft-edition.mjs --prepare` fills the deterministic 60% of an edition
 * and leaves headline/hook/tldr/stances/transcript/meme blank because they need
 * judgment. Until now that judgment came from a Claude Code session, so the Desk
 * only published when a session happened to run — four editions in eleven days,
 * last one six days stale, while `api/news-desk-freshness.json` honestly
 * downgraded the public copy to "Periodic". The founder asked for automatic
 * publication several times a day with no review step. This is the missing half.
 *
 * THE SAFETY MODEL — the model authors VOICE, never FACT
 * `hetzner.inference` is documented "advisory/bulk work only, never a decision
 * surface". That constraint is honoured literally rather than waived:
 *
 *   · Sources are never touched. The model cannot add, edit or invent a source;
 *     it only receives the facts the deterministic drafter already ingested.
 *   · Figures are mechanically bound. `runStandards()` blocks any number in a
 *     stance that appears in no cited fact — "invent a joke, never a number".
 *   · The model's output is applied to a COPY and re-validated. If the result
 *     still has blank fields or any `block`-severity finding, nothing is written
 *     and the edition is dropped for this slot.
 *   · Unavailable inference is a state, not a fallback. An edition is skipped,
 *     never published half-authored.
 *
 * So the gates remain the decision surface. The model proposes wording; the
 * standards decide whether that wording is publishable. A failed edition costs
 * one slot and retries at the next cron tick — it never parks awaiting a human.
 *
 * Modes:
 *   --date YYYY-MM-DD   author every incomplete draft for that date
 *   --attempts N        regeneration attempts per draft (default 3)
 *   --dry-run           author and validate, but never write the draft back
 *   --self-test
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blankFields } from './news-draft-edition.mjs';
import {
  runStandards, personaById, VERDICTS, formatFor, validateBody, validateTldr,
  validateStoryVisual,
} from './lib/news-desk.mjs';
import { chat, extractJson, selfTestDeskInference } from './lib/desk-inference.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRAFT_DIR = path.join(ROOT, '.cache', 'news-drafts');

const argValue = (flag, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (hit) return hit.slice(flag.length + 1);
  const index = process.argv.indexOf(flag);
  return index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')
    ? process.argv[index + 1] : fallback;
};

/* ── Prompting ─────────────────────────────────────────────────────────── */

/**
 * The draft already carries everything an author needs in `_authoring` — edition
 * brief, format brief, per-persona voice/creed/forbidden/lexicon, tone licence,
 * hard constraints, and `standardsWillBlock`. Reuse it verbatim rather than
 * paraphrasing: a paraphrase is one more place for the prompt and the gate to
 * disagree, and the gate always wins.
 */
export function buildPrompt(draft) {
  const a = draft._authoring || {};
  const s = draft.story || {};
  const facts = (s.facts || []).map((f, i) => `  [F${i + 1}] ${f.text}  (source: ${f.sourceUrl})`).join('\n');
  const cast = (a.cast || []).map((p) => [
    `  ${p.id} — ${p.name}, ${p.role}`,
    `    creed: ${p.creed}`,
    `    voice: ${p.voice}`,
    `    bias: ${p.bias}`,
    `    never: ${Array.isArray(p.forbidden) ? p.forbidden.join('; ') : p.forbidden || '—'}`,
    p.standing ? `    standing: ${p.standing}${p.toneDirective ? ` (${p.toneDirective})` : ''}` : null,
  ].filter(Boolean).join('\n')).join('\n');

  const shape = {
    headline: 'string', hook: 'string', tldr: 'string',
    memeLine: 'string',
    stances: (s.stances || []).map((st) => ({
      personaId: st.personaId, position: 'string', verdict: 'string',
      direction: 'integer -2..2', horizon: 'integer -2..2', confidence: 'number in (0,1]',
    })),
    predictions: (s.predictions || []).map((p) => ({
      id: p.id, claim: 'string', confidence: 'number strictly between 0 and 1',
    })),
    transcript: (s.transcript || []).map((t) => ({ personaId: t.personaId, text: 'string' })),
    body: [
      { voice: s.stances?.[0]?.personaId || 'persona id', text: 'prose paragraph' },
      { voice: s.stances?.[1]?.personaId || s.stances?.[0]?.personaId || 'persona id', text: 'prose paragraph' },
      { voice: s.stances?.[0]?.personaId || 'persona id', text: 'prose paragraph' },
    ],
    visual: {
      scene: 'string describing the concrete composition',
      alt: 'string describing what is visibly rendered',
      anchors: ['exact article phrase 1', 'exact article phrase 2', 'exact article phrase 3'],
      relationships: [{
        id: 'stable-kebab-case-id',
        subject: ['concrete subject aliases'],
        action: ['concrete action aliases'],
        object: ['concrete object aliases'],
        evidenceAnchorRefs: ['exact article phrase 1'],
      }],
      satire: { target: 'institution/system', setup: 'concrete setup', payoff: 'concrete payoff', institutional: true },
    },
  };

  const system = [
    'You are the writing staff of The Desk, a satirical-but-sourced technology newsroom.',
    'You are given an edition skeleton with its sources already ingested. Write ONLY the wording.',
    '',
    'ABSOLUTE RULE: you may invent a joke. You may never invent a number, a date, a company,',
    'a quote, or an event. Every factual assertion must be supported by the numbered facts below.',
    'If a fact you want is not in the list, write around it — do not assert it.',
    '',
    'Return ONE JSON object and nothing else. No markdown fence, no commentary.',
  ].join('\n');

  const user = [
    `EDITION: ${a.editionBrief || draft.edition}`,
    `FORMAT: ${a.formatBrief || s.format}`,
    `TONE: ${a.toneLicence || ''}`,
    '',
    `TOPIC: ${draft.topic?.title || s.slug}`,
    '',
    'SOURCED FACTS — the only facts you may assert:',
    facts || '  (none)',
    '',
    'THE DESK, seated for this story:',
    cast || '  (none)',
    '',
    a.signatureBits?.length ? `SIGNATURE BITS:\n${a.signatureBits.map((b) => `  ${b}`).join('\n')}` : '',
    '',
    'HARD CONSTRAINTS:',
    ...Object.entries(a.constraints || {}).map(([k, v]) => `  ${k}: ${v}`),
    '',
    `RULE: ${a.rule || ''}`,
    '',
    'THE STANDARDS DESK WILL MECHANICALLY BLOCK:',
    ...(a.standardsWillBlock || []).map((r) => `  · ${r}`),
    '',
    'Return exactly this JSON shape (same personaIds, same prediction ids, same order):',
    JSON.stringify(shape, null, 2),
  ].filter((line) => line !== '').join('\n');

  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

/* ── Applying a proposal ───────────────────────────────────────────────── */

const clampInt = (value, lo, hi) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};
const unitInterval = (value, { exclusive = false } = {}) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (exclusive) return n > 0 && n < 1 ? n : null;
  return n > 0 && n <= 1 ? n : null;
};

/**
 * Apply a proposal to a COPY of the draft. Only judgment fields are writable —
 * facts, sources, cast, ids and dates are structural and stay exactly as the
 * deterministic drafter produced them, so a model cannot widen its own evidence.
 */
export function applyProposal(draft, proposal) {
  const next = structuredClone(draft);
  const s = next.story;
  const p = proposal || {};

  if (typeof p.headline === 'string') s.headline = p.headline.trim();
  if (typeof p.hook === 'string') s.hook = p.hook.trim();
  if (typeof p.tldr === 'string') s.tldr = p.tldr.trim();
  if (typeof p.memeLine === 'string') s.memeLine = { ...s.memeLine, text: p.memeLine.trim() };
  else if (typeof p.memeLine?.text === 'string') s.memeLine = { ...s.memeLine, text: p.memeLine.text.trim() };

  const byPersona = new Map((p.stances || []).map((st) => [st.personaId, st]));
  s.stances = (s.stances || []).map((st) => {
    const proposed = byPersona.get(st.personaId);
    if (!proposed) return st;
    return {
      ...st,
      position: typeof proposed.position === 'string' ? proposed.position.trim() : st.position,
      verdict: VERDICTS.includes(String(proposed.verdict || '').trim()) ? proposed.verdict.trim() : st.verdict,
      direction: clampInt(proposed.direction, -2, 2) ?? st.direction,
      horizon: clampInt(proposed.horizon, -2, 2) ?? st.horizon,
      confidence: unitInterval(proposed.confidence) ?? st.confidence,
    };
  });

  const byId = new Map((p.predictions || []).map((pr) => [pr.id, pr]));
  s.predictions = (s.predictions || []).map((pr) => {
    const proposed = byId.get(pr.id);
    if (!proposed) return pr;
    return {
      ...pr,
      claim: typeof proposed.claim === 'string' ? proposed.claim.trim() : pr.claim,
      // A prediction at certainty is not a prediction — reject 0 and 1 outright.
      confidence: unitInterval(proposed.confidence, { exclusive: true }) ?? pr.confidence,
    };
  });

  const byVoice = new Map((p.transcript || []).map((t) => [t.personaId, t]));
  s.transcript = (s.transcript || []).map((t) => {
    const proposed = byVoice.get(t.personaId);
    return proposed && typeof proposed.text === 'string' ? { ...t, text: proposed.text.trim() } : t;
  });

  if (Array.isArray(p.body)) {
    const allowed = new Set((s.stances || []).map((st) => st.personaId));
    s.body = p.body.slice(0, 5).flatMap((block) => {
      const text = typeof block?.text === 'string' ? block.text.trim() : '';
      const voice = allowed.has(block?.voice) ? block.voice : null;
      return text ? [{ ...(voice ? { voice } : {}), text }] : [];
    });
  }

  if (s.visual && p.visual && typeof p.visual === 'object') {
    const visual = p.visual;
    for (const key of ['scene', 'alt']) {
      if (typeof visual[key] === 'string') s.visual[key] = visual[key].trim();
    }
    if (Array.isArray(visual.anchors)) {
      s.visual.anchors = visual.anchors.slice(0, 3).map((value) => String(value).trim()).filter(Boolean);
    }
    if (Array.isArray(visual.relationships)) {
      s.visual.relationships = visual.relationships.slice(0, 3).map((rel) => ({
        id: String(rel?.id || '').trim(),
        subject: (Array.isArray(rel?.subject) ? rel.subject : [rel?.subject]).map(String).map((v) => v.trim()).filter(Boolean),
        action: (Array.isArray(rel?.action) ? rel.action : [rel?.action]).map(String).map((v) => v.trim()).filter(Boolean),
        object: (Array.isArray(rel?.object) ? rel.object : [rel?.object]).map(String).map((v) => v.trim()).filter(Boolean),
        evidenceAnchorRefs: (Array.isArray(rel?.evidenceAnchorRefs) ? rel.evidenceAnchorRefs : []).map(String).map((v) => v.trim()).filter(Boolean),
      }));
    }
    for (const key of ['target', 'setup', 'payoff']) {
      if (typeof visual.satire?.[key] === 'string') s.visual.satire[key] = visual.satire[key].trim();
    }
    s.visual.satire.institutional = true;

    // Relationship parity is a visual contract, not permission to append
    // machine-like grammar to every piece of prose. Keep the explicit bridge
    // in scene + alt, where it describes the illustration; the caption and
    // satire must remain concise editorial writing.
    const authoredRel = s.visual.relationships[0];
    if (authoredRel) {
      const subject = authoredRel.subject[0] || 'editorial system';
      const action = authoredRel.action[0] || 'routes';
      const object = authoredRel.object[0] || 'source evidence';
      const bridge = `${subject} ${action} ${object}`.replace(/\s+/g, ' ').trim();
      const sentence = `The composition shows ${bridge}.`;
      s.visual.scene = `${s.visual.scene} ${sentence}`.trim();
      s.visual.alt = `${s.visual.alt} ${sentence}`.trim();
      s.visual.relationships = [{
        id: String(authoredRel.id || `${subject}-${action}-${object}`)
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48),
        subject: [subject],
        action: [action],
        object: [object],
        evidenceAnchorRefs: [s.visual.anchors[0]].filter(Boolean),
      }];
    }
  }

  return next;
}

/**
 * A draft is publishable only when nothing is blank AND the standards desk
 * raises no blocking finding. Both halves matter: blanks catch a lazy proposal,
 * standards catch a confident one that invented a figure.
 */
export function evaluate(draft) {
  const blanks = blankFields(draft);
  const findings = runStandards(draft.story) || [];
  const fmt = formatFor(draft.story);
  const structural = [];
  const fullContract = Boolean(draft._authoring?.constraints?.body);
  if (fullContract) structural.push(...validateBody(draft.story.body, {
      range: fmt.bodyWords,
      personaIds: new Set((draft.story.stances || []).map((st) => st.personaId)),
    }), ...validateTldr(draft.story.tldr, { range: fmt.tldrRange }));
  if (fullContract && draft.story.visual) {
    const inspectable = structuredClone(draft.story.visual);
    inspectable.pixelInspection = {
      sha256: 'a'.repeat(64), reviewed: true, reviewer: 'pending raster review', semanticVerified: false,
    };
    structural.push(...validateStoryVisual(inspectable, { story: draft.story, date: draft.date })
      .filter((error) => !/pixelInspection/.test(error)));
  }
  const blocks = [
    ...findings.filter((f) => f.severity === 'block'),
    ...structural.map((detail) => ({ severity: 'block', detail })),
  ];
  return { ok: blanks.length === 0 && blocks.length === 0, blanks, blocks, findings };
}

/** Turn a rejection into corrective instructions for the next attempt. */
export function retryNote({ blanks, blocks }) {
  const lines = [];
  if (blocks.length) {
    lines.push('The standards desk BLOCKED your last draft:');
    for (const b of blocks) lines.push(`  · ${b.detail}`);
    lines.push('Remove or rephrase every blocked assertion. Do not soften it — cut it.');
  }
  if (blanks.length) {
    lines.push('These required fields were missing or invalid:');
    for (const b of blanks.slice(0, 20)) lines.push(`  · ${b}`);
  }
  return lines.join('\n');
}

/* ── Driver ────────────────────────────────────────────────────────────── */

// The provider's edge closes long generations at roughly one minute. A 6,144
// token request repeatedly ended as a transport failure before yielding any
// bytes; the compact story JSON shape fits inside 2,048 while retaining a
// generous reasoning allowance above desk-inference's 256-token floor.
export const AUTHOR_MAX_TOKENS = 2048;

/**
 * The authoring receipt that travels with a published story.
 *
 * `requested` is what the desk asked for and `model` is what actually answered;
 * they differ exactly when a standby authored. Recording both lets a reader of
 * the artifact tell a preference from an outcome, which is the whole point -
 * "almost certainly standby-authored" is not a receipt.
 */
export function authoredBy(result, attempt) {
  const model = result?.model ?? null;
  const fellBackFrom = result?.fellBackFrom ?? null;
  return {
    model,
    requested: fellBackFrom ?? model,
    fellBack: Boolean(fellBackFrom),
    attempt,
    at: new Date().toISOString(),
  };
}

async function authorDraft(draft, { attempts, dryRun }) {
  const messages = buildPrompt(draft);
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    // Structured newsroom JSON needs the model's output, not an unbounded
    // hidden reasoning trace. Qwen3.6 documents this hard switch for its
    // OpenAI-compatible vLLM/SGLang API.
    const result = await chat({
      messages,
      maxTokens: AUTHOR_MAX_TOKENS,
      temperature: 0.7,
      thinking: false,
    });
    if (!result.ok) {
      // Unavailable inference is not a content failure — say so precisely so the
      // workflow can distinguish "the service is down" from "the model wrote badly".
      return { ok: false, state: result.state, reason: result.reason, attempt };
    }
    const proposal = extractJson(result.content);
    if (!proposal) {
      last = { blanks: ['model returned no parseable JSON object'], blocks: [] };
      messages.push({ role: 'assistant', content: result.content.slice(0, 4000) });
      messages.push({ role: 'user', content: 'That was not a single JSON object. Return ONLY the JSON object, no prose, no fence.' });
      continue;
    }
    const candidate = applyProposal(draft, proposal);
    // S337: record WHICH model wrote this, on the story, before the draft is
    // written.
    //
    // `chat()` sets `fellBackFrom` precisely so the caller can disclose a
    // standby author rather than assume the preferred one wrote - and this
    // function was dropping both `model` and `fellBackFrom` on the floor. The
    // day artifact carried date/simulated/leadSlug/stories and no story
    // recorded a model, so with the preferred model depooled the /news/
    // editorial disclosure stated an assumption where it should state a fact.
    //
    // It goes on `story` rather than `_authoring` because `_authoring` is the
    // input brief and `promote()` publishes `draft.story` alone - provenance
    // that does not travel with the story it describes is not provenance.
    candidate.story.authoredBy = authoredBy(result, attempt);
    const verdict = evaluate(candidate);
    if (verdict.ok) {
      if (!dryRun) fs.writeFileSync(draftPathFor(draft), `${JSON.stringify(candidate, null, 2)}\n`);
      return { ok: true, attempt, model: result.model ?? null, fellBackFrom: result.fellBackFrom ?? null, draft: candidate, findings: verdict.findings };
    }
    last = verdict;
    messages.push({ role: 'assistant', content: JSON.stringify(proposal).slice(0, 4000) });
    messages.push({ role: 'user', content: retryNote(verdict) });
  }
  return { ok: false, state: 'rejected', reason: retryNote(last || { blanks: [], blocks: [] }), attempt: attempts };
}

const draftPathFor = (draft) => path.join(DRAFT_DIR, `${draft.date}--${draft.story.slug}.json`);

async function main() {
  const date = argValue('--date');
  const attempts = Math.max(1, Number(argValue('--attempts', '3')) || 3);
  const dryRun = process.argv.includes('--dry-run');

  if (!fs.existsSync(DRAFT_DIR)) {
    console.log('author-news-edition: no drafts to author');
    return;
  }
  const files = fs.readdirSync(DRAFT_DIR)
    .filter((f) => f.endsWith('.json') && (!date || f.startsWith(date)))
    .sort();
  if (!files.length) {
    console.log(`author-news-edition: no drafts${date ? ` for ${date}` : ''}`);
    return;
  }

  let authored = 0, skipped = 0, unavailable = 0;
  for (const file of files) {
    const draft = JSON.parse(fs.readFileSync(path.join(DRAFT_DIR, file), 'utf8'));
    if (!blankFields(draft).length) { console.log(`✓ ${file} — already complete`); authored += 1; continue; }
    const result = await authorDraft(draft, { attempts, dryRun });
    if (result.ok) {
      authored += 1;
      console.log(`✓ ${file} — authored on attempt ${result.attempt} by ${result.model || 'unknown'}${result.fellBackFrom ? ` (standby; ${result.fellBackFrom} unavailable)` : ''}`);
    } else if (['credential-missing', 'timeout', 'transport-error', 'rate-limited', 'http-error', 'bad-response', 'empty-response', 'truncated'].includes(result.state)) {
      unavailable += 1;
      console.error(`⚠ ${file} — inference ${result.state}: ${result.reason}`);
    } else {
      skipped += 1;
      console.error(`✗ ${file} — not publishable after ${result.attempt} attempt(s):\n${result.reason}`);
    }
  }

  console.log(`author-news-edition: ${authored} authored · ${skipped} rejected · ${unavailable} unavailable`);
  // Rejected and unavailable are both "no edition this slot", never a hard CI
  // failure: the cadence must survive a bad draft and a vanished experiment.
  if (!authored) process.exitCode = 3;
}

/* ── Self-test ─────────────────────────────────────────────────────────── */

function selfTest() {
  selfTestDeskInference();
  const t = [];
  const add = (name, ok) => t.push([name, ok]);

  const persona = { id: 'x', name: 'X' };
  const baseDraft = {
    date: '2026-01-01', edition: 'morning',
    topic: { title: 'A thing happened' },
    story: {
      slug: 'a-thing', format: 'debate', kind: 'trending', headline: '', hook: '', tldr: '',
      facts: [
        { text: 'The lab reported a 42 percent improvement on the benchmark.', sourceUrl: 'https://a.test/1' },
        { text: 'Two hundred researchers contributed to the release.', sourceUrl: 'https://b.test/2' },
      ],
      stances: [{ personaId: 'x', direction: null, horizon: null, verdict: '', confidence: null, position: '', sources: ['https://a.test/1'] }],
      predictions: [{ id: 'p-1', personaId: 'x', claim: '', confidence: null, resolveBy: '2026-03-01', status: 'open' }],
      transcript: [{ personaId: 'x', text: '' }],
      memeLine: { text: '', personaId: 'x' },
    },
    _authoring: { cast: [persona], constraints: {}, standardsWillBlock: [] },
  };

  const goodProposal = {
    headline: 'A thing happened', hook: 'and it mattered', tldr: 'A paragraph.', memeLine: 'quotable',
    stances: [{ personaId: 'x', position: 'A 42 percent jump is real.', verdict: 'fair', direction: 1, horizon: 0, confidence: 0.7 }],
    predictions: [{ id: 'p-1', claim: 'The benchmark still shows a 42 percent gain on 2026-03-01.', confidence: 0.6 }],
    transcript: [{ personaId: 'x', text: 'Something said.' }],
  };

  const applied = applyProposal(baseDraft, goodProposal);
  add('judgment fields are filled', applied.story.headline === 'A thing happened' && applied.story.stances[0].position !== '');
  add('no blanks remain after a complete proposal', blankFields(applied).length === 0);
  add('the source draft is never mutated', baseDraft.story.headline === '');

  // The core safety property: structural fields are not writable by a proposal.
  const hostile = applyProposal(baseDraft, {
    ...goodProposal,
    facts: [{ text: 'invented', sourceUrl: 'https://evil.test' }],
    stances: [{ personaId: 'x', position: 'ok', verdict: 'v', direction: 1, horizon: 0, confidence: 0.5, sources: ['https://evil.test'] }],
  });
  add('a proposal cannot add a fact', hostile.story.facts.length === 2 && hostile.story.facts.every((f) => !/evil/.test(f.sourceUrl)));
  add('a proposal cannot add a source to a stance', !hostile.story.stances[0].sources.includes('https://evil.test'));
  add('a proposal cannot invent a persona', applyProposal(baseDraft, { stances: [{ personaId: 'ghost', position: 'hi' }] }).story.stances.length === 1);
  add('a proposal cannot change a prediction id or resolveBy', (() => {
    const r = applyProposal(baseDraft, { predictions: [{ id: 'p-1', claim: 'c', confidence: 0.5, resolveBy: '2099-01-01' }] });
    return r.story.predictions[0].resolveBy === '2026-03-01';
  })());

  // Range discipline.
  add('direction is clamped to the scale', applyProposal(baseDraft, { stances: [{ personaId: 'x', direction: 99 }] }).story.stances[0].direction === 2);
  add('a certainty of 1 is refused for a prediction', applyProposal(baseDraft, { predictions: [{ id: 'p-1', confidence: 1 }] }).story.predictions[0].confidence === null);
  add('a stance confidence of 1 is allowed', applyProposal(baseDraft, { stances: [{ personaId: 'x', confidence: 1 }] }).story.stances[0].confidence === 1);
  add('a non-numeric confidence does not overwrite', applyProposal(baseDraft, { stances: [{ personaId: 'x', confidence: 'high' }] }).story.stances[0].confidence === null);

  // S337 authoring provenance. `chat()` sets `fellBackFrom` only when a standby
  // answered, so these two shapes are the only two the pipeline can produce.
  const preferred = authoredBy({ ok: true, model: 'Qwen/Qwen3.6-35B-A3B-FP8' }, 1);
  const standby = authoredBy({ ok: true, model: 'Qwen/Qwen3.8-27B', fellBackFrom: 'Qwen/Qwen3.6-35B-A3B-FP8' }, 2);
  add('a preferred-model author records no fallback', preferred.fellBack === false && preferred.requested === preferred.model);
  add('a standby author records what actually wrote', standby.model === 'Qwen/Qwen3.8-27B' && standby.fellBack === true);
  add('a standby author preserves what was asked for', standby.requested === 'Qwen/Qwen3.6-35B-A3B-FP8');
  add('the receipt keeps the attempt it was authored on', standby.attempt === 2);
  add('an unknown model records null, never a guess', authoredBy({ ok: true }, 1).model === null);
  add('the receipt is timestamped', !Number.isNaN(Date.parse(preferred.at)));

  // The gate that matters: an invented figure must not pass.
  const inventedFigure = applyProposal(baseDraft, {
    ...goodProposal,
    stances: [{ personaId: 'x', position: 'This is a 99 percent improvement.', verdict: 'v', direction: 1, horizon: 0, confidence: 0.5 }],
  });
  const inventedVerdict = evaluate(inventedFigure);
  add('an invented figure is blocked by standards', !inventedVerdict.ok && inventedVerdict.blocks.length > 0);
  add('a sourced figure is not blocked', evaluate(applied).blocks.length === 0);
  add('a rejection produces corrective instructions', /BLOCKED|missing/i.test(retryNote(inventedVerdict)));

  // An incomplete proposal must fail closed, never publish partially.
  add('an incomplete proposal is not publishable', !evaluate(applyProposal(baseDraft, { headline: 'only this' })).ok);

  // Importing the drafter must not run its CLI. Before the S319 RUN_DIRECT
  // guard this import printed a usage banner and set exitCode 2, which would
  // have made every successful scheduled edition report failure.
  add('importing the drafter does not set a failing exit code', process.exitCode === undefined || process.exitCode === 0);

  const prompt = buildPrompt(baseDraft);
  add('the prompt carries the sourced facts', /42 percent/.test(prompt[1].content));
  add('the prompt states the invent-nothing rule', /never invent a number/i.test(prompt[0].content));
  add('the prompt names the seated persona', /\bx\b/.test(prompt[1].content));
  add('the authoring budget stays inside the provider completion envelope', AUTHOR_MAX_TOKENS === 2048);

  for (const [name, ok] of t) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (t.some(([, ok]) => !ok)) process.exit(1);
  console.log(`author-news-edition self-test: ${t.length}/${t.length}`);
}

if (process.argv[1]?.endsWith('author-news-edition.mjs')) {
  if (process.argv.includes('--self-test')) selfTest();
  else await main();
}
