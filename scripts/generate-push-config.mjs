import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const opsPath = resolve(ROOT, '../vaultspark-studio-ops/scripts/lib/secrets.mjs');

if (!existsSync(opsPath)) {
  console.error('[generate-push-config] studio-ops not found at', opsPath);
  process.exit(1);
}

const { getSecret } = await import(pathToFileURL(opsPath).href);
const publicKey = await getSecret('VAPID_PUBLIC_KEY', 'cloudflare.vapid');

if (!publicKey) {
  console.error('[generate-push-config] VAPID_PUBLIC_KEY not found in secrets gateway');
  process.exit(1);
}

const out = { publicKey, generatedAt: new Date().toISOString().slice(0, 10) };
const outPath = join(ROOT, 'api', 'push-config.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('[generate-push-config] Written', outPath, '— key:', publicKey.slice(0, 16) + '…');
