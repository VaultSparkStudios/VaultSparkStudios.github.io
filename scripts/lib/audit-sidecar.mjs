#!/usr/bin/env node
/**
 * audit-sidecar.mjs — thin re-export shim (S246)
 *
 * The canonical audit sidecar helpers live in vaultspark-studio-ops. This local
 * module gives /implement a stable import path without duplicating parser logic.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const SIBLING = path.resolve(ROOT, '..', 'vaultspark-studio-ops', 'scripts', 'lib', 'audit-sidecar.mjs');

if (!existsSync(SIBLING)) {
  throw new Error('audit-sidecar.mjs shim: studio-ops sibling module not reachable');
}

const mod = await import(url.pathToFileURL(SIBLING).href);

export const findLatestAuditSidecar = mod.findLatestAuditSidecar;
export const appendExecution = mod.appendExecution;
export const readAuditSidecar = mod.readAuditSidecar;
export const writeAuditSidecar = mod.writeAuditSidecar;
export default mod.default ?? mod;
