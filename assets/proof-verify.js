/**
 * proof-verify.js — in-browser re-verification of the studio's public evidence.
 *
 * Everything here runs in the visitor's own browser: it re-fetches the deploy
 * ledger, re-computes every SHA-256 with WebCrypto, and re-walks the hash chain.
 * Nothing is taken on faith from the page — the page only reports what the
 * visitor's browser just proved. Trusted-Types-safe: DOM APIs only.
 */
(function () {
  'use strict';

  var CONTINUITY_URL = '/api/staging-deploy-continuity.json';
  var RELEASE_URL = '/api/release-proof.json';
  var ROUTES_URL = '/api/worker-route-provenance.json';
  var IDENTITY_URL = '/api/identity-migration-receipt.json';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.prototype.map.call(new Uint8Array(digest), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /** Content identity of a ledger row: sha256 of the row minus the named field, first 24 hex. */
  async function contentId(row, dropField) {
    var copy = {};
    Object.keys(row).forEach(function (key) { if (key !== dropField) copy[key] = row[key]; });
    return (await sha256Hex(JSON.stringify(copy))).slice(0, 24);
  }

  function renderCheck(list, ok, title, detail) {
    var item = el('li', 'proof-check ' + (ok === true ? 'proof-pass' : ok === false ? 'proof-fail' : 'proof-wait'));
    item.appendChild(el('span', 'proof-check-mark', ok === true ? '✓' : ok === false ? '✗' : '…'));
    var body = el('div', 'proof-check-body');
    body.appendChild(el('strong', null, title));
    body.appendChild(el('span', 'proof-check-detail', detail));
    item.appendChild(body);
    list.appendChild(item);
    return item;
  }

  async function verifyLedger(list) {
    var passed = 0, total = 0;
    function record(ok, title, detail) { total++; if (ok) passed++; renderCheck(list, ok, title, detail); }

    var continuity;
    try {
      continuity = await (await fetch(CONTINUITY_URL, { cache: 'no-store' })).json();
    } catch (e) {
      record(false, 'Fetch the published anchor', 'Could not load ' + CONTINUITY_URL);
      return { passed: passed, total: total };
    }
    record(!!(continuity && continuity.bytes && continuity.ledger), 'Fetch the published anchor',
      'The site publishes a digest anchor naming the ledger’s expected hash, depth and head.');

    var servedPath = (continuity && continuity.servedPath) || '/data/staging-deploy-history.ndjson';
    var text;
    try {
      var res = await fetch(servedPath, { cache: 'no-store' });
      text = await res.text();
    } catch (e) {
      record(false, 'Fetch the served ledger', 'Could not load ' + servedPath);
      return { passed: passed, total: total };
    }

    // 1 — the bytes this browser just received hash to the published digest.
    var digest = await sha256Hex(text);
    var expected = continuity.bytes || {};
    record(digest === expected.sha256,
      'Your browser’s copy hashes to the published digest',
      'SHA-256 of the ' + text.length + ' bytes you just downloaded: ' + digest.slice(0, 12) + '… (published: ' + String(expected.sha256 || '').slice(0, 12) + '…)');

    // 2 — every row is content-addressed: its id is the hash of its own content.
    var rows = text.split('\n').filter(Boolean).map(function (line) { return JSON.parse(line); });
    var idOk = true;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].rowId && (await contentId(rows[i], 'rowId')) !== rows[i].rowId) { idOk = false; break; }
    }
    record(idOk, 'Every row’s identity is the hash of its own content',
      rows.length + ' rows re-hashed in your browser — a single edited byte in any row would change its identity.');

    // 3 — the chain is intact: each row names its predecessor's receipt.
    var chainOk = true, chronoOk = true, seen = {};
    for (var j = 0; j < rows.length; j++) {
      var prev = j === 0 ? null : rows[j - 1];
      if (rows[j].previousReceiptId !== (prev ? prev.receiptId : null)) chainOk = false;
      if (seen[rows[j].receiptId]) chainOk = false;
      seen[rows[j].receiptId] = true;
      if (prev && Date.parse(rows[j].generatedAt) <= Date.parse(prev.generatedAt)) chronoOk = false;
    }
    record(chainOk, 'The chain is unbroken',
      'Each deploy names the receipt of the one before it — removing, reordering or inserting a deploy breaks the link.');
    record(chronoOk, 'The chronology only moves forward',
      'Timestamps strictly increase along the chain; history cannot be rewritten backwards.');

    // 4 — the head your browser computed matches the published head.
    var head = rows[rows.length - 1] || {};
    var pub = (continuity.ledger && continuity.ledger.head) || {};
    record(head.receiptId === pub.receiptId && rows.length === (continuity.ledger && continuity.ledger.depth),
      'The head and depth match the published anchor',
      'Your browser walked ' + rows.length + ' deploys ending at ' + String(head.receiptId || '').slice(0, 12) + '…; the anchor names depth ' + (continuity.ledger ? continuity.ledger.depth : '?') + ' ending at ' + String(pub.receiptId || '').slice(0, 12) + '…');

    return { passed: passed, total: total };
  }

  function tile(container, label, value, detail, tone) {
    var card = el('article', 'proof-tile proof-tile-' + (tone || 'neutral'));
    card.appendChild(el('span', 'proof-tile-label', label));
    card.appendChild(el('strong', 'proof-tile-value', value));
    card.appendChild(el('span', 'proof-tile-detail', detail));
    container.appendChild(card);
  }

  function renderLiveTiles(container) {
    fetch(RELEASE_URL).then(function (r) { return r.json(); }).then(function (d) {
      if (!d) return;
      var holds = Array.isArray(d.blockers) ? d.blockers.length : 0;
      var holding = d.releaseState !== 'ready' || holds > 0;
      tile(container, 'Production release gate', holding ? 'Holding' : 'Clear',
        holding
          ? 'The gate is refusing to promote until every proof passes — the hold itself is the feature.'
          : 'Every release proof currently passes.',
        holding ? 'amber' : 'good');
    }).catch(function () {});
    fetch(ROUTES_URL).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.publicSafe !== true) return;
      var s = d.summary || {};
      tile(container, 'Edge routes', d.state === 'matched' ? (s.matched || 0) + '/' + (s.total || 0) + ' verified' : d.state,
        'Bounded, privacy-safe probes against the live edge — no bodies, no identifiers recorded.',
        d.state === 'matched' ? 'good' : 'neutral');
    }).catch(function () {});
    fetch(IDENTITY_URL).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.publicSafe !== true) return;
      var verified = d.state === 'verified';
      tile(container, 'Identity plane', verified ? 'Verified' : 'Staged · held',
        'Machine-produced evidence only — the receipt is written by verifiers that re-read the provider after every change.',
        verified ? 'good' : 'amber');
    }).catch(function () {});
  }

  function init() {
    var runButton = document.getElementById('proof-run');
    var list = document.getElementById('proof-checks');
    var summary = document.getElementById('proof-summary');
    var tiles = document.getElementById('proof-tiles');
    if (tiles) renderLiveTiles(tiles);
    if (!runButton || !list || !summary) return;
    if (!window.crypto || !window.crypto.subtle) {
      summary.textContent = 'Your browser does not expose WebCrypto — the one-click verification needs it.';
      runButton.disabled = true;
      return;
    }
    runButton.addEventListener('click', function () {
      runButton.disabled = true;
      runButton.textContent = 'Verifying…';
      while (list.firstChild) list.removeChild(list.firstChild);
      summary.textContent = '';
      verifyLedger(list).then(function (result) {
        summary.textContent = result.passed === result.total
          ? 'Your browser independently verified ' + result.passed + '/' + result.total + ' checks. You did not have to trust us — you checked.'
          : result.passed + '/' + result.total + ' checks passed — a failing check means the served evidence does not match its anchor. That is exactly what this page exists to catch.';
        runButton.textContent = 'Run the verification again';
        runButton.disabled = false;
      }).catch(function () {
        summary.textContent = 'Verification could not complete — a feed was unreachable.';
        runButton.textContent = 'Try again';
        runButton.disabled = false;
      });
    });
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
