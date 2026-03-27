// localStorage helpers shared across hub sub-modules.

import { safeGetJSON } from "../../utils/helpers.js";

export function loadAnnotations() { return safeGetJSON("vshub_annotations", {}); }
export function loadGoals() { return safeGetJSON("vshub_goals", {}); }
export function loadSprint() { return safeGetJSON("vshub_sprint", null); }
export function loadPinned() { return new Set(safeGetJSON("vshub_pinned", [])); }
