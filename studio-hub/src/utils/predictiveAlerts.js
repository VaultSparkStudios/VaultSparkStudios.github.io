// Predictive Score Alerts
// Uses the existing forecast engine to generate proactive warnings
// when a project's score is trending toward a grade boundary drop.

import { forecastScores, isForecastHighVariance, getScoreDelta } from "./scoreForecast.js";
import { getGrade } from "./projectScoring.js";

const GRADE_BOUNDARIES = [85, 75, 65, 55, 45, 35, 25]; // A+→A→B+→B→C+→C→D→F

/**
 * Returns predictive alerts for projects trending toward a grade drop.
 *
 * @param {Array} history    - Score history array from localStorage
 * @param {Array} projects   - PROJECTS registry array
 * @param {object} ghData    - Current GitHub data keyed by repoPath
 * @returns {Array<{ projectId, projectName, currentScore, currentGrade,
 *   forecastedScore, forecastedGrade, daysUntilDrop, message, severity }>}
 */
export function getPredictiveAlerts(history, projects, ghData) {
  if (!history || history.length < 2) return [];

  const forecasts = forecastScores(history);
  const latestScores = history[history.length - 1]?.scores || {};
  const alerts = [];

  for (const project of projects) {
    const pid = project.id;
    const currentScore = latestScores[pid];
    const forecastedScore = forecasts[pid];

    if (currentScore == null || forecastedScore == null) continue;

    const currentGrade = getGrade(currentScore);
    const forecastedGrade = getGrade(forecastedScore);

    // Skip if forecast grade is same or better
    if (forecastedScore >= currentScore) continue;

    // Check if crossing a grade boundary
    const crossedBoundary = GRADE_BOUNDARIES.find(
      (b) => currentScore >= b && forecastedScore < b
    );

    if (!crossedBoundary) continue;

    // Estimate days until drop based on velocity
    const delta = getScoreDelta(history, pid);
    const daysUntilDrop = delta && delta < 0
      ? Math.ceil((currentScore - crossedBoundary) / Math.abs(delta) * 7) // history entries are ~weekly
      : null;

    const isHighVariance = isForecastHighVariance(history, pid);
    const confidence = isHighVariance ? "low" : "moderate";

    // Severity: crossing below C is critical, below B is warning, rest is info
    let severity = "info";
    if (crossedBoundary <= 35) severity = "error";
    else if (crossedBoundary <= 55) severity = "warning";

    const dayStr = daysUntilDrop != null && daysUntilDrop > 0
      ? ` in ~${daysUntilDrop}d`
      : " soon";

    alerts.push({
      projectId: pid,
      projectName: project.name,
      currentScore,
      currentGrade: currentGrade.grade,
      forecastedScore,
      forecastedGrade: forecastedGrade.grade,
      crossedBoundary,
      daysUntilDrop,
      confidence,
      severity,
      message: `${project.name} trending toward ${forecastedGrade.grade} (${forecastedScore})${dayStr}${isHighVariance ? " (volatile)" : ""}`,
    });
  }

  // Sort: critical first, then by how soon the drop happens
  alerts.sort((a, b) => {
    const sevOrder = { error: 0, warning: 1, info: 2 };
    const sevDiff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
    if (sevDiff !== 0) return sevDiff;
    return (a.daysUntilDrop ?? 999) - (b.daysUntilDrop ?? 999);
  });

  return alerts;
}

/**
 * Renders predictive alerts as HTML cards for injection into the alert panel
 * or morning brief.
 */
export function renderPredictiveAlerts(alerts) {
  if (!alerts.length) return "";

  const cards = alerts.map((a) => {
    const sevColor = a.severity === "error" ? "var(--red)" : a.severity === "warning" ? "var(--gold)" : "var(--cyan)";
    const sevIcon = a.severity === "error" ? "⚠" : a.severity === "warning" ? "📉" : "📊";
    const confBadge = a.confidence === "low"
      ? '<span style="font-size:9px; padding:1px 5px; background:rgba(255,200,116,0.15); color:var(--gold); border-radius:4px; margin-left:6px;">volatile</span>'
      : "";

    return `
      <div style="display:flex; gap:10px; padding:8px 12px; border-left:3px solid ${sevColor};
                  background:rgba(255,255,255,0.02); border-radius:0 8px 8px 0; margin-bottom:6px;">
        <span style="font-size:16px; flex-shrink:0;">${sevIcon}</span>
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; color:var(--text); font-weight:600;">
            ${a.projectName}
            <span style="font-weight:400; color:${sevColor};">${a.currentGrade} → ${a.forecastedGrade}</span>
            ${confBadge}
          </div>
          <div style="font-size:11px; color:var(--muted); margin-top:2px;">
            Score ${a.currentScore} → ${a.forecastedScore}${a.daysUntilDrop != null ? ` in ~${a.daysUntilDrop} days` : " (trend-based)"}
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px; font-weight:700; color:var(--silver); margin-bottom:8px; letter-spacing:0.04em;">
        PREDICTIVE ALERTS
      </div>
      ${cards}
    </div>
  `;
}
