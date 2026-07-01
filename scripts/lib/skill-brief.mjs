/**
 * skill-brief.mjs
 *
 * Shared renderer for founder-facing skill briefs. Closeout, audit, implement,
 * orientation, and sprint surfaces use the same contract so Codex and Claude
 * produce the same shape from the same JSON.
 */

import fs from 'node:fs';
import path from 'node:path';
import { lintInsight } from './insight-voice-linter.mjs';
import { BRIEF_REQUIRED_ITEM_FIELDS, BRIEF_REQUIRED_TOP_FIELDS } from './shared-policies.mjs';

const FRAME_WIDTH = 95;
const INDENT = '  ';
const ITEM_INDENT = '         ';

export const BRIEF_KINDS = {
  closeout: { title: 'CLOSEOUT IMPACT BRIEF', left: 'PROJECT IMPACT', right: 'ECOSYSTEM IMPACT' },
  audit: { title: 'AUDIT PRIORITY BRIEF', left: 'COMBINED PRIORITY', right: 'INNOVATION DENSITY' },
  plan: { title: 'IMPLEMENT PLAN BRIEF', left: 'EFFORT SHIPPABILITY', right: 'EXECUTION CONFIDENCE' },
  orientation: { title: 'SESSION ORIENTATION', left: 'CONTEXT READINESS', right: 'CROSS-REPO URGENCY' },
  sprint: { title: 'GO SPRINT BRIEF', left: 'ROUND VELOCITY', right: 'ROUND QUALITY' },
};

const AXIS_PRI = {
  security: 0,
  speed: 1,
  tokenCost: 2,
  ai: 3,
  ux: 4,
  'feature-depth': 5,
  integration: 6,
  organization: 7,
};

function visualLen(s) {
  return [...String(s)].length;
}

function pad(s, w) {
  const str = String(s ?? '');
  return str + ' '.repeat(Math.max(0, w - visualLen(str)));
}

function bar(score) {
  const half = Math.max(0, Math.min(100, score)) / 10;
  const full = Math.floor(half);
  const halfBlock = half - full >= 0.5 ? 1 : 0;
  const empty = 10 - full - halfBlock;
  return '█'.repeat(full) + '▌'.repeat(halfBlock) + '░'.repeat(empty);
}

function frameTop() {
  return '╔' + '═'.repeat(FRAME_WIDTH - 2) + '╗';
}

function frameBottom() {
  return '╚' + '═'.repeat(FRAME_WIDTH - 2) + '╝';
}

function frameSep() {
  return '╠' + '═'.repeat(FRAME_WIDTH - 2) + '╣';
}

function frameLine(content = '') {
  const inner = FRAME_WIDTH - 4;
  return '║  ' + pad(content, inner) + '  ║';
}

function wrap(text, width, indent = '') {
  const words = String(text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > width) {
      if (cur) lines.push(cur.trim());
      cur = word;
    } else {
      cur = cur ? `${cur} ${word}` : word;
    }
  }
  if (cur) lines.push(cur.trim());
  return lines.map((line) => indent + line).join('\n');
}

export function validate(brief) {
  const required = ['kind', ...BRIEF_REQUIRED_TOP_FIELDS];
  for (const key of required) {
    if (brief[key] == null) throw new Error(`brief missing field: ${key}`);
  }
  if (!BRIEF_KINDS[brief.kind]) throw new Error(`unknown kind: ${brief.kind}`);
  if (!Array.isArray(brief.items) || brief.items.length === 0) {
    throw new Error('items must contain at least one item');
  }
  for (const item of brief.items) {
    for (const key of BRIEF_REQUIRED_ITEM_FIELDS) {
      if (item[key] == null) throw new Error(`item ${item.slug || item.id || '?'} missing ${key}`);
    }
    if (item.leftScore < 1 || item.leftScore > 10) throw new Error(`item ${item.slug} leftScore out of range (1-10)`);
    if (item.rightScore < 1 || item.rightScore > 10) throw new Error(`item ${item.slug} rightScore out of range (1-10)`);
    const voice = lintInsight(item.insight);
    if (!voice.ok) throw new Error(`item ${item.slug} insight violates voice rules: ${voice.violations.join('; ')}`);
  }
  return true;
}

