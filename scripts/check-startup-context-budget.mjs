#!/usr/bin/env node
// Startup context budget: fail before a returning session loads an oversized
// live board. Archived history remains lossless; only live-context cost is gated.
import { existsSync, readFileSync } from 'node:fs';
import { rotate } from './rotate-taskboard.mjs';

// 42k leaves a small deterministic allowance above the current three-session
// runway while still rejecting the pre-rotation 48.3k state.
const MAX_STARTUP_TOKENS = 42000;
const REPAIR = 'node scripts/rotate-taskboard.mjs';

export function evaluate({ boardText = '', briefText = '', maxTokens = MAX_STARTUP_TOKENS } = {}) {
  const rotation = rotate(boardText);
  const boardBytes = Buffer.byteLength(boardText);
  const briefBytes = Buffer.byteLength(briefText);
  const estimatedTokens = Math.ceil((boardBytes + briefBytes) / 4);
  const reasons = [];
  if (rotation.movedCount > 0) reasons.push(`${rotation.movedCount} historical session block(s) are still live`);
  if (estimatedTokens > maxTokens) reasons.push(`estimated startup source cost ${estimatedTokens} exceeds ${maxTokens}`);
  return {
    ok: reasons.length === 0,
    authority: 'startup-context-budget',
    maxEstimatedTokens: maxTokens,
    estimatedTokens,
    boardBytes,
    briefBytes,
    rotatableBlocks: rotation.movedCount,
    rotationThreshold: rotation.threshold,
    projectedBoardBytes: Buffer.byteLength(rotation.kept),
    reasons,
    repairCommand: REPAIR,
  };
}

function selfTest() {
  const block = (n) => `## S${n} outcome + carries\n- completed\n`;
  const stale = evaluate({ boardText: '# Board\n' + [9, 8, 7, 6].map(block).join(''), briefText: '' });
  const lean = evaluate({ boardText: '# Board\n' + [9, 8, 7].map(block).join(''), briefText: '' });
  const oversized = evaluate({ boardText: 'x'.repeat(200), briefText: '', maxTokens: 10 });
  const checks = [
    ['stale history fails closed', !stale.ok && stale.rotatableBlocks === 1],
    ['three-session window passes', lean.ok && lean.rotatableBlocks === 0],
    ['token ceiling fails closed', !oversized.ok && oversized.reasons.some((reason) => reason.includes('exceeds'))],
    ['repair command is explicit', stale.repairCommand === REPAIR],
  ];
  const failures = checks.filter(([, ok]) => !ok);
  checks.forEach(([name, ok]) => console.log(`${ok ? '✓' : '✗'} ${name}`));
  console.log(`startup context budget self-test: ${checks.length - failures.length}/${checks.length} passing`);
  if (failures.length) process.exit(1);
}

if (process.argv.includes('--self-test')) selfTest();
else {
  const boardText = readFileSync('context/TASK_BOARD.md', 'utf8');
  const briefText = existsSync('docs/STARTUP_BRIEF.md') ? readFileSync('docs/STARTUP_BRIEF.md', 'utf8') : '';
  const result = evaluate({ boardText, briefText });
  if (process.argv.includes('--json')) console.log(JSON.stringify(result));
  else if (result.ok) console.log(`startup context budget: ok · ~${result.estimatedTokens} tokens · ${result.rotatableBlocks} rotatable blocks`);
  else {
    console.error(`startup context budget: FAIL · ${result.reasons.join('; ')}`);
    console.error(`repair: ${result.repairCommand}`);
  }
  if (!result.ok) process.exit(1);
}
