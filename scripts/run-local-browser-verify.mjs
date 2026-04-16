import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

const host = process.env.LOCAL_PREVIEW_HOST || '127.0.0.1';
const port = process.env.LOCAL_PREVIEW_PORT || String(4300 + Math.floor(Math.random() * 400));
const baseUrl = `http://${host}:${port}`;
const rawArgs = process.argv.slice(2);

const TIERS = {
  intelligence: [
    'tests/computed-styles.spec.js',
    'tests/homepage-hero-regression.spec.js',
    'tests/intelligence-surfaces.spec.js',
    'tests/micro-feedback.spec.js',
    'tests/vaultsparked-csp.spec.js'
  ],
  core: [
    'tests/computed-styles.spec.js',
    'tests/compliance-pages.spec.js',
    'tests/homepage-hero-regression.spec.js',
    'tests/micro-feedback.spec.js',
    'tests/navigation.spec.js',
    'tests/pages.spec.js',
    'tests/vaultsparked-csp.spec.js',
    'tests/intelligence-surfaces.spec.js'
  ],
  extended: [
    'tests/computed-styles.spec.js',
    'tests/compliance-pages.spec.js',
    'tests/homepage-hero-regression.spec.js',
    'tests/navigation.spec.js',
    'tests/pages.spec.js',
    'tests/micro-feedback.spec.js',
    'tests/games.spec.js',
    'tests/light-mode-screenshots.spec.js',
    'tests/responsive.spec.js',
    'tests/vault-wall.spec.js',
    'tests/vaultsparked-csp.spec.js',
    'tests/intelligence-surfaces.spec.js'
  ]
};

function parseArgs(argv) {
  let tier = 'core';
  const passthrough = [];

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--tier' && argv[i + 1]) {
      tier = argv[i + 1];
      i += 1;
      continue;
    }
    if (argv[i] === '--list') {
      const list = TIERS[tier] || TIERS.core;
      console.log(list.join('\n'));
      process.exit(0);
    }
    passthrough.push(argv[i]);
  }

  if (passthrough.length) {
    return passthrough;
  }
  return TIERS[tier] || TIERS.core;
}

const testArgs = parseArgs(rawArgs);

function resolvePlaywrightRunner() {
  const localBin = process.platform === 'win32'
    ? path.join(process.cwd(), 'node_modules', '.bin', 'playwright.cmd')
    : path.join(process.cwd(), 'node_modules', '.bin', 'playwright');

  if (fs.existsSync(localBin)) {
    return {
      command: localBin,
      args: []
    };
  }

  return {
    command: 'npx',
    args: ['playwright']
  };
}

function run(command, commandArgs, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    let child;
    const isWindowsCmd = process.platform === 'win32' && (
      command === 'npm' ||
      command === 'npx' ||
      /\.cmd$/i.test(command) ||
      /\.bat$/i.test(command)
    );

    if (isWindowsCmd) {
      const commandLine = [command, ...commandArgs]
        .map((part) => (/[\s"]/).test(part) ? `"${part.replace(/"/g, '\\"')}"` : part)
        .join(' ');
      child = spawn('cmd.exe', ['/d', '/s', '/c', commandLine], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, ...extraEnv },
      });
    } else {
      child = spawn(command, commandArgs, {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, ...extraEnv },
      });
    }

    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${commandArgs.join(' ')} failed with code ${code}`));
    });
  });
}

function waitForReady(child, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Local preview server did not start in time.')), timeoutMs);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes('Local preview running at')) {
        clearTimeout(timer);
        resolve();
      }
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk.toString());
    });

    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Local preview server exited early with code ${code}`));
    });
  });
}

async function main() {
  await run('npm', ['run', 'build']);

  const server = spawn('node', ['scripts/local-preview-server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, LOCAL_PREVIEW_HOST: host, LOCAL_PREVIEW_PORT: port },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  try {
    await waitForReady(server);
    const runner = resolvePlaywrightRunner();
    await run(runner.command, [...runner.args, 'test', ...testArgs, '--project=chromium', '--reporter=list'], {
      BASE_URL: baseUrl,
    });
  } finally {
    server.kill('SIGTERM');
    await once(server, 'exit').catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