export function render(brief, opts = {}) {
  validate(brief);
  const kind = BRIEF_KINDS[brief.kind];
  const n = brief.items.length;
  const leftScore = Math.round((brief.items.reduce((sum, item) => sum + item.leftScore, 0) / n) * 10);
  const rightScore = Math.round((brief.items.reduce((sum, item) => sum + item.rightScore, 0) / n) * 10);
  const out = [];

  out.push(frameTop());
  out.push(frameLine(`STUDIO OPS · ${kind.title}`));
  out.push(frameLine(`Session ${brief.session} · ${brief.date} · agent: ${brief.agent} · repo: ${brief.repo}`));
  out.push(frameSep());
  out.push(frameLine(''));
  out.push(frameLine('HEADLINE'));
  for (const line of wrap(brief.headline, FRAME_WIDTH - 8, '  ').split('\n')) out.push(frameLine(line));
  out.push(frameLine(''));
  out.push(frameLine(`${pad(kind.left, 18)} ${bar(leftScore)}  ${String(leftScore).padStart(3)}/100`));
  out.push(frameLine(`${pad(kind.right, 18)} ${bar(rightScore)}  ${String(rightScore).padStart(3)}/100`));
  if (brief.silDelta) {
    const delta = Number(brief.silDelta.current) - Number(brief.silDelta.previous);
    out.push(frameLine(`${pad('SIL DELTA', 18)} ${brief.silDelta.previous} → ${brief.silDelta.current}  (${delta >= 0 ? '+' : ''}${delta})`));
  }
  if (brief.extraMetrics) {
    const rows = Array.isArray(brief.extraMetrics)
      ? brief.extraMetrics.map((m) => [m?.label ?? '?', m?.value ?? ''])
      : Object.entries(brief.extraMetrics);
    for (const [label, value] of rows) out.push(frameLine(`${pad(String(label).toUpperCase(), 18)} ${value}`));
  }
  out.push(frameLine(''));
  out.push(frameBottom());
  out.push('');

  const sorted = [...brief.items].sort((a, b) => {
    const ap = a.leftScore * a.rightScore;
    const bp = b.leftScore * b.rightScore;
    if (bp !== ap) return bp - ap;
    return (AXIS_PRI[a.axis] ?? 9) - (AXIS_PRI[b.axis] ?? 9);
  });
  const leftLabel = kind.left.split(' ')[0].slice(0, 4);
  const rightLabel = kind.right.split(' ')[0].slice(0, 4);

  out.push(`${INDENT}${brief.itemsHeader || 'ITEMS'}${' '.repeat(Math.max(0, 60 - (brief.itemsHeader || 'ITEMS').length))}(sorted: left × right)`);
  out.push(`${INDENT}${'─'.repeat(FRAME_WIDTH - 4)}`);
  out.push('');
  for (const item of sorted) {
    out.push(`${INDENT}${pad(`[${item.id}]  ${item.slug}`, 64)}${leftLabel} ${item.leftScore}  ·  ${rightLabel} ${item.rightScore}`);
    out.push(`${ITEM_INDENT}── ${item.axis} ${'─'.repeat(Math.max(0, 80 - item.axis.length))}`);
    out.push(wrap(item.insight, 84, ITEM_INDENT));
    out.push(`${ITEM_INDENT}→ ${item.evidence}`);
    out.push('');
  }

  out.push(`${INDENT}${'─'.repeat(FRAME_WIDTH - 4)}`);
  out.push('');
  out.push(`${INDENT}${brief.followUpsHeader || 'FOLLOW-UPS'}`);
  if (brief.followUps?.length) for (const item of brief.followUps) out.push(`${INDENT}  • ${item}`);
  else out.push(`${INDENT}  (none)`);
  out.push('');
  out.push(`${INDENT}BLOCKERS`);
  if (brief.blockers?.length) for (const item of brief.blockers) out.push(`${INDENT}  • ${item}`);
  else out.push(`${INDENT}  (none)`);
  out.push('');
  if (opts.actionGate) {
    out.push(`${INDENT}ACTION GATE`);
    out.push(`${INDENT}  ${opts.actionGate}`);
    out.push('');
  }
  return out.join('\n');
}

export function renderAndArchive(brief, opts = {}) {
  const text = render(brief, opts);
  const docsDir = path.join(process.cwd(), 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const outPath = path.join(docsDir, `${String(brief.kind).toUpperCase()}_BRIEF_${brief.session}_${brief.date}.md`);
  fs.writeFileSync(outPath, '```\n' + text + '\n```\n\n---\n\n*Generated by `scripts/lib/skill-brief.mjs` · spec: `docs/SKILL_BRIEF_SPEC.md`*\n');
  return { text, path: outPath };
}
