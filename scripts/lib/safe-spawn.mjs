// safe-spawn.mjs — S187 (founder-flagged window-storm + Defender SuspExec.SE root-fix)
//
// Drop-in hardened replacement for `node:child_process`. Every studio script imports
// its spawn family from HERE instead of 'child_process', so EVERY spawn sets
// `windowsHide: true` by construction — no call-site can forget it.
//
// WHY THIS EXISTS (observed live, S186 + S187):
//   On Windows a Node child_process spawn pops a VISIBLE Git Bash / mingw console
//   window per call unless windowsHide:true is set. Hot-path spawners — run-doctor.mjs
//   (~90 probe children), run-tests.mjs (~190) — therefore (a) flood the screen with
//   focus-stealing windows that make the machine unusable, and (b) trip Windows
//   Defender's behavioral heuristic `Trojan:Win32/SuspExec.SE` (rapid mass shell
//   execution looks like malware). Both symptoms share ONE root cause: a burst of
//   un-hidden child spawns. Hiding every window (CREATE_NO_WINDOW via windowsHide)
//   removes the visible storm; routing every spawn through one wrapper makes the
//   guarantee total and lint-enforceable.
//
//   S186's earlier guard keyed on `shell: true` only — but plain `spawn(node, [...])`
//   with no shell storms identically. The correct, broader rule is: EVERY spawn sets
//   windowsHide:true. This module is that rule, mechanized.
//
// Usage — identical to child_process:
//   import { spawnSync, execSync } from '<rel>/lib/safe-spawn.mjs';
// Enforced by scripts/check-windows-hide.mjs (no direct child_process import outside
// this wrapper) and propagated studio-wide (CANON-016).

import * as cp from 'node:child_process';
import { promisify } from 'node:util';

const WIN = process.platform === 'win32';
// Windows: npm-family CLIs ship as .cmd shims. A no-shell spawn('npm', …) throws ENOENT
// because CreateProcess cannot execute a .cmd directly — the documented fix is shell:true
// (the shell resolves npm→npm.cmd). Scoped to a KNOWN tool set, not blanket shell:true, so
// we never widen shell-injection surface for arbitrary commands; windowsHide:true is still
// forced, so the shell runs hidden (no window-storm regression). Verified live S218:
// release-confidence.mjs crashed `spawn npm ENOENT` before this. A command with an explicit
// path separator or extension is trusted as-is (caller knows the exact target).
const WIN_CMD_TOOLS = new Set(['npm', 'npx', 'yarn', 'pnpm', 'corepack']);
function needsWinShell(args) {
  if (!WIN || !args.length || typeof args[0] !== 'string') return false;
  const cmd = args[0];
  if (/[\\/]/.test(cmd) || /\.[a-z0-9]+$/i.test(cmd)) return false;
  return WIN_CMD_TOOLS.has(cmd.toLowerCase());
}

// Merge spawn-family defaults into a call's options, matching every signature:
//   fn(cmd) · fn(cmd,args) · fn(cmd,opts) · fn(cmd,args,opts) · fn(cmd,cb) · fn(cmd,opts,cb)
// Locate the options object (last plain-object arg, not Array/Buffer/TypedArray/function);
// fill each default only when the caller left it unset (explicit choices are respected).
// windowsHide is always defaulted true; shell is added only for npm-family tools on Windows.
// If no options object exists, insert one before a trailing callback, else append.
function harden(args) {
  const defaults = needsWinShell(args) ? { windowsHide: true, shell: true } : { windowsHide: true };
  const a = args.slice();
  let optIdx = -1;
  for (let i = a.length - 1; i >= 0; i--) {
    const v = a[i];
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !Buffer.isBuffer(v) &&
      !ArrayBuffer.isView(v)
    ) { optIdx = i; break; }
  }
  if (optIdx >= 0) {
    const merged = { ...a[optIdx] };
    for (const [k, v] of Object.entries(defaults)) if (merged[k] === undefined) merged[k] = v;
    a[optIdx] = merged;
    return a;
  }
  if (a.length && typeof a[a.length - 1] === 'function') {
    a.splice(a.length - 1, 0, { ...defaults });
  } else {
    a.push({ ...defaults });
  }
  return a;
}

export function spawn(...args) { return cp.spawn(...harden(args)); }
export function spawnSync(...args) { return cp.spawnSync(...harden(args)); }
export function exec(...args) { return cp.exec(...harden(args)); }
export function execSync(...args) { return cp.execSync(...harden(args)); }
export function execFile(...args) { return cp.execFile(...harden(args)); }
export function execFileSync(...args) { return cp.execFileSync(...harden(args)); }
export function fork(...args) { return cp.fork(...harden(args)); }

// Preserve the util.promisify contract that native cp.exec / cp.execFile carry.
// Native exec/execFile expose a `util.promisify.custom` implementation that resolves
// to { stdout, stderr }. A plain wrapper function does NOT inherit that symbol, so
// `promisify(exec)` would fall back to generic behavior and resolve the bare stdout
// STRING instead — making `const { stdout } = await execAsync(...)` undefined and
// crashing every caller (S188 regression: the S187 codemod rewired all child_process
// imports HERE, silently breaking batch-push.mjs + check-registry-drift.mjs). Re-attach
// the custom symbol, still hardened (windowsHide via harden), so promisify(exec) behaves
// byte-identically to native.
const _execP = promisify(cp.exec);
const _execFileP = promisify(cp.execFile);
exec[promisify.custom] = (...args) => _execP(...harden(args));
execFile[promisify.custom] = (...args) => _execFileP(...harden(args));

// Pass through anything else child_process exports (ChildProcess, constants, etc.).
export const { ChildProcess } = cp;

export default { spawn, spawnSync, exec, execSync, execFile, execFileSync, fork, ChildProcess };
