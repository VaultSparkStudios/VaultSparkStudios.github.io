/**
 * Website-local Studio OS command registry.
 *
 * This repo installs the runtime commands required by SESSION_PROTOCOL.md for
 * /start, /go preflight, and /closeout. Portfolio-wide Studio Ops commands stay
 * in vaultspark-studio-ops and are intentionally not advertised here.
 */

export const COMMANDS = {
  'session-mode': {
    script: 'detect-session-mode.mjs',
    desc: 'Classify current session as BUILDER or FOUNDER mode',
    args: '[--json] [--explain]',
    category: 'Session',
  },
  'fast-start': {
    script: 'render-fast-start.mjs',
    desc: 'Token-light startup surface',
    args: '[--json] [--stdout]',
    category: 'Session',
  },
  'startup-brief': {
    script: 'render-startup-brief.mjs',
    desc: 'Render docs/STARTUP_BRIEF.md',
    args: '[--stdout]',
    category: 'Session',
  },
  'context-meter': {
    script: 'context-meter.mjs',
    desc: 'Estimate current context pressure',
    args: '[--json]',
    category: 'Session',
  },
  'genius-list': {
    script: 'generate-genius-list.mjs',
    desc: 'Generate this repo Genius Hit List',
    args: '[--json] [--brief] [--top N]',
    category: 'Session',
  },
  'cache-genius-list': {
    script: 'cache-genius-list.mjs',
    desc: 'Refresh or check cached Genius List state',
    args: '[--check] [--write]',
    category: 'Session',
  },
  'preload': {
    script: 'preload-taskboard.mjs',
    desc: 'Pre-load session priorities from local truth files',
    category: 'Session',
  },
  'action-queue': {
    script: 'render-action-queue.mjs',
    desc: 'Render execution-first action queue',
    category: 'Session',
  },
  'closeout': {
    script: 'closeout-autopilot.mjs',
    desc: 'Closeout autopilot with human confirmation',
    args: '[--dry-run] [--skip-push] [--message <msg>]',
    category: 'Closeout',
  },
  'closeout-summary': {
    script: 'closeout-summary.mjs',
    desc: 'Deterministic closeout ledger',
    args: '[--json] [--project <path>] [--pushed yes|no|dry-run]',
    category: 'Closeout',
  },
  'doctor': {
    script: 'run-doctor.mjs',
    desc: 'Studio OS health check',
    args: '[--json] [--update-json] [--fix] [--loop]',
    category: 'Closeout',
  },
  'state-vector': {
    script: 'render-state-vector.mjs',
    desc: 'Render local state vector snapshot',
    category: 'Closeout',
  },
  'entropy': {
    script: 'compute-entropy.mjs',
    desc: 'Compute protocol entropy score',
    args: '[--json] [--update]',
    category: 'Closeout',
  },
  'genome-snapshot': {
    script: 'append-genome-snapshot.mjs',
    desc: 'Append protocol genome snapshot',
    category: 'Closeout',
  },
  'scan-secrets': {
    script: 'scan-secrets.mjs',
    desc: 'Pre-commit/pre-push secret scanner',
    args: '[--staged] [--all] [<path>] [--json]',
    category: 'Security',
  },
  'check-secrets': {
    script: 'check-secrets.mjs',
    desc: 'Capability readiness audit',
    args: '[--for <capability>] [--audit] [--json]',
    category: 'Security',
  },
  'blocker-preflight': {
    script: 'blocker-preflight.mjs',
    desc: 'Classify human-blocked items before escalation',
    args: '[--json]',
    category: 'Security',
  },
  'sanitize-settings': {
    script: 'sanitize-claude-settings.mjs',
    desc: 'Redact risky Claude settings entries',
    args: '[--check] [--path <file>] [--json]',
    category: 'Security',
  },
  'onboard': {
    script: 'ops-onboard.mjs',
    desc: 'Repair/adopt local Studio OS project files',
    args: '[--repair] [--target-path <path>]',
    category: 'Maintenance',
  },
  'runtime-pack': {
    script: 'runtime-pack.mjs',
    desc: 'Generate runtime-pack outputs for this project',
    args: '[--write] [--json]',
    category: 'Maintenance',
  },
  'emit-event': {
    script: 'emit-studio-event.mjs',
    desc: 'Append Studio OS event where event bus exists',
    args: '--type <type> --slug <slug>',
    category: 'Maintenance',
  },
};

export const CATEGORIES = Array.from(new Set(Object.values(COMMANDS).map(spec => spec.category)));

export function byCategory() {
  const out = {};
  for (const cat of CATEGORIES) out[cat] = {};
  for (const [name, spec] of Object.entries(COMMANDS)) {
    out[spec.category][name] = spec;
  }
  return out;
}

export function helpText() {
  const lines = ['Studio Ops — canonical command engine'];
  lines.push('');
  const grouped = byCategory();
  for (const cat of CATEGORIES) {
    const cmds = Object.keys(grouped[cat]).sort();
    if (!cmds.length) continue;
    lines.push(`  ── ${cat} ─────────────────────────────────────────────────────`);
    for (const name of cmds) {
      const spec = grouped[cat][name];
      lines.push(`    ${name.padEnd(22)} ${spec.desc}`);
      if (spec.args) lines.push(`    ${' '.repeat(22)}   ${spec.args}`);
    }
    lines.push('');
  }
  lines.push(`Total: ${Object.keys(COMMANDS).length} commands across ${CATEGORIES.length} categories.`);
  return lines.join('\n');
}

export default { COMMANDS, CATEGORIES, byCategory, helpText };
