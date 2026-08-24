#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { readDecisionsCorpus } from './lib/decisions-corpus.mjs';
import { authorizationGateForTask, evidenceWaitGateForTask, isConsolidatedCarryItem } from './lib/genius-task-classifier.mjs';
import { isSatisfiedPostPushVerify } from './lib/verify-carry-evidence.mjs';
import { CTA_CONTRACTS } from './lib/cta-contract-registry.mjs';

const root = process.cwd();
const outPath = join(root, 'docs', 'GENIUS_LIST.md');
const args = new Set(process.argv.slice(2));

function read(relativePath, fallback = '') {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : fallback;
}

function readJson(relativePath, fallback = {}) {
  try {
    return JSON.parse(read(relativePath, '{}'));
  } catch {
    return fallback;
  }
}

function ctaReadiness(family) {
  const readiness = readJson('.cache/cta-readiness.json', { readiness: {} });
  return readiness.readiness?.[family] || null;
}

function stripMd(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFreshTimestamp(value, maxAgeHours = 36) {
  const ms = Date.parse(value || '');
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms <= maxAgeHours * 60 * 60 * 1000;
}

function hasCurrentForgeDraft() {
  const ledger = readJson('feed/forge-ledger.json', { items: [] });
  const dates = Array.isArray(ledger.items)
    ? ledger.items.map((item) => item.date_published).filter(Boolean).sort()
    : [];
  if (!dates.length) return false;
  const stamp = new Date(dates[dates.length - 1]).toISOString().slice(0, 10);
  const draft = read(`journal/_drafts/forge-week-${stamp}.md`);
  return /founder review required/i.test(draft) && /Voice check before publishing/i.test(draft);
}

// Items that are only meaningful when CI is RED. When CI is all-green these
// become stale carry-forward noise — suppress them so implementation items rise.
function isStaleMonitoringItem(task) {
  return (
    /watch first post-push (lighthouse|playwright|axe|e2e)/i.test(task) ||
    /post-push ci confirmation/i.test(task) ||
    // S80 Lighthouse budget tightening — thresholds raised in S82, already shipped.
    /\[s80\]\[perf\] lighthouse budget tightening/i.test(task) ||
    (/\[sil\]/i.test(task) && /lighthouse budget tightening/i.test(task))
  );
}

function hasDoneEvidence(taskBoard, pattern) {
  return taskBoard
    .split(/\r?\n/)
    .some((line) => /^- \[x\]/i.test(line) && pattern.test(line));
}

function isResolvedCarryForward(task, taskBoard) {
  const lower = task.toLowerCase();

  // Structural, evidence-based resolution for GENERIC post-push CI-verify carries —
  // the committed CI beacon (api/ci-status.json) IS the confirmation those carries ask
  // for. Replaces growing a hand-maintained phrasing pair in resolvedPatterns for every
  // such verify (S283-recovery; the verify analog of D-S281.1 done-detection). Fails
  // safe: absent/red/unknown beacon → not resolved, so the verify stays ranked NOW.
  if (isSatisfiedPostPushVerify(task, readJson('api/ci-status.json'))) return true;

  if (
    lower.includes('cf_worker_api_token') &&
    hasDoneEvidence(taskBoard, /CF_WORKER_API_TOKEN[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    (/annual stripe price|annual stripe checkout routing|annual stripe activation|annual placeholder|yearly price ids/i.test(task)) &&
    hasDoneEvidence(taskBoard, /Annual Stripe prices[\s\S]*DONE|Activate annual checkout[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    /ask ignis.*concierge|claude-powered public chat widget/i.test(task) &&
    hasDoneEvidence(taskBoard, /Ask IGNIS edge function[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    /extend proof\/depth beyond the three core pages/i.test(task) &&
    hasDoneEvidence(taskBoard, /Extend proof\/depth to join\/invite[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    /genius hit list as scheduled audit/i.test(task) &&
    hasDoneEvidence(taskBoard, /Genius Hit List scheduled audit generator[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    /extend gravity onto the \/games\/ and \/universe\/ hubs/i.test(task) &&
    hasDoneEvidence(taskBoard, /Extend gravity onto the `?\/games\/`? and `?\/universe\/`? hubs[\s\S]*DONE/i)
  ) {
    return true;
  }

  if (
    /strip dead intel-\* references in home-intelligence\.js/i.test(task) &&
    hasDoneEvidence(taskBoard, /Strip dead intel-\* refs in home-intelligence\.js[\s\S]*DONE/i)
  ) {
    return true;
  }

  const resolvedPatterns = [
    [/videogame json-ld field completeness|videogame json-ld enrichment cleanup/i, /VideoGame JSON-LD field completeness/i],
    [/unique og cards for duplicated social images/i, /Unique OG cards for duplicated social images/i],
    [/og-coverage observability/i, /OG-coverage observability feed/i],
    [/proof-feed publisher parity/i, /Proof-feed publisher parity/i],
    [/no-og page triage/i, /No-OG page triage/i],
    [/generalize the blockdays trust-ceiling|trust-feed blockdays/i, /Trust-feed blockDays ceiling expanded|Generalize the blockDays trust-ceiling/i],
    [/changelog publish/i, /Changelog public-gap close|DONE-completes the S229 \[PRODUCT\/P1\] Changelog publish carry/i],
    [/workflow cache-dependency lint|cache-dependency lint/i, /Workflow-install lint carry verified existing|cache-install lint is generalized/i],
    [/e2e full verify|verify e2e green|verify lighthouse homepage/i, /CI confirmed ALL GREEN on S232 push|Post-push CI carry RESOLVED|Verify Lighthouse homepage/i],
    [/lighthouse trend auto-update in ci/i, /Lighthouse trend auto-update in CI|commit updated \.cache\/lighthouse-trend\.json/i],
    [/scheduled-workflow staleness beacon/i, /ci-status-beacon `hasDeadCron` dashboard surface|ci-status-beacon\.yml scheduled workflow tracking|check-ci-status-dead-crons\.mjs/i],
    [/sibling CANON-006|velaxis\/syntha\/shadow missing branding/i, /Sibling CANON-006\/stale-carry reconciliation shipped to studio-ops|Ark repo-question cargo/i],
    [/studio-ops: process Ark cargos|01JRK6AH97E0F421A55C54236C|01JRONES0VE96C6C4554516536|01JRONIRFF246105D9994172D4/i, /Sibling CANON-006\/stale-carry reconciliation shipped to studio-ops|Ark repo-question cargo|01JSBCK3UUC2D00FAD6994D009/i],
    [/welcome-back-telemetry|vs_welcome_back_shown/i, /welcome-back-telemetry[\s\S]*welcome-back:shown|already shipped S218/i],
    [/individual game\/project page template improvements|immersive-template upgrade/i, /individual-page visual template pass|applied S215[\s\S]*29 individual game|S215 visual template applied to 29 individual pages/i],
  ];
  for (const [openPattern, donePattern] of resolvedPatterns) {
    if (openPattern.test(task) && hasDoneEvidence(taskBoard, donePattern)) return true;
  }

  if (/lighthouse trend auto-update in ci/i.test(task)) {
    const workflow = read('.github/workflows/lighthouse.yml');
    if (/check-lighthouse-trend\.mjs --update/.test(workflow) && /git commit -m "chore: update lighthouse trend ledger/.test(workflow)) return true;
  }

  if (/confirm lighthouse ci green|verify lighthouse homepage/i.test(task)) {
    const ciStatus = readJson('api/ci-status.json');
    const lighthouse = Array.isArray(ciStatus.workflows)
      ? ciStatus.workflows.find((workflow) => /lighthouse/i.test(workflow.name || ''))
      : null;
    if ((ciStatus.allGreen === true || ciStatus.browserGatesGreen === true) && lighthouse?.status === 'success') return true;
  }

  if (/scheduled-workflow staleness beacon|ci-health-monitor first real run/i.test(task)) {
    const ciStatus = readJson('api/ci-status.json');
    if (Array.isArray(ciStatus.scheduledWorkflows) && typeof ciStatus.hasDeadCron === 'boolean') return true;
  }

  if (/streaming-response double-clone audit/i.test(task)) {
    const workerGate = read('scripts/check-worker-rewriter-safety.mjs');
    if (/scanForMissingGenericHtmlBuffer/.test(workerGate) && /scanForUnsafeHeadHtmlCache/.test(workerGate)) return true;
  }

  if (/re-evaluate play-next rotation/i.test(task)) {
    // S328: this was pinned to the literal '2026-06-18'. The live epoch is
    // '2026-07-02' — and check-play-next-impression-contract.mjs uses
    // '2026-06-18' as its WRONG-epoch negative control, so this suppressor was
    // keyed to the exact value a sibling gate's self-test defines as the failure
    // case. It could never fire. Read the epoch from the shared registry both
    // gates already validate against, so the two cannot drift apart again.
    const epoch = CTA_CONTRACTS.find((c) => c.family === 'play-next')?.epoch || null;
    const funnel = readJson('api/funnel-summary.json');
    const playNext = Array.isArray(funnel.families) ? funnel.families.find((f) => f.family === 'play-next') : null;
    if (epoch && playNext?.since === epoch && Number(playNext?.counts?.shown || 0) === 0) return true;
  }

  if (/Agent can scaffold structure/i.test(task) && hasCurrentForgeDraft()) return true;

  return false;
}

function canonicalTaskKey(task) {
  const lower = task.toLowerCase();

  if (/forge window|studio pulse/.test(lower) && /rename|nav|decision|founder decision|propagat/.test(lower)) {
    return 'forge-window-nav-naming';
  }

  if (/inp root-fix/.test(lower)) {
    return 'inp-root-fix-field-data';
  }

  if (/cloudflare waf|waf js challenge|cn\/ru\/hk/.test(lower)) {
    return 'cloudflare-waf-cn-ru-hk';
  }

  if (/revoke compromised classic pat|github\.com\/settings\/tokens/.test(lower)) {
    return 'revoke-compromised-classic-pat';
  }

  if (/cf_worker_api_token|workers kv storage:edit|zone:workers routes:edit|cloudflare_api_token/.test(lower)) {
    return 'cloudflare-worker-token-scope';
  }

  if (/annual stripe checkout routing|verify annual checkout end-to-end|annual billing toggle/.test(lower)) {
    return 'annual-checkout-route-verification';
  }

  // Normalise consolidated carry-forward items ("X, Y, Z carry") to first subject only
  const stripped = task
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\s+—.*$/, '')
    .replace(/\s*carry\s*$/, '')
    .replace(/,.*$/, '')   // take only first item in a comma-joined list
    .toLowerCase()
    .trim();
  return stripped;
}

// S249 — decided-phantom suppression. Some carries are re-surfaced every session
// because the generator scans TASK_BOARD/PROJECT_STATUS text, blind to a later
// DECISIONS.md entry that REVERSED the premise (e.g. "Forge Window naming
// propagation" — S185 renamed the label to "Studio Pulse"; re-rejected S218/221/222,
// yet it kept burning a top-5 slot). This registry-driven filter is DECISION-BACKED:
// a phantom is honored ONLY WHILE its supersededBy decision id is actually present in
// DECISIONS.md, so the suppressor can never silently bury a live item — reverse the
// decision and the carry automatically returns. Distinct from isResolvedCarryForward
// (which needs a DONE line); a phantom was never done, it was decided moot.
let PHANTOM_REGISTRY = null;
function loadPhantomRegistry() {
  if (PHANTOM_REGISTRY) return PHANTOM_REGISTRY;
  const reg = readJson('context/PHANTOM_CARRIES.json', { phantoms: [] });
  // Decision-backed lookup corpus = live DECISIONS.md + every archived shard, via the
  // shared reader that check-phantom-carries.mjs (the validator) also uses. A phantom
  // whose superseding decision has aged into an archive shard stays honored — without
  // this, it silently goes inert and its rejected item leaks back (the S276 Forge-Window
  // regression). One reader = validator and suppressor can never disagree.
  const decisions = readDecisionsCorpus(root);
  PHANTOM_REGISTRY = (Array.isArray(reg.phantoms) ? reg.phantoms : [])
    // decision-backed guard: drop any entry whose superseding decision is NOT in
    // DECISIONS.md (an inert entry must not suppress anything).
    .filter((p) => p && p.match && p.supersededBy && decisions.includes(p.supersededBy))
    .map((p) => ({
      key: p.key,
      re: new RegExp(p.match, 'i'),
      reqRe: p.requires ? new RegExp(p.requires, 'i') : null,
      supersededBy: p.supersededBy,
    }));
  return PHANTOM_REGISTRY;
}
function isDecidedPhantom(task) {
  if (!task) return false;
  for (const p of loadPhantomRegistry()) {
    if (p.re.test(task) && (!p.reqRe || p.reqRe.test(task))) return true;
  }
  return false;
}

function isWaitingOnCtaSamples(task) {
  if (!/play-next/i.test(task) || !/redesign|conversion|rotation|copy|cta/i.test(task)) return false;
  const playNext = ctaReadiness('play-next');
  return playNext && playNext.ready === false;
}

/**
 * Categories whose rationale template ASSERTS founder authority. Declaring the
 * set once is what keeps the generator honest: previously `rationaleFor` told
 * the reader a BRAND item "requires founder sign-off" while `actionable` was
 * computed from the task text alone, which carried no founder language — so
 * the list simultaneously claimed the item needed sign-off and offered it as
 * unattended work. The gate-integrity check reads task AND rationale, so it
 * caught the contradiction; the fix is to make the two impossible to disagree
 * rather than to soften the check.
 *
 * BRAND genuinely belongs here: it changes public vocabulary and navigation,
 * which AGENTS.md already lists under "escalate before changing".
 */
const FOUNDER_AUTHORITY_CATEGORIES = new Set(['BRAND']);

function gateForTask(task, category = null) {
  const lower = task.toLowerCase();
  const authorizationGate = authorizationGateForTask(task);
  if (authorizationGate) return authorizationGate;
  const evidenceWaitGate = evidenceWaitGateForTask(task);
  if (evidenceWaitGate) return evidenceWaitGate;
  if (category && FOUNDER_AUTHORITY_CATEGORIES.has(category)) {
    return {
      kind: 'founder-gated',
      reason: 'Changes public vocabulary or navigation — requires founder sign-off before user-visible copy changes.',
    };
  }
  if (/\[[^\]]*founder[^\]]*\]|\bfounder\b.*\b(review|call|decision|verify|sign-off|device)\b|\bfounder-device\b/i.test(task)) {
    return {
      kind: 'founder-gated',
      reason: 'Requires founder review, public-safe decision, or real-device confirmation.',
    };
  }
  if (/names for sealed initiatives|sealed project.*public name|public name \+ vault status|investor ai q&a|approved investor docs/i.test(task)) {
    return {
      kind: 'founder-or-content-gated',
      reason: 'Requires a public naming/content decision or approved source documents before implementation.',
    };
  }
  if (/sign in as a member|logged-in member|real browser\/device|real device|web push receipt|notification confirmed received|manual.*submit|email delivery|inbox|\[human action\]|stripe.*portal flow|checkout.*stripe.*portal|annual checkout end-to-end|web push test|web push receipt|notification received/i.test(task)) {
    return {
      kind: 'external-verification-gated',
      reason: 'Requires a live account, real device, inbox receipt, payment-provider flow, or manual external confirmation.',
    };
  }  if (/\bblocked\b|\bcredential\b|\bmissing\b|\bcapability missing\b|\bneeds count access\b|\bprovider\b|\bdashboard\b/i.test(task)) {
    return {
      kind: 'credential-or-provider-gated',
      reason: 'Requires missing credential, provider dashboard data, or an external access path.',
    };
  }
  if (/tt[- ]?enforce|trusted types.*enforce|enforce flip/i.test(task)) {
    const readiness = readJson('api/tt-readiness.json', {});
    if (readiness.status && readiness.enforceEligible !== true) {
      return {
        kind: 'soak-gated',
        reason: `Trusted Types status is ${readiness.status}; ${readiness.nextAction || 'fresh soak evidence is required before enforcement.'}`,
      };
    }
  }
  if (/subscriber_cap|phase 2 when phase 1 fills|subscriber cap|when phase 1 fills/i.test(task)) {
    return {
      kind: 'threshold-gated',
      reason: 'Requires source-of-truth threshold evidence before public phase changes are valid.',
    };
  }  if (/homepage lighthouse.*0\.85|lighthouse.*0\.85|0\.85.*lighthouse|trace-backed performance pass|do not claim.*lighthouse/i.test(lower)) {
    return {
      kind: 'evidence-gated',
      reason: 'Requires a focused trace-backed performance pass before a stricter Lighthouse target can be claimed.',
    };
  }
  if (/inp root-fix|field soak|post-deploy soak|clean field data|true-viewport|sample-gated/i.test(lower)) {
    return {
      kind: 'field-data-gated',
      reason: 'Requires fresh field data or a mature sample window before implementation can be judged.',
    };
  }
  if (/studio-ops|sibling|ark cargo|await owner|cross-repo/i.test(lower)) {
    return {
      kind: 'sibling-owned',
      reason: 'Owned by another repo or already moved through Ark cargo.',
    };
  }
  return null;
}

function openTasks(taskBoard, { ciGreen = false, includeGated = false } = {}) {
  const seen = new Set();
  return taskBoard
    .split(/\r?\n/)
    .filter((line) => /^- \[ \]/.test(line))
    .map((line) => stripMd(line.replace(/^- \[ \]\s*/, '')))
    .filter(Boolean)
    .filter((task) => {
      if (ciGreen && isStaleMonitoringItem(task)) return false;
      if (isResolvedCarryForward(task, taskBoard)) return false;
      if (isDecidedPhantom(task)) return false;
      if (isWaitingOnCtaSamples(task)) return false;
      if (isConsolidatedCarryItem(task)) return false;
      if (!includeGated && gateForTask(task)) return false;
      const key = canonicalTaskKey(task);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function latestIntent(handoff) {
  const match = handoff.match(/^## Session Intent:[\s\S]*?(?=^## Session Intent:|\z)/m);
  return match ? stripMd(match[0]).slice(0, 520).trimEnd() : 'No current session intent found.';
}

function categoryFor(task) {
  const lower = task.toLowerCase();
  // Audit/intelligence first — these mention feature names but are review tasks, not AI tasks
  if (/\baudit\b|cross-page audit|second-pass|genius hit list/.test(lower)) return 'INTELLIGENCE';
  if (/\b(lighthouse|axe|verify|ci|e2e|playwright)\b/.test(lower)) return 'VERIFY';
  if (lower.includes('stripe') || lower.includes('checkout') || lower.includes('annual')) return 'REVENUE';
  if (/\b(security|pat|token|waf)\b/.test(lower)) return 'SECURITY';
  if (lower.includes('social dashboard') || lower.includes('contract') || lower.includes('bridge')) return 'COHESION';
  if (lower.includes('nav') || lower.includes('forge window') || lower.includes('voice')) return 'BRAND';
  // Only classify as AI when the task is about building/fixing AI surfaces, not just mentioning them
  if (/\b(ignis|concierge|oracle)\b/.test(lower) && !/\baudit\b|\bschema\b|\b400\b/.test(lower)) return 'AI';
  if (lower.includes('genius')) return 'INTELLIGENCE';
  return 'PRODUCT';
}

// Extract highest session tag e.g. [S98] → 98, or 0 if none found.
function sessionTagOf(task) {
  const matches = [...task.matchAll(/\[S(\d+)\]/gi)];
  if (!matches.length) return 0;
  return Math.max(...matches.map(m => parseInt(m[1], 10)));
}

// Resolved after status is loaded — see bottom of file where status is read.
let CURRENT_SESSION = 99;

function scoreFor(task, index, category) {
  const lower = task.toLowerCase();

  // Base: start high and decay by position so earlier items have priority
  let score = 96 - index * 3; // 96, 93, 90, 87 … for positions 0–9

  // Category adjustments
  if (category === 'VERIFY') {
    // Reward recency: S98/S99 verify is release-blocking; S93 is stale carry-forward
    const sessionAge = CURRENT_SESSION - sessionTagOf(task);
    if (sessionAge <= 0) score += 4;       // current session — top priority
    else if (sessionAge === 1) score += 2;  // last session
    else if (sessionAge <= 3) score -= 3;   // 2-3 sessions old
    else score -= 10;                       // 4+ sessions stale
  } else if (category === 'REVENUE') {
    score += 8; // Revenue path unblocks real money
  } else if (category === 'SECURITY') {
    score += 6;
  } else if (category === 'AI') {
    score += 4;
  } else if (category === 'COHESION') {
    score += 5;
  } else if (category === 'INTELLIGENCE') {
    score += 3;
  }
  // PRODUCT and BRAND stay at base

  // Penalise items gated on external humans/creds
  if (lower.includes('blocked') || lower.includes('founder action') || lower.includes('har')) score -= 12;
  // [FOUNDER]-tagged tasks need a human at a dashboard — deprioritise unless no other work exists
  if (/\[founder\]/i.test(task)) score -= 8;
  // [SIBLING-REPO] items require work in another repo — not local, lower priority
  if (/\[sibling-repo\]/i.test(task)) score -= 15;

  return Math.max(55, Math.min(100, score));
}

function itemFromTask(task, index) {
  const category = categoryFor(task);
  const rawTitle = task.replace(/^(\[[^\]]+\]\s*)+/, '').split(' — ')[0].trim();
  // Cap title at 72 chars so the hit list stays scannable
  const title = rawTitle.length > 72 ? rawTitle.slice(0, 69) + '…' : rawTitle;
  const score = scoreFor(task, index, category);
  const gate = gateForTask(task, category);
  return {
    category,
    title,
    score,
    task,
    actionable: !gate,
    gate,
    rationale: gate ? gate.reason : rationaleFor(category, task),
    command: gate ? '' : commandFor(category, task),
  };
}

// Extract a short label from the first [...] tag: "[S98][BROWSER-VERIFY]" → "S98 browser-verify"
function tagLabel(task) {
  const tags = [...task.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]);
  return tags.filter(t => !/^S\d+$/i.test(t)).join(' ').toLowerCase() || '';
}

// Extract a clean human-readable subject from the task (after tag blocks and before " — ")
function subjectOf(task) {
  return task
    .replace(/^(\[[^\]]+\]\s*)+/, '')   // strip leading [TAG] blocks
    .split(/\s+—\s+/)[0]               // take before " — "
    .replace(/\s*→.*$/, '')            // drop "→ destination" paths
    .replace(/\bnode\s+\S+\.mjs\b.*$/, '') // strip inline commands
    .replace(/\bnpx\s+.*$/, '')
    .replace(/\bnpm\s+.*$/, '')
    .trim()
    .slice(0, 70);
}

function rationaleFor(category, task) {
  const subject = subjectOf(task);
  const sessionAge = CURRENT_SESSION - sessionTagOf(task);
  const tag = tagLabel(task);

  if (category === 'VERIFY') {
    if (sessionAge <= 1) return `${subject} shipped last session — confirm it works in production before piling new work on top.`;
    if (sessionAge <= 3) return `${subject} was flagged ${sessionAge} sessions ago; each session it stays unverified it risks hiding a regression.`;
    return `${subject} is a ${sessionAge}-session-old carry-forward; verify or close it so it stops polluting the hit list.`;
  }
  if (category === 'SECURITY') return `${subject} lowers operational risk and is entirely local — no external dependencies block it.`;
  if (category === 'REVENUE') return `${subject} is on the direct checkout path; unblocking it can activate income without building new features.`;
  if (category === 'COHESION') return `${subject} is a cross-surface bridge — one implementation improves Website, Studio Hub, and Social Dashboard simultaneously.`;
  // Task-derived BRAND items are founder-gated above and render gate.reason,
  // so this branch only serves callers that supply their own gate decision.
  // It must NOT assert a founder requirement, or it would re-create the
  // actionable-yet-gated contradiction this file was fixed for.
  if (category === 'BRAND') return `${subject} affects public vocabulary and navigation across generated copy and shared surfaces.`;
  if (category === 'AI') return `${subject} must stay grounded in public intelligence contracts — verify the Vault Oracle boundary is intact.`;
  if (category === 'INTELLIGENCE') return `${subject} keeps the ranked audit current so later sessions don't iterate on stale signal.`;
  return `${subject} is open, local, and unblocked — can ship this session.`;
}

function commandFor(category, task) {
  const lower = task.toLowerCase();
  if (category === 'VERIFY') {
    // CI/automated verify → run the check suite
    if (/lighthouse|axe|ci|e2e|playwright|build.check|smoke/.test(lower)) {
      return 'npm run build:check && node scripts/csp-audit.mjs';
    }
    // Browser-manual verify → open local preview
    if (/browser.verif|open.*browser|confirm.*browser|in.browser/.test(lower)) {
      return 'npx serve . -p 3000  # then open http://localhost:3000';
    }
    return 'npm run build:check';
  }
  if (category === 'INTELLIGENCE') return 'node scripts/generate-genius-list.mjs';
  if (category === 'COHESION') return 'node scripts/generate-public-intelligence.mjs';
  if (category === 'SECURITY') return 'node scripts/lint-repo.mjs';
  if (category === 'AI') return 'node scripts/generate-public-intelligence.mjs';
  return '';
}

// Structural suppression: skip a default injection if TASK_BOARD shows a
// recently-closed DONE entry matching the title. Prevents the generator from
// re-surfacing items that have already been shipped (Forge Window naming,
// Post-push CI confirmation, etc.) — the class of staleness that kept
// polluting the hit list across S105/S107/S109.
function isRecentlyDone(title, taskBoard, currentSession, windowSessions = 3) {
  if (!taskBoard || !title) return false;
  const minSession = Math.max(0, (currentSession || 0) - windowSessions);
  const titleLower = title.toLowerCase();
  for (const line of taskBoard.split(/\r?\n/)) {
    if (!/^- \[x\]/i.test(line)) continue;
    if (!/\*\*DONE\b/i.test(line) && !/\bDONE\s+S\d+/i.test(line)) continue;
    // Extract highest session tag referenced in the line; require it to be
    // within the freshness window so ancient closures don't suppress live work.
    const sessionMatches = [...line.matchAll(/\bS(\d+)\b/gi)].map(m => parseInt(m[1], 10));
    const latestSession = sessionMatches.length ? Math.max(...sessionMatches) : 0;
    if (latestSession < minSession) continue;
    if (line.toLowerCase().includes(titleLower)) return true;
  }

  return false;
}

function ensureMinimum(items, { ciGreen = false, taskBoard = '', currentSession = 0 } = {}) {
  const defaults = [
    // Only surface CI confirmation default when CI is not confirmed green.
    // When ciHealth.allGreen is true this item is stale and buries real work.
    ...(!ciGreen ? [{
      category: 'VERIFY',
      title: 'Post-push CI confirmation',
      score: 96,
      task: 'Confirm Lighthouse, Accessibility, and E2E after the local-preview CI recovery lands.',
      rationale: 'The current implementation is only complete once the remote browser gates prove the runner is auditing the real artifact.',
      command: 'gh run list --limit 10',
    }] : []),
    {
      category: 'COHESION',
      title: 'Social Dashboard bidirectional mirror',
      score: 91,
      task: 'Expose normalized public activity in Social Dashboard and pull it back into website public intelligence.',
      rationale: 'This is the next cross-surface bridge after the website contract work.',
      command: '',
    },
    {
      category: 'BRAND',
      title: 'Forge Window naming propagation',
      score: 86,
      task: 'Finish propagating Forge Window language across generated copy and shared surfaces while preserving /studio-pulse/ for SEO.',
      rationale: 'The URL stays stable for search, but the public vocabulary should stay coherent everywhere visitors see it.',
      command: 'node scripts/propagate-nav.mjs',
    },
  ];

  for (const item of defaults) {
    const alreadyPresent = items.some((existing) => existing.title.toLowerCase() === item.title.toLowerCase());
    if (alreadyPresent) continue;
    if (isRecentlyDone(item.title, taskBoard, currentSession)) continue;
    // S249 — decision-backed phantom suppression replaces the brittle TASK_BOARD
    // string-match that used to guard the Forge Window default (it depended on a
    // specific phrase being present, so the phantom leaked to #3 when it wasn't).
    // Now a default injection is dropped iff a DECISIONS-backed phantom matches it.
    if (isDecidedPhantom(`${item.title} ${item.task}`)) continue;
    items.push(item);
  }
  return items;
}

function section(title, items) {
  if (!items.length) return '';
  return `### ${title}\n\n` + items.map((item, index) => {
    return [
      `#### ${index + 1}. [${item.category}] ${item.title}`,
      `Final score: **${item.score}**`,
      '',
      item.task,
      '',
      `Why it matters: ${item.rationale}`,
      item.command ? `\nFirst command: \`${item.command}\`` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n') + '\n';
}

const status = readJson('context/PROJECT_STATUS.json');
CURRENT_SESSION = status.currentSession || 99;
const intelligence = readJson('api/public-intelligence.json');
const ciStatus = readJson('api/ci-status.json');
const browserProofGreen = isFreshTimestamp(ciStatus.generatedAt)
  ? (ciStatus.browserGatesGreen === true && Boolean(ciStatus.verifiedBrowserHeadSha))
  : intelligence.ciHealth?.allGreen === true;
const ciGreen = isFreshTimestamp(ciStatus.generatedAt) ? (ciStatus.allGreen === true || (ciStatus.browserGatesGreen === true && ciStatus.terminalState === 'known_blocked')) : intelligence.ciHealth?.allGreen === true;
const ciHealthLabel = isFreshTimestamp(ciStatus.generatedAt)
  ? (ciStatus.allGreen === true
    ? 'all-green ✓'
    : (ciStatus.browserGatesGreen === true && ciStatus.terminalState === 'known_blocked'
      ? 'browser gates green ✓ · Worker known-blocked'
      : 'check gh run list'))
  : (intelligence.ciHealth?.allGreen === true ? 'all-green ✓' : 'check gh run list');
const taskBoard = read('context/TASK_BOARD.md');
const handoff = read('context/LATEST_HANDOFF.md');
const tasks = openTasks(taskBoard, { ciGreen: browserProofGreen });
const gatedTasks = openTasks(taskBoard, { ciGreen, includeGated: true })
  .filter((task) => gateForTask(task))
  .map((task, index) => itemFromTask(task, index))
  .sort((a, b) => b.score - a.score)
  .slice(0, 8);

const items = ensureMinimum(tasks.map(itemFromTask), { ciGreen: browserProofGreen, taskBoard, currentSession: CURRENT_SESSION })
  .map((item) => {
    if (item.actionable !== undefined) return item;
    const gate = gateForTask(item.task || `${item.title} ${item.rationale || ''}`);
    return {
      ...item,
      actionable: !gate,
      gate,
      rationale: gate ? gate.reason : item.rationale,
      command: gate ? '' : item.command,
    };
  })
  .filter((item) => item.actionable !== false)
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

const now = items.slice(0, 4);
const next = items.slice(4, 9);
const later = items.slice(9);
const avg = items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0;
const silMax = status.silMax || status.silMaxScore || 1000;

const body = `# Genius Hit List — Session ${status.currentSession || 'Current'}\n\n` +
`Generated: ${new Date().toISOString().slice(0, 10)}\n` +
`Project: \`${status.name || 'VaultSparkStudios.github.io'}\`\n` +
`Source: deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md\n\n` +
`## Score Summary\n\n` +
`- Overall opportunity pressure: **${avg}/100**\n` +
`- Health: **${status.health || 'unknown'}**\n` +
`- Current SIL: **${status.silScore || 'unknown'}/${silMax}**\n` +
`- CI health: **${ciGreen ? 'all-green ✓' : 'check gh run list'}**\n` +
`- Current focus: ${status.currentFocus || 'Not recorded.'}\n\n` +
`## Strategic Read\n\n` +
`${latestIntent(handoff)}\n\n` +
`The strongest near-term leverage is release confidence first, then cross-surface cohesion. Founder, credential, sibling-owned, and field-soak items stay visible in the deferred ledger, but they are not ranked as local implementation work until their gate clears.\n\n` +
`## Ranked Hit List\n\n` +
section('NOW', now) + '\n' +
section('NEXT', next) + '\n' +
section('LATER', later) + '\n' +
section('DEFERRED / GATED', gatedTasks) + '\n' +
`## Recommended Build Order\n\n` +
items.map((item, index) => `${index + 1}. ${item.title}`).join('\n') +
(!items.length ? 'No currently unblocked local implementation items. Work should move to second-order innovation or closeout verification.\n' : '') +
`\n\n## Best Immediate Move\n\n` +
(items.length
  ? (ciGreen
    ? `Release browser gates are green. Focus on the top unblocked implementation item above, then rerun this generator after shipping.\n`
    : `Finish the top VERIFY item first, then rerun this generator so the list reflects the newly cleared gate.\n`)
  : `Primary list is gated or exhausted. Generate a second-order innovation candidate from the deferred ledger or proceed to closeout verification; do not force-ship gated work.\n`);
writeFileSync(outPath, body, 'utf8');
if (args.has('--brief')) {
  // Output a box-drawing block for embedding in STARTUP_BRIEF.md via render-startup-brief.mjs.
  const W = 62;
  const pad = (s) => s.padEnd(W);
  const top = (t) => `╔══ ${t} ${'═'.repeat(Math.max(0, W - t.length - 1))}╗`;
  const bot = () => `╚${'═'.repeat(W + 2)}╝`;
  const row = (s) => `║  ${pad(s.slice(0, W))}  ║`;
  const blank = () => row('');
  const lines = [top('GENIUS HIT LIST')];
  for (const item of items.slice(0, 5)) {
    const score = String(item.score).padStart(3);
    const cat = `[${item.category}]`.padEnd(13);
    lines.push(row(`${score}  ${cat}  ${item.title.slice(0, W - 20)}`));
    const why = item.rationale ? item.rationale.slice(0, W - 4) : '';
    if (why) lines.push(row(`      ${why}`));
    lines.push(blank());
  }
  lines.push(bot());
  console.log(lines.join('\n'));
} else if (args.has('--json')) {
  console.log(JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    project: status.name || 'VaultSparkStudios.github.io',
    source: 'deterministic repo-truth scan of PROJECT_STATUS.json, TASK_BOARD.md, and LATEST_HANDOFF.md',
    ignisSource: 'fallback',
    scoreSummary: {
      overallOpportunityPressure: avg,
      health: status.health || 'unknown',
      silScore: status.silScore || null,
      silMax,
      ciHealth: ciHealthLabel
    },
    items,
    gated: gatedTasks
  }, null, 2));
} else {
  console.log(`Wrote ${outPath}`);
}

