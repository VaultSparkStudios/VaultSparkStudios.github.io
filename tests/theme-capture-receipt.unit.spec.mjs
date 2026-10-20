import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from '../scripts/lib/safe-spawn.mjs';

const root = path.resolve(import.meta.dirname, '..');
test('actual receipt-only CLI refuses missing and mismatched observed themes before copying files', () => {
  const dir = fs.mkdtempSync(path.join(root, '.cache', 'theme-receipt-negative-'));
  const receiptName = path.basename(dir) + '.json';
  const receipt = path.join(root, 'docs/visual-qa', receiptName);
  try {
    for (const observedTheme of [undefined, { stored: 'light', root: 'dark', body: 'dark' }]) {
      const shot = { route: '/leaderboards/call-of-doodie/', theme: 'light', viewport: 'desktop',
        state: 'page', file: 'not-a-real-capture.png', observedTheme };
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ shots: [shot] }));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/capture-theme-matrix.mjs'),
        '--out', dir, '--receipt-only', '--receipt-name', receiptName],
      { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 15000 });
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, observedTheme ? /Theme evidence mismatch/ : /Theme evidence missing/);
      assert.equal(fs.existsSync(receipt), false);
    }
  } finally {
    if (fs.existsSync(receipt)) fs.unlinkSync(receipt);
    assert.ok(dir.startsWith(path.join(root, '.cache') + path.sep));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
