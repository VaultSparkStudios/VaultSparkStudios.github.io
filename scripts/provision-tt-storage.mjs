#!/usr/bin/env node
// Bounded TT diagnostic storage setup. Preserves all unrelated bucket lifecycle rules.
import fs from 'node:fs';
import { getSecret, redact } from './lib/secrets.mjs';

export const TT_RETENTION_RULE = {
  id: 'tt-diagnostics-30d', enabled: true, conditions: { prefix: 'tt/raw/' },
  deleteObjectsTransition: { condition: { type: 'Age', maxAge: 30 * 86400 } },
};
export function withTtRetention(rules) {
  if (!Array.isArray(rules)) throw new Error('Unreadable existing lifecycle rules');
  return [...rules.filter(rule => rule.id !== TT_RETENTION_RULE.id), TT_RETENTION_RULE];
}

if (process.argv.includes('--self-test')) {
  const original = [{ id: 'rum-retention', enabled: true, conditions: { prefix: 'rum/' } }];
  const result = withTtRetention(original);
  if (JSON.stringify(result[0]) !== JSON.stringify(original[0]) || result.length !== 2 || withTtRetention(result).length !== 2 || result[1].conditions.prefix !== 'tt/raw/') throw new Error('retention merge failed');
  console.log('provision-tt-storage: 4 retention checks passed');
} else if (process.argv.includes('--check') || process.argv.includes('--apply')) {
  try {
    const apply = process.argv.includes('--apply');
    const account = getSecret('CLOUDFLARE_ACCOUNT_ID', 'cloudflare.deploy');
    const token = getSecret('CLOUDFLARE_API_TOKEN', 'cloudflare.deploy');
    async function api(path, method = 'GET', body) {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets${path}`, {
        method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
      });
      const json = await response.json();
      if (!response.ok || json.success !== true) throw new Error(`R2 ${method} ${path || '/'} HTTP ${response.status}: ${json.errors?.map(e => e.code).join(',')}`);
      return json.result;
    }
    const listed = await api('');
    const names = new Set((listed.buckets || []).map(bucket => bucket.name));
    const receipt = { at: new Date().toISOString(), applied: apply, buckets: [] };
    for (const bucket of ['vaultspark-rum', 'vaultspark-tt-staging']) {
      if (!names.has(bucket)) {
        if (!apply || bucket !== 'vaultspark-tt-staging') throw new Error(`Required bucket absent: ${bucket}`);
        await api('', 'POST', { name: bucket });
      }
      const existing = await api(`/${bucket}/lifecycle`);
      if (!Array.isArray(existing.rules)) throw new Error('Unreadable lifecycle response');
      const desired = withTtRetention(existing.rules);
      if (JSON.stringify(existing.rules) !== JSON.stringify(desired)) {
        if (!apply) throw new Error(`TT retention not configured: ${bucket}`);
        // Persist rollback material privately before mutation.
        fs.mkdirSync('.cache/tt-storage', { recursive: true });
        const rollback = `.cache/tt-storage/${bucket}-before.json`;
        if (!fs.existsSync(rollback)) fs.writeFileSync(rollback, JSON.stringify(existing, null, 2));
        await api(`/${bucket}/lifecycle`, 'PUT', { rules: desired });
      }
      const verified = await api(`/${bucket}/lifecycle`);
      const current = verified.rules?.find(rule => rule.id === TT_RETENTION_RULE.id);
      if (!current?.enabled || current.conditions?.prefix !== 'tt/raw/' || current.deleteObjectsTransition?.condition?.maxAge !== 30 * 86400) throw new Error(`TT lifecycle readback failed: ${bucket}`);
      // Provisioning never enables a public endpoint; verify private access remains so.
      const managed = await api(`/${bucket}/domains/managed`);
      const custom = await api(`/${bucket}/domains/custom`);
      if (managed.enabled || custom.domains?.some(domain => domain.enabled)) throw new Error(`TT bucket has public access: ${bucket}`);
      receipt.buckets.push({ bucket, retentionDays: 30, prefix: 'tt/raw/', private: true, unrelatedRulesPreserved: existing.rules.filter(r => r.id !== TT_RETENTION_RULE.id).every(r => verified.rules.some(v => JSON.stringify(v) === JSON.stringify(r))) });
      if (!receipt.buckets.at(-1).unrelatedRulesPreserved) throw new Error('Unrelated lifecycle rule changed');
      console.log(`TT storage verified: ${bucket}, private, 30-day tt/raw/ retention`);
    }
    fs.mkdirSync('.cache/tt-storage', { recursive: true });
    fs.writeFileSync('.cache/tt-storage/latest.json', JSON.stringify(receipt, null, 2) + '\n');
  } catch (error) { console.error(redact(String(error?.message || error))); process.exitCode = 1; }
} else {
  console.log('provision-tt-storage --check | --apply | --self-test');
}
