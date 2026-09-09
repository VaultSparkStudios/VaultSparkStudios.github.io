// Shared, side-effect-free repair invocation planning. Never infer a mutating
// mode from a usage string; use graph metadata or an existing build profile.
import path from 'node:path';
import { DERIVED_BUILD_PROFILES } from './build-order.mjs';
import { findInvocationModeViolations } from './invocation-modes.mjs';

export function repairInvocation(node, { root, profiles = DERIVED_BUILD_PROFILES } = {}) {
  const builder = node.builder;
  if (typeof builder !== 'string' || !/^scripts\/[a-z0-9-]+\.mjs$/i.test(builder)) throw new Error('invalid repair builder path');
  if (node.sideEffecting || /^(deploy|publish|promote|send|notify)-/.test(path.basename(builder))) {
    throw new Error('world-acting builder is not auto-repairable');
  }
  let args = node.builderArgs;
  if (args === undefined) {
    const declared = Object.values(profiles).flat().filter(step => step.script === path.basename(builder) && step.args !== undefined);
    const choices = [...new Set(declared.map(step => JSON.stringify(step.args)))];
    if (choices.length > 1) throw new Error('ambiguous build profile arguments; declare builderArgs');
    args = choices.length ? JSON.parse(choices[0]) : [];
  }
  if (!Array.isArray(args) || args.some(arg => typeof arg !== 'string' || !arg.trim())) throw new Error('builderArgs must be strings');
  // Repair is local derivation. Observation/publishing modes cannot be smuggled
  // in as the recognized argument that satisfies invocation-mode validation.
  if (args.some(arg => /^--(?:live|send|deploy|publish|promote|notify|refresh-art|record|resolve|simulate|self-test|check)(?:=|$)/.test(arg))) {
    throw new Error('non-repair mode refused');
  }
  const errors = findInvocationModeViolations({ root, profiles: { repair: [{ script: path.basename(builder), args }] } });
  if (errors.length) throw new Error(errors.map(error => error.reason).join('; '));
  return [path.join(root, builder), ...args];
}
