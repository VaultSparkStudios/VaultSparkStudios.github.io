import { spawnSync } from './safe-spawn.mjs';
import path from 'node:path';

export const RESILIENCE_CLASSES = [
  { id: 'optional-input', script: 'check-build-step-resilience.mjs', promise: 'build steps do not hard-fail on absent optional/local inputs' },
  { id: 'transient-publisher', script: 'check-ci-publisher-resilience.mjs', promise: 'unattended publishers degrade only transient upstream failures' },
];

export function summarizeResilience(results) {
  const failed = results.filter((result) => result.status !== 0);
  return { ok: failed.length === 0, count: results.length, failed };
}

export function runResilienceChecks(root, mode = '--check', runner = spawnSync) {
  const results = RESILIENCE_CLASSES.map((entry) => {
    const run = runner(process.execPath, [path.join(root, 'scripts', entry.script), mode], {
      cwd: root, encoding: 'utf8', windowsHide: true,
    });
    return { ...entry, status: run.status ?? 1, output: String(run.stderr || run.stdout || '').trim() };
  });
  return { ...summarizeResilience(results), results };
}

export function selfTestResilienceGate() {
  const ok = summarizeResilience([{ status: 0 }, { status: 0 }]);
  const bad = summarizeResilience([{ status: 0 }, { status: 1, id: 'x' }]);
  const invoked = [];
  const aggregate = runResilienceChecks('/repo', '--check', (_node, argv) => {
    invoked.push(argv[0]);
    return { status: 0, stdout: 'ok' };
  });
  return [
    ['all classes green passes', ok.ok && ok.count === 2],
    ['one red class blocks', !bad.ok && bad.failed.length === 1],
    ['umbrella invokes every registered class', aggregate.ok && invoked.length === RESILIENCE_CLASSES.length],
  ];
}