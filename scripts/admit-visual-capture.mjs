#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { captureSource } from './lib/visual-capture-source.mjs';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('admit-visual-capture — validate CAPTURE_ORIGIN, CAPTURE_UPDATE and CAPTURE_SHA before browser setup; write a provisional source receipt.');
} else {
  try {
    if (process.argv.length > 2) throw new Error('Unknown arguments.');
    const receipt = captureSource({ origin: process.env.CAPTURE_ORIGIN, update: process.env.CAPTURE_UPDATE, sha: process.env.CAPTURE_SHA });
    const root = path.resolve(import.meta.dirname, '..');
    fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
    fs.writeFileSync(path.join(root, '.cache/visual-capture-source.json'), JSON.stringify(receipt, null, 2) + '\n');
    console.log(`Visual capture admitted: ${receipt.sourceCommit} · ${receipt.origin} · ${receipt.mode}. Generation is provisional until reviewed and compared.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
