// Compare view event handlers — extracted from clientApp.js
import { safeGetJSON, safeSetJSON } from "../utils/helpers.js";

export function bindCompareEvents(ctx) {
  const { render } = ctx;

  // Swap button — rotates A→B→C→A
  document.getElementById("compare-swap-btn")?.addEventListener("click", () => {
    const s = safeGetJSON("vshub_compare", {});
    safeSetJSON("vshub_compare", { a: s.b || "", b: s.c || "", c: s.a || "" });
    render();
  });

  // Selectors A, B, C
  document.getElementById("compare-select-a")?.addEventListener("change", (e) => {
    const s = safeGetJSON("vshub_compare", {});
    safeSetJSON("vshub_compare", { ...s, a: e.target.value });
    render();
  });
  document.getElementById("compare-select-b")?.addEventListener("change", (e) => {
    const s = safeGetJSON("vshub_compare", {});
    safeSetJSON("vshub_compare", { ...s, b: e.target.value });
    render();
  });
  document.getElementById("compare-select-c")?.addEventListener("change", (e) => {
    const s = safeGetJSON("vshub_compare", {});
    safeSetJSON("vshub_compare", { ...s, c: e.target.value });
    render();
  });

  // Restore compare selects visually from localStorage on mount
  const saved = safeGetJSON("vshub_compare", {});
  const selA = document.getElementById("compare-select-a");
  const selB = document.getElementById("compare-select-b");
  const selC = document.getElementById("compare-select-c");
  if (selA && saved.a) selA.value = saved.a;
  if (selB && saved.b) selB.value = saved.b;
  if (selC && saved.c) selC.value = saved.c;
}
