#!/usr/bin/env node
/**
 * Generate a PBKDF2-SHA256 hash in the format expected by hub-auth.js
 * for the HUB_AUTH_PASSWORD_HASH secret.
 *
 * Usage: node scripts/hash-hub-password.mjs '<password>'
 * Output: pbkdf2$100000$<b64salt>$<b64hash>
 *
 * Pipe to wrangler:
 *   node scripts/hash-hub-password.mjs 'my-strong-password' | \
 *     npx wrangler secret put HUB_AUTH_PASSWORD_HASH \
 *       --env production --config cloudflare/wrangler.toml
 */

import crypto from 'node:crypto';

const ITER = 100000;

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error('Usage: node scripts/hash-hub-password.mjs "<password>"');
    process.exit(1);
  }
  const salt = crypto.randomBytes(16);
  const hash = await new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, ITER, 32, 'sha256', (err, key) => err ? reject(err) : resolve(key));
  });
  const b64 = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  process.stdout.write(`pbkdf2$${ITER}$${b64(salt)}$${b64(hash)}\n`);
}
main();
