function parseCheckboxItems(markdown = "") {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s*\[\s\]\s+/.test(line))
    .map((line) => line.replace(/^\s*-\s*\[\s\]\s+/, "").trim())
    .filter(Boolean);
}

function parseHumanActionItems(taskBoard = "") {
  const section = taskBoard.match(/##\s*[^\n]*Human Action Required[\s\S]*?(?=\n##\s+|$)/i);
  return parseCheckboxItems(section?.[0] || "");
}

function parseIntentDeclared(latestHandoff = "") {
  const match = latestHandoff.match(/Session Intent:\s*(.+)/i);
  if (!match) return true;
  return !/none declared/i.test(match[1]);
}

function parseTruthAudit(truthAudit = "") {
  const status = truthAudit.match(/^Overall status:\s*(.+)$/m)?.[1]?.trim() || null;
  const lastReviewed = truthAudit.match(/^Last reviewed:\s*(.+)$/m)?.[1]?.trim() || null;
  const contradictionsSection = truthAudit.match(/## Contradictions\s+([\s\S]*?)(?=\n##\s+|$)/i);
  const contradictions = (contradictionsSection?.[1] || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);

  return { status, lastReviewed, contradictions };
}

export function auditProjectTruth(project, context = {}, options = {}) {
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const findings = [];
  const statusJson = context.statusJson || null;
  const taskBoard = context.taskBoard || "";
  const latestHandoff = context.latestHandoff || "";
  const currentState = context.currentState || "";
  const truthAudit = parseTruthAudit(context.truthAudit || "");

  if (!statusJson) {
    findings.push({ severity: "high", code: "missing_status_json", message: "PROJECT_STATUS.json is missing or unreadable." });
  } else {
    if (!statusJson.currentFocus) {
      findings.push({ severity: "medium", code: "missing_current_focus", message: "PROJECT_STATUS.json is missing currentFocus." });
    }
    if (!statusJson.nextMilestone) {
      findings.push({ severity: "medium", code: "missing_next_milestone", message: "PROJECT_STATUS.json is missing nextMilestone." });
    }
    if (!statusJson.lastUpdated) {
      findings.push({ severity: "medium", code: "missing_last_updated", message: "PROJECT_STATUS.json is missing lastUpdated." });
    } else {
      const updated = new Date(statusJson.lastUpdated);
      const daysOld = Math.floor((referenceDate.getTime() - updated.getTime()) / 86400000);
      if (Number.isFinite(daysOld) && daysOld > 21) {
        findings.push({ severity: "high", code: "stale_status", message: `PROJECT_STATUS.json lastUpdated is stale (${daysOld}d old).` });
      } else if (Number.isFinite(daysOld) && daysOld > 7) {
        findings.push({ severity: "medium", code: "aging_status", message: `PROJECT_STATUS.json lastUpdated is aging (${daysOld}d old).` });
      }
    }
    if (!statusJson.truthAuditStatus) {
      findings.push({ severity: "medium", code: "missing_truth_status", message: "PROJECT_STATUS.json is missing truthAuditStatus." });
    }
    if (!statusJson.truthAuditLastRun) {
      findings.push({ severity: "medium", code: "missing_truth_last_run", message: "PROJECT_STATUS.json is missing truthAuditLastRun." });
    }
    if (statusJson.truthAuditStatus && truthAudit.status && statusJson.truthAuditStatus !== truthAudit.status) {
      findings.push({
        severity: "medium",
        code: "truth_status_mismatch",
        message: `PROJECT_STATUS.json says truth audit is ${statusJson.truthAuditStatus}, but TRUTH_AUDIT.md says ${truthAudit.status}.`,
      });
    }
  }

  if (!latestHandoff.trim()) {
    findings.push({ severity: "medium", code: "missing_latest_handoff", message: "LATEST_HANDOFF.md is missing or unreadable." });
  } else if (!parseIntentDeclared(latestHandoff)) {
    findings.push({ severity: "low", code: "missing_session_intent", message: "Latest handoff says no session intent was declared." });
  }

  if (!taskBoard.trim()) {
    findings.push({ severity: "medium", code: "missing_task_board", message: "TASK_BOARD.md is missing or unreadable." });
  }

  if (!context.truthAudit?.trim()) {
    findings.push({ severity: "medium", code: "missing_truth_audit", message: "TRUTH_AUDIT.md is missing or unreadable." });
  } else {
    if (!truthAudit.status) {
      findings.push({ severity: "medium", code: "missing_truth_status_line", message: "TRUTH_AUDIT.md is missing an Overall status line." });
    }
    if (!truthAudit.lastReviewed) {
      findings.push({ severity: "medium", code: "missing_truth_review_date", message: "TRUTH_AUDIT.md is missing a Last reviewed date." });
    }
    if (truthAudit.contradictions.length > 0) {
      findings.push({
        severity: truthAudit.status === "red" ? "high" : "medium",
        code: "open_contradictions",
        message: `TRUTH_AUDIT.md lists ${truthAudit.contradictions.length} open contradiction(s).`,
      });
    }
  }

  const humanActionItems = parseHumanActionItems(taskBoard);
  if (statusJson && Array.isArray(statusJson.blockers) && statusJson.blockers.length === 0 && humanActionItems.length > 0) {
    findings.push({
      severity: "medium",
      code: "blockers_underreported",
      message: `PROJECT_STATUS.json lists no blockers, but TASK_BOARD has ${humanActionItems.length} human-action item(s).`,
    });
  }
  const severityRank = { low: 1, medium: 2, high: 3 };
  findings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || a.code.localeCompare(b.code));

  const score = Math.max(0, 100 - findings.reduce((sum, finding) => {
    if (finding.severity === "high") return sum + 25;
    if (finding.severity === "medium") return sum + 10;
    return sum + 4;
  }, 0));

  return {
    projectId: project?.id || null,
    score,
    findings,
    stats: {
      humanActionItems: humanActionItems.length,
      openTaskCount: parseCheckboxItems(taskBoard).length,
      hasStatusJson: !!statusJson,
      hasLatestHandoff: !!latestHandoff.trim(),
      hasTaskBoard: !!taskBoard.trim(),
      truthStatus: truthAudit.status || statusJson?.truthAuditStatus || "unknown",
      truthAuditLastRun: truthAudit.lastReviewed || statusJson?.truthAuditLastRun || null,
      contradictionCount: truthAudit.contradictions.length,
      contradictions: truthAudit.contradictions,
    },
  };
}

export function getTruthAuditTone(score) {
  if (score >= 90) return { label: "Aligned", color: "var(--green)" };
  if (score >= 70) return { label: "Watch", color: "var(--gold)" };
  return { label: "Drift", color: "var(--red)" };
}

// ── Self-healing Protocol Genome ─────────────────────────────────────────────
// Auto-computes the 5-dimension genome score (0–25) from actual file state
// instead of relying on a manually maintained scaffold.

function scoreDimension(checks) {
  // Each dimension is 0–5. checks is an array of booleans.
  if (!checks.length) return 0;
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 5);
}

