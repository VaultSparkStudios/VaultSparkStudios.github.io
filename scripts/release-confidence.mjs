import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const projectStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
const args = new Set(process.argv.slice(2));

const OPTIONS = {
  skipLocal: args.has('--skip-local'),
  skipLive: args.has('--skip-live'),
  skipStaging: args.has('--skip-staging'),
  localTier: args.has('--extended') ? 'extended' : args.has('--core') ? 'core' : 'intelligence'
};

function run(command, commandArgs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      shell: false,
      stdio: 'pipe',
      env: { ...process.env, ...extraEnv }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('exit', (code) => {
      const result = { ok: code === 0, code, stdout, stderr };
      if (code === 0) resolve(result);
      else reject(Object.assign(new Error(`${command} ${commandArgs.join(' ')} failed with code ${code}`), result));
    });
  });
}

async function probeStaging(url) {
  if (!url) return { ok: false, skipped: true, detail: 'no staging URL configured' };

  try {
    const response = await fetch(new URL('/_health', url), {
      headers: {
        'user-agent': 'VaultSpark Release Confidence',
        accept: 'text/plain,application/json;q=0.9,*/*;q=0.8'
      }
    });

    if (response.ok) {
      return { ok: true, detail: `staging health ${response.status}` };
    }

    const fallback = await fetch(url, {
      headers: {
        'user-agent': 'VaultSpark Release Confidence',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8'
      }
    });

    return {
      ok: fallback.ok,
      detail: fallback.ok ? `staging root ${fallback.status}` : `staging returned ${response.status} / root ${fallback.status}`
    };
  } catch (error) {
    return { ok: false, detail: error.message || String(error), advisory: true };
  }
}

function summarize(results) {
  const total = results.length;
  const passed = results.filter((item) => item.ok).length;
  const skipped = results.filter((item) => item.skipped).length;
  const failed = results.filter((item) => !item.ok && !item.skipped).length;

  console.log('');
  console.log('╔═ Release Confidence ═══════════════════════════════════════╗');
  console.log(`║ Passed: ${String(passed).padEnd(3)}  Failed: ${String(failed).padEnd(3)}  Skipped: ${String(skipped).padEnd(3)}  Total: ${String(total).padEnd(3)}     ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  results.forEach((item) => {
    const icon = item.skipped ? '—' : item.ok ? '✓' : '✕';
    console.log(`${icon} ${item.label}: ${item.detail}`);
  });

  return failed === 0;
}

async function main() {
  const results = [];

  try {
    await run('npm', ['run', 'build']);
    results.push({ label: 'site build', ok: true, detail: 'generated shell manifest, fingerprinted shell assets, and current public payloads' });
  } catch (error) {
    results.push({ label: 'site build', ok: false, detail: error.message });
  }

  if (OPTIONS.skipLocal) {
    results.push({ label: `local browser verify (${OPTIONS.localTier})`, skipped: true, ok: false, detail: 'skipped by flag' });
  } else {
    try {
      await run('node', ['scripts/run-local-browser-verify.mjs', '--tier', OPTIONS.localTier]);
      results.push({ label: `local browser verify (${OPTIONS.localTier})`, ok: true, detail: 'Chromium local preview suite passed' });
    } catch (error) {
      results.push({ label: `local browser verify (${OPTIONS.localTier})`, ok: false, detail: error.message });
    }
  }

  if (OPTIONS.skipLive) {
    results.push({ label: 'production browser verify', skipped: true, ok: false, detail: 'skipped by flag' });
    results.push({ label: 'live headers', skipped: true, ok: false, detail: 'skipped by flag' });
  } else {
    try {
      await run('node', ['scripts/run-live-browser-verify.mjs', '--skip-staging']);
      results.push({ label: 'production browser verify', ok: true, detail: 'homepage shell regression passed against production' });
    } catch (error) {
      results.push({ label: 'production browser verify', ok: false, detail: error.message });
    }

    try {
      await run('node', ['scripts/verify-live-headers.mjs']);
      results.push({ label: 'live headers', ok: true, detail: 'production security headers and CSP matched expectations' });
    } catch (error) {
      results.push({ label: 'live headers', ok: false, detail: error.message });
    }
  }

  if (OPTIONS.skipStaging) {
    results.push({ label: 'staging browser verify', skipped: true, ok: false, detail: 'skipped by flag' });
    results.push({ label: 'staging health', skipped: true, ok: false, detail: 'skipped by flag' });
  } else {
    if (projectStatus.stagingUrl) {
      try {
        await run('node', ['scripts/run-live-browser-verify.mjs', '--skip-production']);
        results.push({ label: 'staging browser verify', ok: true, detail: 'homepage shell regression passed against staging' });
      } catch (error) {
        results.push({ label: 'staging browser verify', ok: false, detail: error.message });
      }
    } else {
      results.push({ label: 'staging browser verify', skipped: true, ok: false, detail: 'no staging URL configured' });
    }

    const staging = await probeStaging(projectStatus.stagingUrl);
    results.push({
      label: 'staging health',
      ok: staging.ok,
      skipped: staging.skipped,
      detail: staging.detail
    });
  }

  const okay = summarize(results);
  if (!okay) process.exit(1);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
