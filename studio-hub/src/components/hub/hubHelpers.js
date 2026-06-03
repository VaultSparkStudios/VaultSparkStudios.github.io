// Shared UI helper functions used across hub sub-modules.

export function deltaBadge(current, prev) {
  if (prev === undefined || prev === null) return "";
  const diff = current - prev;
  if (diff === 0) return `<span style="font-size:10px; color:var(--muted); margin-left:4px;">—</span>`;
  const color = diff > 0 ? "var(--green)" : "var(--red)";
  const sign  = diff > 0 ? "+" : "";
  return `<span style="font-size:10px; font-weight:700; color:${color}; margin-left:4px;">${sign}${diff}</span>`;
}

export function computeHotStreak(commits) {
  if (!commits?.length) return 0;
  const todayDay = Math.floor(Date.now() / 86400000);
  const commitDays = new Set(commits.map((c) => Math.floor(new Date(c.date).getTime() / 86400000)));
  let streak = 0;
  for (let d = todayDay; d >= todayDay - 90; d--) {
    if (commitDays.has(d)) streak++;
    else if (streak > 0) break;
  }
  return streak;
}