/**
 * Computes the Protocol Genome score from live file state.
 * @param {object} context — same shape as auditProjectTruth context
 * @param {object} statusJson — parsed PROJECT_STATUS.json
 * @param {object} options — { referenceDate }
 * @returns {{ total: number, dimensions: object[] }}
 */
export function computeProtocolGenome(context = {}, statusJson = null, options = {}) {
  const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const truthAudit = context.truthAudit || "";
  const latestHandoff = context.latestHandoff || "";
  const taskBoard = context.taskBoard || "";
  const currentState = context.currentState || "";
  const silContent = context.silContent || "";

  // 1. Schema alignment (0–5): Does PROJECT_STATUS.json have all required fields?
  const schemaFields = ["slug", "name", "status", "health", "currentFocus", "nextMilestone", "blockers", "lastUpdated"];
  const schemaChecks = schemaFields.map((f) => statusJson != null && statusJson[f] != null && statusJson[f] !== "");
  const schemaScore = scoreDimension(schemaChecks);

  // 2. Prompt/template alignment (0–5): Are core context files present and non-empty?
  const templateChecks = [
    latestHandoff.trim().length > 50,
    taskBoard.trim().length > 50,
    currentState.trim().length > 50,
    truthAudit.trim().length > 20,
    silContent.trim().length > 50,
  ];
  const templateScore = scoreDimension(templateChecks);

  // 3. Derived-view freshness (0–5): Are key dates recent?
  const freshnessChecks = [];
  if (statusJson?.lastUpdated) {
    const days = Math.floor((now - new Date(statusJson.lastUpdated)) / 86400000);
    freshnessChecks.push(days <= 7);
    freshnessChecks.push(days <= 21);
  } else {
    freshnessChecks.push(false, false);
  }
  if (statusJson?.truthAuditLastRun) {
    const days = Math.floor((now - new Date(statusJson.truthAuditLastRun)) / 86400000);
    freshnessChecks.push(days <= 14);
  } else {
    freshnessChecks.push(false);
  }
  // SIL freshness
  if (statusJson?.silLastSession) {
    const days = Math.floor((now - new Date(statusJson.silLastSession)) / 86400000);
    freshnessChecks.push(days <= 7);
  } else {
    freshnessChecks.push(false);
  }
  // Handoff mentions a session number
  freshnessChecks.push(/session\s+\d+/i.test(latestHandoff));
  const freshnessScore = scoreDimension(freshnessChecks);

  // 4. Handoff continuity (0–5): Does handoff have key structural elements?
  const handoffChecks = [
    /where we left off/i.test(latestHandoff),
    /shipped|completed|done/i.test(latestHandoff),
    /tests?.*\d+\s*passing/i.test(latestHandoff),
    /deploy/i.test(latestHandoff),
    /session intent/i.test(latestHandoff),
  ];
  const handoffScore = scoreDimension(handoffChecks);

  // 5. Contradiction density (0–5): Fewer contradictions = higher score
  const contradictionChecks = [];
  // Status match
  if (statusJson?.health && currentState) {
    const stateHealth = /health.*?:\s*(green|yellow|red)/i.exec(currentState);
    contradictionChecks.push(!stateHealth || stateHealth[1] === statusJson.health);
  } else {
    contradictionChecks.push(statusJson?.health != null);
  }
  // Blockers consistency
  const jsonBlockers = Array.isArray(statusJson?.blockers) ? statusJson.blockers.length : -1;
  const taskBoardBlockers = (taskBoard.match(/##\s*blocked/i) || []).length > 0;
  const humanActions = parseHumanActionItems(taskBoard);
  contradictionChecks.push(jsonBlockers === 0 ? humanActions.length === 0 : true);
  // Truth audit status match
  if (statusJson?.truthAuditStatus && truthAudit) {
    const auditStatus = /overall status:\s*(\w+)/i.exec(truthAudit);
    contradictionChecks.push(!auditStatus || auditStatus[1] === statusJson.truthAuditStatus);
  } else {
    contradictionChecks.push(true);
  }
  // SIL score match
  if (statusJson?.silScore != null && silContent) {
    const silMatch = /total:\s*(\d+)/i.exec(silContent);
    contradictionChecks.push(!silMatch || Math.abs(parseInt(silMatch[1]) - statusJson.silScore) <= 2);
  } else {
    contradictionChecks.push(statusJson?.silScore != null);
  }
  // No stale status claim
  contradictionChecks.push(statusJson?.status !== "archived" || /archived/i.test(currentState));
  const contradictionScore = scoreDimension(contradictionChecks);

  const total = schemaScore + templateScore + freshnessScore + handoffScore + contradictionScore;

  const dimensions = [
    { name: "Schema alignment", score: schemaScore, max: 5 },
    { name: "Prompt/template alignment", score: templateScore, max: 5 },
    { name: "Derived-view freshness", score: freshnessScore, max: 5 },
    { name: "Handoff continuity", score: handoffScore, max: 5 },
    { name: "Contradiction density", score: contradictionScore, max: 5 },
  ];

  return { total, max: 25, dimensions };
}
