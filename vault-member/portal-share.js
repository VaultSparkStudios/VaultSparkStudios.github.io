// ── VaultSpark Achievement Share Card Generator — S66 ────────────
// CSP-safe external script. Exposes window.VSShare.generateAchievementCard()
// Canvas-based 1200×630 PNG share card for earned achievements.

(function() {
  'use strict';

  /**
   * Draw a rounded rect path (polyfill for older browsers).
   */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Generate a 1200×630 share card PNG for an earned achievement.
   * @param {Object} achievementDef  – { id, name, desc, icon }
   * @param {string} username        – member's vault handle
   * @returns {Promise<Blob>}        – PNG blob
   */
  function generateAchievementCard(achievementDef, username) {
    return new Promise(function(resolve, reject) {
      var canvas = document.createElement('canvas');
      canvas.width  = 1200;
      canvas.height = 630;
      var ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas unavailable')); return; }

      var W = 1200, H = 630;
      var GOLD = '#FFC400';

      // ── Background ────────────────────────────────────────────
      ctx.fillStyle = '#0a0c14';
      ctx.fillRect(0, 0, W, H);

      // Radial glow from centre
      var glow = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 520);
      glow.addColorStop(0,   'rgba(255,196,0,0.18)');
      glow.addColorStop(0.5, 'rgba(255,196,0,0.05)');
      glow.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid texture
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 60) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 60) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
      }

      // ── Gold border ───────────────────────────────────────────
      var borderGlow = ctx.createLinearGradient(0, 0, W, H);
      borderGlow.addColorStop(0,   'rgba(255,196,0,0.6)');
      borderGlow.addColorStop(0.5, 'rgba(255,196,0,0.2)');
      borderGlow.addColorStop(1,   'rgba(255,196,0,0.6)');
      roundRect(ctx, 16, 16, W - 32, H - 32, 20);
      ctx.strokeStyle = borderGlow;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── VaultSpark Studios wordmark (top-left) ────────────────
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('VaultSpark Studios', 48, 62);

      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('vaultsparkstudios.com', 48, 84);

      // ── "Vault Achievement" label (top-right) ─────────────────
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.textAlign = 'right';
      ctx.fillText('VAULT ACHIEVEMENT', W - 48, 62);
      ctx.textAlign = 'left';

      // ── Achievement badge icon (centered, large) ──────────────
      var iconIsEmoji = achievementDef.icon && !achievementDef.icon.startsWith('/');
      if (iconIsEmoji) {
        ctx.font = '120px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(achievementDef.icon || '🏆', W / 2, H / 2 - 60);
        ctx.textAlign = 'left';
      } else {
        // Fallback trophy for image-based icons
        ctx.font = '120px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆', W / 2, H / 2 - 60);
        ctx.textAlign = 'left';
      }

      // Gold halo under icon
      var halo = ctx.createRadialGradient(W / 2, H / 2 - 90, 20, W / 2, H / 2 - 90, 120);
      halo.addColorStop(0,   'rgba(255,196,0,0.25)');
      halo.addColorStop(1,   'rgba(255,196,0,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(W / 2 - 130, H / 2 - 210, 260, 200);

      // ── Achievement name ──────────────────────────────────────
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      // Truncate long names
      var name = (achievementDef.name || 'Achievement Unlocked').slice(0, 40);
      ctx.fillText(name, W / 2, H / 2 + 40);

      // ── Member username ───────────────────────────────────────
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = GOLD;
      ctx.fillText('@' + (username || 'VaultMember'), W / 2, H / 2 + 86);

      // ── Tagline ───────────────────────────────────────────────
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText('I earned this in the Vault', W / 2, H - 52);

      ctx.textAlign = 'left';

      // Export
      canvas.toBlob(function(blob) {
        if (blob) resolve(blob);
        else reject(new Error('toBlob failed'));
      }, 'image/png');
    });
  }

  /**
   * Download a blob as a PNG file.
   */
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a   = document.createElement('a');
    a.href     = url;
    a.download = filename || 'vault-achievement.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
  }

  /**
   * Copy image to clipboard using the Clipboard API (Chrome 76+).
   */
  async function copyImageToClipboard(blob) {
    if (!navigator.clipboard || !window.ClipboardItem) {
      throw new Error('Clipboard API not supported in this browser');
    }
    var item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
  }

  /**
   * Main entry point.
   * Generates the share card and shows a small download/copy action panel.
   * @param {Object} achievementDef
   * @param {string} username
   */
  async function openSharePanel(achievementDef, username) {
    // Remove any existing panel
    var existing = document.getElementById('vs-share-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'vs-share-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Share your achievement');
    Object.assign(panel.style, {
      position: 'fixed', inset: '0', zIndex: '2000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      padding: '1rem',
    });

    var card = document.createElement('div');
    Object.assign(card.style, {
      background: 'rgba(13,17,28,0.98)',
      border: '1px solid rgba(255,196,0,0.25)',
      borderRadius: '20px',
      padding: '1.75rem',
      maxWidth: '420px',
      width: '100%',
      textAlign: 'center',
      fontFamily: 'inherit',
    });

    card.innerHTML = '<h3 style="margin:0 0 0.5rem;font-size:1.1rem;color:#fff;font-weight:800;">Share Your Badge</h3>'
      + '<p style="margin:0 0 1.25rem;font-size:0.85rem;color:rgba(255,255,255,0.5);">Download or copy your achievement card</p>'
      + '<div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">'
      + '<button id="vs-share-download" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.6rem 1.1rem;background:#FFC400;color:#000;border:none;border-radius:10px;font-weight:800;font-size:0.88rem;cursor:pointer;font-family:inherit;">⬇ Download PNG</button>'
      + '<button id="vs-share-copy" style="display:inline-flex;align-items:center;gap:0.4rem;padding:0.6rem 1.1rem;background:rgba(255,255,255,0.07);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-weight:700;font-size:0.88rem;cursor:pointer;font-family:inherit;">📋 Copy Image</button>'
      + '</div>'
      + '<p id="vs-share-status" style="margin:0.85rem 0 0;font-size:0.78rem;color:rgba(255,255,255,0.4);min-height:1.2em;"></p>'
      + '<button id="vs-share-close" style="margin-top:1rem;width:100%;padding:0.55rem;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:rgba(255,255,255,0.5);cursor:pointer;font-family:inherit;font-size:0.85rem;">Close</button>';

    panel.appendChild(card);
    document.body.appendChild(panel);

    var prevFocus = document.activeElement;
    document.getElementById('vs-share-download').focus();

    var _blob = null;
    var status = document.getElementById('vs-share-status');

    // Generate card
    try {
      _blob = await generateAchievementCard(achievementDef, username);
      if (status) status.textContent = 'Card ready — download or copy!';
    } catch (err) {
      if (status) status.textContent = 'Could not generate card — try again.';
      console.warn('[VSShare] card gen failed:', err);
    }

    function closePanel() {
      panel.remove();
      try { prevFocus && prevFocus.focus(); } catch(_) {}
    }

    document.getElementById('vs-share-download').addEventListener('click', function() {
      if (!_blob) { if (status) status.textContent = 'Still generating…'; return; }
      downloadBlob(_blob, 'vault-achievement-' + (achievementDef.id || 'badge') + '.png');
      if (status) status.textContent = 'Downloading!';
    });

    document.getElementById('vs-share-copy').addEventListener('click', async function() {
      if (!_blob) { if (status) status.textContent = 'Still generating…'; return; }
      try {
        await copyImageToClipboard(_blob);
        if (status) status.textContent = 'Copied to clipboard!';
      } catch (err) {
        if (status) status.textContent = 'Copy failed — try Download instead.';
      }
    });

    document.getElementById('vs-share-close').addEventListener('click', closePanel);
    panel.addEventListener('click', function(e) { if (e.target === panel) closePanel(); });
    panel.addEventListener('keydown', function(e) { if (e.key === 'Escape') { e.preventDefault(); closePanel(); } });
  }

  // ── Public API ────────────────────────────────────────────────
  window.VSShare = {
    generateAchievementCard: generateAchievementCard,
    openSharePanel: openSharePanel,
    downloadBlob: downloadBlob,
    copyImageToClipboard: copyImageToClipboard,
  };

})();
