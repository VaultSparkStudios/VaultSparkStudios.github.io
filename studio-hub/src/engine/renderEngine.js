// Render Engine — memoization + incremental DOM updates
// Replaces raw innerHTML rebuilds with hash-based skip logic and
// targeted DOM patching for the main content area.
//
// Two layers:
// 1. Memoization: hash component inputs, skip render if unchanged
// 2. Incremental patch: diff new HTML against current DOM, apply only changes
//
// Usage in clientApp.js:
//   import { memoRender, patchDOM, clearMemoCache } from "./engine/renderEngine.js";
//   const html = memoRender("studio-hub", () => renderStudioHubView(state), state);
//   patchDOM(container, html);

// ── Memo cache ───────────────────────────────────────────────────────────────
const _memoCache = new Map(); // viewKey → { hash, html }

/**
 * Fast hash of an object for change detection.
 * Uses JSON.stringify + djb2 — not cryptographic, just fast.
 */
function fastHash(obj) {
  const str = typeof obj === "string" ? obj : JSON.stringify(obj);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

/**
 * Extracts a minimal fingerprint from the app state for a given view.
 * Only includes fields that the view actually reads, so unrelated state
 * changes don't trigger unnecessary re-renders.
 */
function stateFingerprint(viewKey, state) {
  const base = {
    syncStatus: state.syncStatus,
    syncError: state.syncError,
    theme: state.theme,
    focusMode: state.focusMode,
  };

  if (viewKey === "studio-hub") {
    return {
      ...base,
      ghData: state.ghData,
      sbData: state.sbData,
      socialData: state.socialData,
      scoreHistory: state.scoreHistory?.length,
      alertCount: state.alertCount,
      projectFilter: state.projectFilter,
      tagFilter: state.tagFilter,
      compactCards: state.compactCards,
      lastSyncTimestamp: state.lastSyncTimestamp,
    };
  }

  if (viewKey === "analytics") {
    return { ...base, ghData: state.ghData, sbData: state.sbData, socialData: state.socialData, analyticsTab: state.analyticsTab };
  }

  if (viewKey === "settings") {
    return { ...base, settings: state.settings };
  }

  if (viewKey === "heatmap") {
    return { ...base, ghData: state.ghData, heatmapSortKey: state.heatmapSortKey, heatmapSortAsc: state.heatmapSortAsc };
  }

  if (viewKey === "compare") {
    return { ...base, ghData: state.ghData };
  }

  if (viewKey === "social") {
    return { ...base, socialData: state.socialData };
  }

  if (viewKey === "competitive") {
    return { ...base, competitorData: state.competitorData, competitorLoading: state.competitorLoading };
  }

  if (viewKey === "ticketing") {
    return { ...base, tickets: state.tickets, ticketsLoading: state.ticketsLoading };
  }

  // For project views and others, use the full relevant data
  if (viewKey.startsWith("project:")) {
    const pid = viewKey.slice("project:".length);
    return {
      ...base,
      repoData: state.ghData?.[Object.keys(state.ghData).find((k) => k.includes(pid))],
      contextFiles: state.contextFiles?.[pid],
      extendedData: state.projectExtendedData?.[pid],
    };
  }

  // Fallback: use base fields only (still cache-friendly)
  return base;
}

/**
 * Memoized render: returns cached HTML if the state fingerprint hasn't changed.
 *
 * @param {string} viewKey    - Unique view identifier (e.g., "studio-hub", "project:my-game")
 * @param {Function} renderFn - Function that returns HTML string
 * @param {object} state      - Current app state
 * @returns {string} HTML string (cached or freshly rendered)
 */
export function memoRender(viewKey, renderFn, state) {
  const fp = stateFingerprint(viewKey, state);
  const hash = fastHash(fp);
  const cached = _memoCache.get(viewKey);

  if (cached && cached.hash === hash) {
    return cached.html;
  }

  const html = renderFn();
  _memoCache.set(viewKey, { hash, html });
  return html;
}

/**
 * Clears the memo cache for a specific view or all views.
 */
export function clearMemoCache(viewKey = null) {
  if (viewKey) {
    _memoCache.delete(viewKey);
  } else {
    _memoCache.clear();
  }
}

// ── Incremental DOM patching ─────────────────────────────────────────────────
// Uses morphdom-inspired approach: compare new HTML tree with existing DOM,
// update only nodes that changed. This preserves event listeners on unchanged
// nodes and avoids full DOM teardown/rebuild.

/**
 * Patches a container element to match new HTML content.
 * Compares child nodes and only updates differences.
 *
 * @param {HTMLElement} container - The DOM element to update
 * @param {string} newHTML        - The new HTML content
 * @param {object} options        - { onBeforeUpdate, onAfterUpdate }
 */
export function patchDOM(container, newHTML, options = {}) {
  if (!container) return;

  // Create a template to parse new HTML
  const template = document.createElement("template");
  template.innerHTML = newHTML;
  const newTree = template.content;

  // If container is empty, just set innerHTML (first render)
  if (!container.hasChildNodes()) {
    container.innerHTML = newHTML;
    return;
  }

  // Fast path: if the new tree has a single root element and its outerHTML
  // matches the existing single root, skip entirely.
  const existingChildren = container.children;
  const newChildren = newTree.children;

  if (existingChildren.length === 1 && newChildren.length === 1) {
    if (existingChildren[0].outerHTML === newChildren[0].outerHTML) {
      return; // Nothing changed
    }
  }

  // Walk the trees and patch differences
  morphChildren(container, newTree);

  if (options.onAfterUpdate) options.onAfterUpdate(container);
}

/**
 * Recursively patches child nodes to match a new tree.
 * Preserves existing DOM nodes where possible.
 */
function morphChildren(existing, incoming) {
  const existingNodes = [...existing.childNodes];
  const incomingNodes = [...incoming.childNodes];

  const maxLen = Math.max(existingNodes.length, incomingNodes.length);

  for (let i = 0; i < maxLen; i++) {
    const oldNode = existingNodes[i];
    const newNode = incomingNodes[i];

    // New node to add
    if (!oldNode && newNode) {
      existing.appendChild(newNode.cloneNode(true));
      continue;
    }

    // Old node to remove
    if (oldNode && !newNode) {
      existing.removeChild(oldNode);
      continue;
    }

    // Different node types — replace entirely
    if (oldNode.nodeType !== newNode.nodeType) {
      existing.replaceChild(newNode.cloneNode(true), oldNode);
      continue;
    }

    // Text nodes — update text content if different
    if (oldNode.nodeType === Node.TEXT_NODE) {
      if (oldNode.textContent !== newNode.textContent) {
        oldNode.textContent = newNode.textContent;
      }
      continue;
    }

    // Element nodes — compare tag, attributes, then recurse children
    if (oldNode.nodeType === Node.ELEMENT_NODE) {
      // Different tags — replace entirely
      if (oldNode.tagName !== newNode.tagName) {
        existing.replaceChild(newNode.cloneNode(true), oldNode);
        continue;
      }

      // Patch attributes
      patchAttributes(oldNode, newNode);

      // For input/select/textarea, sync value property
      if (oldNode.tagName === "INPUT" || oldNode.tagName === "TEXTAREA") {
        if (oldNode.value !== newNode.value) oldNode.value = newNode.value || "";
        if (oldNode.checked !== newNode.checked) oldNode.checked = newNode.checked;
      }
      if (oldNode.tagName === "SELECT") {
        if (oldNode.value !== newNode.value) oldNode.value = newNode.value || "";
      }

      // Recurse into children
      morphChildren(oldNode, newNode);
    }
  }
}

/**
 * Syncs attributes from newNode to oldNode.
 * Adds new attributes, updates changed ones, removes deleted ones.
 */
function patchAttributes(oldNode, newNode) {
  // Remove attributes not in new node
  const oldAttrs = [...oldNode.attributes];
  for (const attr of oldAttrs) {
    if (!newNode.hasAttribute(attr.name)) {
      oldNode.removeAttribute(attr.name);
    }
  }

  // Add/update attributes from new node
  const newAttrs = [...newNode.attributes];
  for (const attr of newAttrs) {
    if (oldNode.getAttribute(attr.name) !== attr.value) {
      oldNode.setAttribute(attr.name, attr.value);
    }
  }
}

// ── Event listener lifecycle management ──────────────────────────────────────

const _eventCleanups = [];

/**
 * Registers an event listener with automatic cleanup tracking.
 * Call cleanupEvents() before a view switch to remove all listeners.
 */
export function trackEvent(element, event, handler, options) {
  if (!element) return;
  element.addEventListener(event, handler, options);
  _eventCleanups.push({ element, event, handler, options });
}

/**
 * Removes all tracked event listeners. Call before view switch
 * to prevent memory leaks from orphaned listeners.
 */
export function cleanupEvents() {
  for (const { element, event, handler, options } of _eventCleanups) {
    try {
      element.removeEventListener(event, handler, options);
    } catch {
      // Element may have been removed from DOM
    }
  }
  _eventCleanups.length = 0;
}

/**
 * Returns the number of currently tracked event listeners.
 * Useful for debugging memory leaks.
 */
export function getTrackedEventCount() {
  return _eventCleanups.length;
}
