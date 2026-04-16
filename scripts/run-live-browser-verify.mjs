import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const statusPath = path.join(root, 'context', 'PROJECT_STATUS.json');
const projectStatus = JSON.parse(fs.readFileSync(statusPath, 'utf8'));

const rawArgs = process.argv.slice(2);
const explicitSpecs = rawArgs.filter((arg) => !arg.startsWith('--'));
const skipStaging = rawArgs.includes('--skip-staging');
const skipProduction = rawArgs.includes('--skip-production');
const specs = explicitSpecs.length ? explicitSpecs : ['tests/homepage-hero-regression.spec.js'];

function resolvePlaywrightRunner() {
  const localBin = process.platform === 'win32'
    ? path.join(root, 'node_modules', '.bin', 'playwright.cmd')
    : path.join(root, 'node_modules', '.bin', 'playwright');

  if (fs.existsSync(localBin)) {
    return { command: localBin, args: [] };
  }

  return { command: 'npx', args: ['playwright'] };
}

function run(command, commandArgs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const useShell = process.platform === 'win32' && /\.cmd$/i.test(command);
    const child = spawn(command, commandArgs, {
      cwd: root,
      shell: useShell,
      stdio: 'inherit',
      env: { ...process.env, ...extraEnv }
    });

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} failed with code ${code}`));
    });
  });
}

async function verify(label, baseUrl) {
  const runner = resolvePlaywrightRunner();
  await run(runner.command, [...runner.args, 'test', ...specs, '--project=chromium', '--reporter=list'], {
    BASE_URL: baseUrl,
  });
  return { label, ok: true, detail: `${specs.join(', ')} passed against ${baseUrl}` };
}

async function main() {
  const results = [];

  if (!skipProduction) {
    results.push(await verify('production browser verify', 'https://vaultsparkstudios.com'));
  }

  if (!skipStaging && projectStatus.stagingUrl) {
    results.push(await verify('staging browser verify', projectStatus.stagingUrl));
  }

  results.forEach((result) => {
    console.log(`✓ ${result.label}: ${result.detail}`);
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
