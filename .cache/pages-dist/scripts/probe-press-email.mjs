#!/usr/bin/env node
/**
 * probe-press-email.mjs
 *
 * Checks whether press@vaultsparkstudios.com is provisioned on the Zoho Mail
 * server by running an SMTP conversation up to the RCPT TO stage and reading
 * the server's response — no message is actually sent.
 *
 * Exit codes:
 *   0  → RCPT accepted (mailbox exists OR server accepts and later bounces)
 *   1  → RCPT rejected (mailbox not provisioned)
 *   2  → network / protocol / unexpected error
 *
 * Usage:
 *   node scripts/probe-press-email.mjs
 *   node scripts/probe-press-email.mjs --address press@vaultsparkstudios.com
 *   node scripts/probe-press-email.mjs --host mx.zoho.com --from probe@example.com
 */
import net from 'node:net';
import { argv, exit } from 'node:process';

const args = Object.fromEntries(
  argv.slice(2).reduce((acc, tok, i, arr) => {
    if (tok.startsWith('--')) acc.push([tok.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1] ?? true]);
    return acc;
  }, [])
);

const TARGET = args.address || 'press@vaultsparkstudios.com';
const HOST = args.host || 'mx.zoho.com';
const PORT = Number(args.port) || 25;
const FROM = args.from || 'probe@vaultsparkstudios.com';
const HELO = args.helo || 'vaultsparkstudios.com';
const TIMEOUT_MS = Number(args.timeout) || 15000;

function log(line) { process.stdout.write(line + '\n'); }

async function probe() {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: HOST, port: PORT });
    sock.setTimeout(TIMEOUT_MS);

    const script = [
      { send: `EHLO ${HELO}`, expect: /^250[ -]/m },
      { send: `MAIL FROM:<${FROM}>`, expect: /^250[ -]/m },
      { send: `RCPT TO:<${TARGET}>`, expect: /^(250|550|551|553)/m, terminal: true },
    ];
    let step = -1;
    let buf = '';
    let lastResponse = '';

    const advance = () => {
      step += 1;
      if (step >= script.length) return;
      const { send } = script[step];
      log(`→ ${send}`);
      sock.write(send + '\r\n');
    };

    sock.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const parts = buf.split(/\r?\n/);
      buf = parts.pop() || '';
      for (const line of parts) {
        log(`← ${line}`);
        lastResponse = line;
      }
      if (step < 0) {
        if (/^220[ -]/.test(lastResponse)) advance();
        return;
      }
      const { expect, terminal } = script[step];
      if (!expect.test(lastResponse)) return;
      if (terminal) {
        const ok = /^250/.test(lastResponse);
        sock.write('QUIT\r\n');
        sock.end();
        resolve({ ok, response: lastResponse });
      } else {
        advance();
      }
    });

    sock.on('timeout', () => {
      sock.destroy();
      resolve({ ok: null, response: 'timeout', error: new Error(`SMTP timeout after ${TIMEOUT_MS}ms`) });
    });
    sock.on('error', (err) => resolve({ ok: null, response: '', error: err }));
    sock.on('close', () => {
      // no-op; resolution already happened at terminal or error
    });
  });
}

(async () => {
  log(`Probing ${TARGET} via ${HOST}:${PORT} (HELO ${HELO}, MAIL FROM ${FROM})`);
  const { ok, response, error } = await probe();
  log('');
  if (error) {
    log(`✗ probe error: ${error.message}`);
    log(`  note: many ISPs and cloud networks block outbound port 25.`);
    log(`  if this fails locally, run from a VM / server or use the web-based test instead.`);
    exit(2);
  }
  if (ok === true) {
    log(`✓ RCPT accepted — ${TARGET} is provisioned on ${HOST}.`);
    log(`  server said: ${response}`);
    exit(0);
  }
  if (ok === false) {
    log(`✗ RCPT rejected — ${TARGET} is NOT provisioned on ${HOST}.`);
    log(`  server said: ${response}`);
    log(`  action: create user or alias in Zoho Mail Admin (https://mailadmin.zoho.com/).`);
    exit(1);
  }
  log(`? indeterminate — last response: ${response || '(none)'}`);
  exit(2);
})();
