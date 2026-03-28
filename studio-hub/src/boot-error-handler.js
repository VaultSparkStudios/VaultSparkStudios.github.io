// Catches module-level errors that prevent clientApp.js from loading.
// Must be loaded BEFORE clientApp.js (non-module script).
window.addEventListener("error", function(e) {
  var app = document.getElementById("app");
  if (app && app.querySelector(".loading-state")) {
    var msg = (e.message || "Unknown error");
    var loc = (e.filename || "") + (e.lineno ? ":" + e.lineno : "");
    app.innerHTML =
      '<div style="padding:40px;font-family:monospace;color:#f87171;max-width:720px;margin:0 auto">' +
      '<h2 style="color:#f2f6fb">Studio Hub — Load Error</h2>' +
      '<pre style="white-space:pre-wrap;background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;font-size:13px">' +
      msg.replace(/</g, "&lt;") + "\n" + loc.replace(/</g, "&lt;") +
      '</pre><p style="color:#95a3b7;font-size:13px;margin-top:16px">Check the browser console (F12) for full details.</p></div>';
  }
});
