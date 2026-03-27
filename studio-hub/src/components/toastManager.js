// Toast Notification Manager
// Displays non-blocking toast notifications at the bottom-right of the screen.
// Supports error, warning, info, and success types with auto-dismiss and queue overflow.

let container = null;
const MAX_VISIBLE = 3;
const queue = [];

export function initToastContainer() {
  if (container && document.body.contains(container)) return;
  container = document.createElement("div");
  container.className = "toast-container";
  container.id = "toast-container";
  document.body.appendChild(container);
}

function removeToast(el) {
  el.style.animation = "toastFadeOut 0.3s ease-out forwards";
  setTimeout(() => {
    el.remove();
    if (queue.length > 0 && container.children.length < MAX_VISIBLE) {
      const next = queue.shift();
      showToast(next.message, next.type, next.duration);
    }
  }, 300);
}

export function showToast(message, type = "info", duration = 5000) {
  initToastContainer();
  if (container.children.length >= MAX_VISIBLE) {
    queue.push({ message, type, duration });
    return;
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  el.style.cursor = "pointer";
  el.addEventListener("click", () => removeToast(el));
  container.appendChild(el);
  if (duration > 0) setTimeout(() => { if (el.parentNode) removeToast(el); }, duration);
}
