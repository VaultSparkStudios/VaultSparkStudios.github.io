/**
 * VaultSpark — Share-target receiver.
 *
 * Renders incoming `?title=&text=&url=` payload from the PWA Web Share Target,
 * pre-fills the "Send to founder" CTA so it deep-links to /contact/?subject=…&body=…
 * and stores the share locally (sessionStorage) for in-app pickup if needed.
 */
(function () {
  'use strict';
  var qs = new URLSearchParams(location.search);
  var title = (qs.get('title') || '').trim();
  var text = (qs.get('text') || '').trim();
  var url = (qs.get('url') || '').trim();

  var summary = document.getElementById('share-summary');
  var detail = document.getElementById('share-detail');
  var titleRow = document.getElementById('share-title-row');
  var textRow = document.getElementById('share-text-row');
  var urlRow = document.getElementById('share-url-row');
  var titleEl = document.getElementById('share-title');
  var textEl = document.getElementById('share-text');
  var urlEl = document.getElementById('share-url');
  var forwardBtn = document.getElementById('forward-btn');

  if (!title && !text && !url) {
    summary.textContent = 'Nothing was shared. The vault is still listening.';
    return;
  }

  detail.style.display = '';
  if (title) { titleEl.textContent = title; titleRow.style.display = ''; }
  if (text) { textEl.textContent = text; textRow.style.display = ''; }
  if (url) { urlEl.textContent = url; urlEl.href = url; urlRow.style.display = ''; }

  summary.textContent = 'A signal arrived. Forge it into the founder feed?';

  var subject = title || 'Shared to the vault';
  var body = [text, url].filter(Boolean).join('\n\n');
  var href = '/contact/?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body) : '');
  forwardBtn.setAttribute('href', href);

  try {
    sessionStorage.setItem('vs_share_in', JSON.stringify({ title: title, text: text, url: url, ts: Date.now() }));
  } catch (_e) {}
})();
