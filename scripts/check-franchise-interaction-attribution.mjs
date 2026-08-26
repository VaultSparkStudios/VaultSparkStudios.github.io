#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF_TEST = process.argv.includes('--self-test');

export function inspect(gameSource, telemetrySource) {
  const hoverHandlers = (gameSource.match(/addEventListener\s*\(\s*['"]pointer(?:enter|over|move)['"]/g) || []).length;
  const interactionGuard = /interactionId/.test(telemetrySource) && /interactionId\s*(?:===|<=|<)|!.*interactionId/.test(telemetrySource);
  return { hoverHandlers, interactionGuard, ok: hoverHandlers === 0 && interactionGuard };
}

if (SELF_TEST) {
  const ok = inspect('button.addEventListener("click", go)', 'if (!entry.interactionId) return;');
  const bad = inspect('x.addEventListener("pointerenter", repaint)', 'collect(entry)');
  if (!ok.ok || bad.ok) process.exit(1);
  console.log('check-franchise-interaction-attribution --self-test: all passed');
} else {
  const game = fs.readFileSync(path.join(ROOT, 'franchise-architect', 'app.js'), 'utf8');
  const telemetry = fs.readFileSync(path.join(ROOT, 'assets', 'inp-telemetry.js'), 'utf8');
  const result = inspect(game, telemetry);
  if (!result.ok) {
    console.error('check-franchise-interaction-attribution: failed ' + JSON.stringify(result));
    process.exit(1);
  }
  console.log('check-franchise-interaction-attribution: ok (no hover work; Event Timing interaction guard present)');
}
