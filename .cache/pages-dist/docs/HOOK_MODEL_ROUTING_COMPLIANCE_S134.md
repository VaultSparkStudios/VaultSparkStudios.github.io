# Hook + Model Routing Compliance — S134

Generated: 2026-05-17 · session 134
Source: `docs/LATEST_AI_TOOLING_S134.md` items #2 (Sonnet 4.6 default) + #7 (hook standardization)

---

## Hook standardization (item #7)

Canonical Claude Code hook names (Anthropic, May 2026):

| Hook | Purpose | Status in this repo |
|---|---|---|
| `PreToolUse` | Validate/transform/block before tool call | ⚪ unused (founder-twin wired at user-level, not repo-level) |
| `PostToolUse` | Run after a tool call | ✅ wired — JSON validator on `Write` |
| `Stop` | End-of-session cleanup | ✅ wired — clears session lock, stamps PROJECT_STATUS.lastUpdated |
| `SessionStart` | Init on session start | ⚪ handled by `/start` skill, not hook |
| `SessionEnd` | Symmetric with SessionStart | ⚪ handled by `/closeout` skill |
| `UserPromptSubmit` | Mutate prompt before send | ⚪ unused |

**Verdict: compliant.** This repo's `.claude/settings.json` uses canonical hook names. The Stop + PostToolUse hooks are minimal-side-effect (clear lock, stamp date, validate JSON).

**Recommendation:** keep current minimal hook surface. Adding more hooks here would conflict with the user-level founder-twin hook chain. Hook-level cross-repo orchestration belongs in `~/.claude/settings.json`, not project `.claude/settings.json`.

### Hook contents

`.claude/settings.json`:

```jsonc
{
  "hooks": {
    "Stop": [
      {
        "hooks": [{
          "type": "command",
          "command": "bash -c '[ -f context/.session-lock ] && rm context/.session-lock && echo \"[hook] Session lock cleared\" || true; ...'"
        }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [{
          "type": "command",
          "command": "python3 -c \"...JSON validation...\" 2>/dev/null || true"
        }]
      }
    ]
  },
  "model": "opus"
}
```

---

## Model routing (item #2)

Per S134 research, **Claude Sonnet 4.6** becomes the recommended default for code-that-ships work.

### This repo's tier

- **Canonical tier:** `T3_opus` (per `vaultspark-studio-ops/portfolio/MODEL_ROUTING.json`)
- **Reason:** website is the brand anchor + customer-facing surface; high-context shipping work; Opus 4.7 is correct.
- **Action this session:** none. `T3_opus` stays.

### Studio-wide default tier (T2)

- **Recommendation #2 target:** `T2_sonnet` should flip to **Sonnet 4.6** in `vaultspark-studio-ops/portfolio/MODEL_ROUTING.json`.
- **Studio-ops repo is currently session-locked by Codex** (since 22:44 UTC S134). Cannot write.
- **Drop-in change for next studio-ops session:**

  ```diff
  // vaultspark-studio-ops/portfolio/MODEL_ROUTING.json
  - "T2_sonnet": { "model": "claude-sonnet-4-5-20250929" }
  + "T2_sonnet": { "model": "claude-sonnet-4-6-20251001" }
  ```

  Then run `node scripts/apply-model-routing.mjs --write` from any repo on its next /start so settings propagate.

### Per-repo opt-outs

Repos that should NOT auto-upgrade to Sonnet 4.6:
- None identified. Sonnet 4.6 is strict-superset capable per the +10 bug-finding lift over 4.5.

---

## What landed in this repo this session

| Item | File | Status |
|---|---|---|
| Vision truth-audit pipeline (item #1) | `scripts/vision-truth-audit.mjs` + `docs/VISION_AUDIT_S134.md` | ✅ shipped |
| Project-scoped /audit skill (item #4) | `.claude/skills/audit/SKILL.md` | ✅ shipped |
| Project-scoped /implement skill (item #4) | `.claude/skills/implement/SKILL.md` | ✅ shipped |
| Hook + model routing compliance doc (item #7) | this file | ✅ shipped |
| Ecosystem Velocity chart (post-session founder ask) | `oracle/index.html` + `scripts/build-ecosystem-velocity.mjs` + `ignis/output/ecosystem-velocity.json` | ✅ shipped |
| Sonnet 4.6 routing flip (item #2) | studio-ops MODEL_ROUTING.json | ⏳ deferred — locked repo |
| Managed-Agents for Oracle backend (item #3) | per ORACLE_SPEC.md | ⏳ deferred — locked repo |
| Codex Mobile parity (item #5) | env / GitHub config | ⏳ deferred — out of scope for website |
| Codex Windows sandbox (item #6) | dev-env config | ⏳ deferred — out of scope for website |
| Cross-rater for /ultrareview (item #8) | studio-ops + Claude Code config | ⏳ deferred — out of scope for website |

---

## Net spend this session

- $0 Anthropic API spend (all vision analysis routed through founder's Max plan via session agent)
- $0 OpenAI / GPT-5.5 spend
- $0 Codex spend

The Max-plan-first execution pattern from the founder's S134 directive held throughout.
