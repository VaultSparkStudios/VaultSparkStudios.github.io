import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checkMode = process.argv.includes('--check');

const SHELL_ASSETS = [
  { key: 'style', source: 'assets/style.css', stem: 'style.shell', attribute: 'href' },
  { key: 'themeToggle', source: 'assets/theme-toggle.js', stem: 'theme-toggle.shell', attribute: 'src' },
  { key: 'navToggle', source: 'assets/nav-toggle.js', stem: 'nav-toggle.shell', attribute: 'src' },
  { key: 'shellHealth', source: 'assets/shell-health.js', stem: 'shell-health.shell', attribute: 'src' },
];

const HTML_SKIP_DIRS = new Set([
  '.git',
  '.well-known',
  'node_modules',
  'playwright-report',
  'scripts',
  'test-results',
]);

function shortHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, next) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function findHtmlFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!HTML_SKIP_DIRS.has(entry.name)) {
        findHtmlFiles(path.join(dir, entry.name), files);
      }
      continue;
    }

    if (entry.name.endsWith('.html')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function normalizeRelativeUrl(relativePrefix, targetRelPath) {
  if (relativePrefix.startsWith('/')) {
    return `/${targetRelPath.replace(/\\/g, '/')}`;
  }
  return `${relativePrefix}${targetRelPath.replace(/\\/g, '/')}`;
}

function updateHtmlReferences(html, manifest) {
  let next = html;

  for (const asset of SHELL_ASSETS) {
    const source = asset.source.replace(/\\/g, '/');
    const ext = path.extname(source);
    const basename = path.basename(source, ext).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(
      `(${asset.attribute}=["'])([^"']*?)assets\\/${basename}(?:\\.shell-[a-f0-9]{10})?\\${ext}(?:\\?[^"']*)?(["'])`,
      'g'
    );

    next = next.replace(pattern, (_match, prefix, relativePrefix, suffix) => {
      return `${prefix}${normalizeRelativeUrl(relativePrefix, manifest.assets[asset.key].path)}${suffix}`;
    });
  }

  return next;
}

function updateServiceWorker(swSource, manifest) {
  let next = swSource;

  next = next.replace(
    /const CACHE_NAME = '[^']+';/,
    `const CACHE_NAME = '${manifest.cacheName}';`
  );

  for (const asset of SHELL_ASSETS) {
    const source = asset.source.replace(/\\/g, '/');
    const ext = path.extname(source);
    const basename = path.basename(source, ext).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const replacement = `'/` + manifest.assets[asset.key].path.replace(/\\/g, '/') + `'`;
    const pattern = new RegExp(
      `'/assets/${basename}(?:\\.shell-[a-f0-9]{10})?\\${ext}(?:\\?[^']*)?'`,
      'g'
    );
    next = next.replace(pattern, replacement);
  }

  next = next.replace(
    /const FINGERPRINTED_SHELL_ASSETS = \[[\s\S]*?\];/,
    `const FINGERPRINTED_SHELL_ASSETS = [\n${SHELL_ASSETS.map((asset) => `  '/${manifest.assets[asset.key].path.replace(/\\/g, '/')}',`).join('\n')}\n];`
  );

  next = next.replace(
    /const NON_CACHEABLE_SHELL_SOURCES = \[[\s\S]*?\];/,
    `const NON_CACHEABLE_SHELL_SOURCES = [\n${SHELL_ASSETS.map((asset) => `  '/${asset.source.replace(/\\/g, '/')}',`).join('\n')}\n];`
  );

  return next;
}

function cleanupOldFingerprintedFiles(asset, keepBasename) {
  const assetDir = path.join(root, path.dirname(asset.source));
  const ext = path.extname(asset.source);
  const stemPattern = new RegExp(`^${asset.stem.replace('.', '\\.')}\\-[a-f0-9]{10}\\${ext.replace('.', '\\.')}$`);

  for (const entry of fs.readdirSync(assetDir)) {
    if (!stemPattern.test(entry)) continue;
    if (entry === keepBasename) continue;

    fs.unlinkSync(path.join(assetDir, entry));
  }
}

