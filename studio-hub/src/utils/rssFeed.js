// RSS/Atom feed generator — produces an Atom XML feed from score history snapshots.

import { scoreGrade, escapeHtml } from "./helpers.js";

/**
 * Generate an Atom XML feed from score history snapshots.
 * @param {Array} scoreHistory — array from loadScoreHistory(), each entry: { ts, scores, ci, issues, pillars }
 * @param {Array} projects — PROJECTS array from studioRegistry
 * @returns {string} valid Atom XML string
 */
export function generateScoreRSSFeed(scoreHistory, projects) {
  if (!Array.isArray(scoreHistory) || !scoreHistory.length) {
    return buildAtomShell("No score history available.", []);
  }

  const projectMap = {};
  for (const p of projects || []) {
    projectMap[p.id] = p.name || p.id;
  }

  // Take last 20 entries, newest first
  const entries = scoreHistory.slice(-20).reverse();

  const atomEntries = entries.map((snap, idx) => {
    const ts = snap.ts || 0;
    const isoDate = new Date(ts).toISOString();
    const dateLabel = new Date(ts).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });

    // Find previous snapshot for deltas
    const snapIndex = scoreHistory.indexOf(snap);
    const prev = snapIndex > 0 ? scoreHistory[snapIndex - 1] : null;

    const scores = snap.scores || {};
    const prevScores = prev?.scores || {};

    // Build content lines
    const lines = [];
    const ids = Object.keys(scores).sort();
    for (const id of ids) {
      const name = projectMap[id] || id;
      const score = scores[id];
      const grade = scoreGrade(score);
      const prevScore = prevScores[id];
      let delta = "";
      if (prevScore != null && score != null) {
        const diff = score - prevScore;
        if (diff > 0) delta = ` (+${diff})`;
        else if (diff < 0) delta = ` (${diff})`;
        else delta = " (=)";
      }
      lines.push(`${escapeHtml(name)}: ${score ?? "—"} [${grade}]${delta}`);
    }

    // Studio average
    const vals = ids.map((id) => scores[id]).filter((v) => v != null);
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    const avgLine = avg != null ? `Studio Average: ${avg} [${scoreGrade(avg)}]` : "";

    const contentHtml = escapeHtml(avgLine + "\n\n" + lines.join("\n"));

    return `  <entry>
    <title>Studio Score Update — ${escapeHtml(dateLabel)}</title>
    <id>urn:vshub:score:${ts}</id>
    <updated>${isoDate}</updated>
    <published>${isoDate}</published>
    <content type="text">${contentHtml}</content>
  </entry>`;
  });

  const latestTs = entries[0]?.ts || Date.now();
  return buildAtomShell(new Date(latestTs).toISOString(), atomEntries);
}

function buildAtomShell(updatedIso, entryStrings) {
  const updated = updatedIso.includes("T") ? updatedIso : new Date().toISOString();
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>VaultSpark Studio Hub — Score Feed</title>
  <link href="https://vaultsparkstudios.com/studio-hub/" rel="self" />
  <id>urn:vshub:score-feed</id>
  <updated>${updated}</updated>
  <author><name>VaultSpark Studio Hub</name></author>
${entryStrings.join("\n")}
</feed>`;
}
