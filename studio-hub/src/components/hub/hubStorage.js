// localStorage helpers shared across hub sub-modules.

export function loadAnnotations() {
  try { return JSON.parse(localStorage.getItem("vshub_annotations") || "{}"); } catch { return {}; }
}

export function loadGoals() {
  try { return JSON.parse(localStorage.getItem("vshub_goals") || "{}"); } catch { return {}; }
}

export function loadSprint() {
  try { return JSON.parse(localStorage.getItem("vshub_sprint") || "null"); } catch { return null; }
}

export function loadPinned() {
  try { return new Set(JSON.parse(localStorage.getItem("vshub_pinned") || "[]")); } catch { return new Set(); }
}
