// Compare view event handlers — extracted from clientApp.js

export function bindCompareEvents(ctx) {
  const { render } = ctx;

  // Swap button — rotates A→B→C→A
  document.getElementById("compare-swap-btn")?.addEventListener("click", () => {
    try {
      const s = JSON.parse(localStorage.getItem("vshub_compare") || "{}");
      localStorage.setItem("vshub_compare", JSON.stringify({ a: s.b || "", b: s.c || "", c: s.a || "" }));
      render();
    } catch {}
  });

  // Selectors A, B, C
  document.getElementById("compare-select-a")?.addEventListener("change", (e) => {
    try {
      const s = JSON.parse(localStorage.getItem("vshub_compare") || "{}");
      localStorage.setItem("vshub_compare", JSON.stringify({ ...s, a: e.target.value }));
      render();
    } catch {}
  });
  document.getElementById("compare-select-b")?.addEventListener("change", (e) => {
    try {
      const s = JSON.parse(localStorage.getItem("vshub_compare") || "{}");
      localStorage.setItem("vshub_compare", JSON.stringify({ ...s, b: e.target.value }));
      render();
    } catch {}
  });
  document.getElementById("compare-select-c")?.addEventListener("change", (e) => {
    try {
      const s = JSON.parse(localStorage.getItem("vshub_compare") || "{}");
      localStorage.setItem("vshub_compare", JSON.stringify({ ...s, c: e.target.value }));
      render();
    } catch {}
  });

  // Restore compare selects visually from localStorage on mount
  try {
    const saved = JSON.parse(localStorage.getItem("vshub_compare") || "{}");
    const selA = document.getElementById("compare-select-a");
    const selB = document.getElementById("compare-select-b");
    const selC = document.getElementById("compare-select-c");
    if (selA && saved.a) selA.value = saved.a;
    if (selB && saved.b) selB.value = saved.b;
    if (selC && saved.c) selC.value = saved.c;
  } catch {}
}
