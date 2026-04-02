// Runway Auto-Loader — VaultSpark Studio Hub
// Analyzes task board context for thin runway and surfaces suggestions.
// When the "Now" queue has fewer than 3 items, it identifies promotable tasks
// from Next/Later buckets and unactioned [SIL] brainstorm items.

/**
 * Parses a TASK_BOARD.md and extracts tasks by bucket.
 * @param {string} taskBoard — raw markdown content
 * @returns {{ now: string[], next: string[], later: string[], blocked: string[] }}
 */
export function parseTaskBuckets(taskBoard = "") {
  const buckets = { now: [], next: [], later: [], blocked: [] };
  if (!taskBoard) return buckets;

  // Split into sections by ## headings
  const sections = taskBoard.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const heading = section.split("\n")[0].toLowerCase();
    let bucket = null;
    if (/now|in progress|current/i.test(heading) && !/recently completed|completed/i.test(heading)) bucket = "now";
    else if (/next/i.test(heading) && !/recently/i.test(heading)) bucket = "next";
    else if (/later|backlog|someday/i.test(heading)) bucket = "later";
    else if (/blocked/i.test(heading)) bucket = "blocked";

    if (!bucket) continue;

    const tasks = section.split("\n")
      .filter((line) => /^\s*-\s*\[\s\]/.test(line))
      .map((line) => line.replace(/^\s*-\s*\[\s\]\s*/, "").trim())
      .filter(Boolean);

    buckets[bucket].push(...tasks);
  }

  return buckets;
}

/**
 * Analyzes runway and returns promotion suggestions.
 * @param {string} taskBoard — raw TASK_BOARD.md content
 * @param {object} options — { minNow: 3 }
 * @returns {{ runwayOk: boolean, nowCount: number, suggestions: Array<{task: string, from: string, reason: string}> }}
 */
export function analyzeRunway(taskBoard = "", options = {}) {
  const minNow = options.minNow || 3;
  const buckets = parseTaskBuckets(taskBoard);
  const nowCount = buckets.now.length;

  if (nowCount >= minNow) {
    return { runwayOk: true, nowCount, suggestions: [] };
  }

  const suggestions = [];
  const needed = minNow - nowCount;

  // Prioritize [SIL] items from any bucket
  for (const bucket of ["next", "later"]) {
    for (const task of buckets[bucket]) {
      if (/\[SIL\]/i.test(task)) {
        suggestions.push({
          task: task.replace(/\*\*/g, ""),
          from: bucket,
          reason: "Unactioned [SIL] commitment",
        });
      }
    }
  }

  // Then non-SIL items from Next
  for (const task of buckets.next) {
    if (!/\[SIL\]/i.test(task) && suggestions.length < needed + 2) {
      suggestions.push({
        task: task.replace(/\*\*/g, ""),
        from: "next",
        reason: "Next-priority task ready for promotion",
      });
    }
  }

  // Then from Later if still short
  for (const task of buckets.later) {
    if (!/\[SIL\]/i.test(task) && suggestions.length < needed + 2) {
      suggestions.push({
        task: task.replace(/\*\*/g, ""),
        from: "later",
        reason: "Later-bucket task — consider promoting",
      });
    }
  }

  return {
    runwayOk: false,
    nowCount,
    suggestions: suggestions.slice(0, needed + 2),
  };
}

/**
 * Renders a runway warning panel for the Morning Brief.
 * @param {string} taskBoard — raw TASK_BOARD.md from this project's context
 * @returns {string} HTML or empty string
 */
export function renderRunwayWarning(taskBoard = "") {
  const result = analyzeRunway(taskBoard);
  if (result.runwayOk) return "";

  const suggestionRows = result.suggestions.map((s) => `
    <div style="display:flex; align-items:flex-start; gap:8px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="font-size:10px; font-weight:700; color:var(--gold); min-width:40px;">${s.from.toUpperCase()}</span>
      <span style="font-size:11px; color:var(--text); flex:1;">${s.task}</span>
      <span style="font-size:9px; color:var(--muted); white-space:nowrap;">${s.reason}</span>
    </div>
  `).join("");

  return `
    <div style="margin-bottom:14px; padding:12px 14px; background:rgba(255,201,116,0.06);
                border:1px solid rgba(255,201,116,0.2); border-radius:8px;">
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
        <span style="font-size:14px;">⛔</span>
        <span style="font-size:12px; font-weight:700; color:var(--gold);">Low Runway — Now queue has ${result.nowCount} item${result.nowCount !== 1 ? "s" : ""}</span>
      </div>
      <div style="font-size:11px; color:var(--muted); margin-bottom:8px; line-height:1.5;">
        Promote tasks to maintain momentum. Suggested promotions:
      </div>
      ${suggestionRows}
    </div>
  `;
}