function buildManifest() {
  const assets = {};
  const generatedFiles = [];

  for (const asset of SHELL_ASSETS) {
    const sourcePath = path.join(root, asset.source);
    const content = fs.readFileSync(sourcePath);
    const hash = shortHash(content);
    const ext = path.extname(asset.source);
    const generatedName = `${asset.stem}-${hash}${ext}`;
    const generatedPath = path.join(path.dirname(asset.source), generatedName).replace(/\\/g, '/');

    assets[asset.key] = {
      source: asset.source.replace(/\\/g, '/'),
      path: generatedPath,
      hash,
    };

    generatedFiles.push({
      asset,
      outputPath: path.join(root, generatedPath),
      outputRelPath: generatedPath,
      outputName: generatedName,
      content,
    });
  }

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    version: SHELL_ASSETS.map((asset) => assets[asset.key].hash).join('-'),
    cacheName: `vaultspark-shell-${SHELL_ASSETS.map((asset) => assets[asset.key].hash).join('-')}`,
    assets,
    generatedFiles,
  };
}

function checkFileContent(filePath, expected) {
  if (!fs.existsSync(filePath)) return false;
  const current = fs.readFileSync(filePath, 'utf8');

  try {
    const currentJson = JSON.parse(current);
    const expectedJson = JSON.parse(expected);

    delete currentJson.generatedAt;
    delete expectedJson.generatedAt;

    return JSON.stringify(currentJson) === JSON.stringify(expectedJson);
  } catch {
    return current === expected;
  }
}

function checkBufferContent(filePath, expected) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath).equals(expected);
}

function main() {
  const manifest = buildManifest();
  const manifestOutput = JSON.stringify({
    schemaVersion: manifest.schemaVersion,
    generatedAt: manifest.generatedAt,
    version: manifest.version,
    cacheName: manifest.cacheName,
    assets: manifest.assets,
  }, null, 2) + '\n';

  const htmlFiles = findHtmlFiles(root);
  const swPath = path.join(root, 'sw.js');
  const swNext = updateServiceWorker(read(swPath), manifest);
  const manifestPath = path.join(root, 'assets', 'shell-manifest.json');

  const htmlChanges = [];
  for (const htmlPath of htmlFiles) {
    const current = read(htmlPath);
    const next = updateHtmlReferences(current, manifest);
    if (next !== current) {
      htmlChanges.push({ path: htmlPath, next });
    }
  }

  if (checkMode) {
    const stale = [];

    for (const generated of manifest.generatedFiles) {
      if (!checkBufferContent(generated.outputPath, generated.content)) {
        stale.push(generated.outputRelPath);
      }
    }

    if (!checkFileContent(manifestPath, manifestOutput)) {
      stale.push('assets/shell-manifest.json');
    }

    if (!checkFileContent(swPath, swNext)) {
      stale.push('sw.js');
    }

    for (const htmlChange of htmlChanges) {
      stale.push(path.relative(root, htmlChange.path).replace(/\\/g, '/'));
    }

    if (stale.length) {
      console.error(`Shell asset drift detected:\n${Array.from(new Set(stale)).map((item) => `- ${item}`).join('\n')}`);
      process.exit(1);
    }

    console.log('Shell asset manifest and references are in sync.');
    return;
  }

  for (const generated of manifest.generatedFiles) {
    fs.writeFileSync(generated.outputPath, generated.content);
    cleanupOldFingerprintedFiles(generated.asset, generated.outputName);
  }

  writeIfChanged(manifestPath, manifestOutput);
  writeIfChanged(swPath, swNext);

  for (const htmlChange of htmlChanges) {
    writeIfChanged(htmlChange.path, htmlChange.next);
  }

  console.log(`Generated shell assets (${manifest.version})`);
  manifest.generatedFiles.forEach((generated) => {
    console.log(`- ${generated.outputRelPath}`);
  });
  console.log(`Updated ${htmlChanges.length} HTML files`);
}

main();
