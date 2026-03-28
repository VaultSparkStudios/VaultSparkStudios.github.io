// Register service worker for offline caching
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(function() {});
}
