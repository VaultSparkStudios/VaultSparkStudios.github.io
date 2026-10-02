<!-- Vault Command: admin controls for the studio account. Served from the
     edge-session gated /vault-member/admin/ path and injected by
     vault-member/portal-loop.js only after is_vault_admin() returns true.
     Every action is re-checked server-side (RLS / security-definer RPCs). -->
<div data-vault-command>
<div class="p-section-header">
  <div>
    <h2 style="font-size:1.1rem;font-weight:800;margin:0 0 0.3rem;letter-spacing:-0.02em;">⚡ Vault Command</h2>
    <p style="font-size:0.84rem;color:var(--muted);margin:0;line-height:1.55;">Restricted access — Vault Member <strong style="color:var(--gold);">#1</strong>. Actions broadcast to all active Vault members.</p>
  </div>
</div>
<div class="admin-panels-grid">

  <!-- Signal Broadcast: Studio Pulse -->
  <div class="settings-block">
    <h3>Signal Broadcast</h3>
    <p class="p-desc-admin">Post a live message to the Studio Pulse stream. Logged-in members see it in real time.</p>
    <div class="admin-form-group">
      <label for="admin-pulse-msg">Message</label>
      <textarea class="admin-textarea" id="admin-pulse-msg" maxlength="300" placeholder="What's happening in the Vault right now?"></textarea>
    </div>
    <div class="admin-form-group">
      <label for="admin-pulse-type">Signal Type</label>
      <select class="admin-select" id="admin-pulse-type">
        <option value="update">Update — General studio news</option>
        <option value="alert">Alert — Critical Vault signal</option>
        <option value="drop">Drop — New content or key drop</option>
      </select>
    </div>
    <div class="admin-form-group" style="margin-top:0.5rem;">
      <label style="display:flex;align-items:center;gap:0.5rem;cursor:pointer;">
        <input type="checkbox" id="admin-pulse-schedule-toggle" data-member-change="pulse-schedule" style="width:auto;accent-color:var(--gold);">
        Schedule for later
      </label>
      <div id="admin-pulse-schedule-wrap" style="display:none;margin-top:0.5rem;">
        <input type="datetime-local" class="admin-input" id="admin-pulse-schedule-time" style="width:100%;" />
      </div>
    </div>
    <div class="p-flex-row">
      <button type="button" class="admin-submit-btn" id="admin-pulse-btn">Broadcast Signal</button>
      <span class="admin-feedback" id="admin-pulse-fb"></span>
    </div>
  </div>

  <!-- Key Vault Drop -->
  <div class="settings-block">
    <h3>Key Vault Drop</h3>
    <p class="p-desc-admin">Deploy a new beta access key. Members meeting the plan and rank requirements can claim it from the Early Access tab.</p>
    <div class="admin-form-group">
      <label for="admin-key-slug">Game</label>
      <select class="admin-select" id="admin-key-slug">
        <option value="call-of-doodie">💩 Call of Doodie</option>
        <option value="gridiron-gm">🏈 Gridiron GM</option>
        <option value="franchise-architect">⚡ Franchise Architect</option>
      </select>
    </div>
    <div class="admin-form-group">
      <label for="admin-key-code">Key Code</label>
      <input class="admin-input" type="text" id="admin-key-code" placeholder="VAULT-XXXX-XXXX-XXXX" autocomplete="off" />
    </div>
    <div class="admin-form-group">
      <label for="admin-key-rank">Minimum Rank Required</label>
      <select class="admin-select" id="admin-key-rank">
        <option value="0">0 — Spark Initiate+</option>
        <option value="1">1 — Vault Runner+</option>
        <option value="2">2 — Rift Scout+</option>
        <option value="3">3 — Vault Guard+</option>
        <option value="4">4 — Vault Breacher+</option>
        <option value="5">5 — Void Operative+</option>
        <option value="6">6 — Vault Keeper+</option>
        <option value="7">7 — Forge Master+</option>
        <option value="8">8 — The Sparked only</option>
      </select>
    </div>
    <div class="admin-form-group">
      <label for="admin-key-plan">Membership Plan Required</label>
      <select class="admin-select" id="admin-key-plan">
        <option value="free">Free Vault Member+</option>
        <option value="vault_sparked">VaultSparked only</option>
        <option value="promogrind_pro">PromoGrind Pro or VaultSparked</option>
      </select>
    </div>
    <div class="p-flex-row">
      <button type="button" class="admin-submit-btn" id="admin-key-btn">Deploy Key</button>
      <span class="admin-feedback" id="admin-key-fb"></span>
    </div>
  </div>

  <!-- Classified File Uplink (full-width) -->
  <div class="settings-block admin-panel-full">
    <h3>Classified File Uplink</h3>
    <p class="p-desc-admin">Publish a new classified file to the Archive. Triggers a push notification to all subscribed Vault members automatically.</p>
    <div class="p-grid-3-auto">
      <div class="admin-form-group">
        <label for="admin-file-title">Title</label>
        <input class="admin-input" type="text" id="admin-file-title" placeholder="Operation Fault Echo" />
      </div>
      <div class="admin-form-group">
        <label for="admin-file-slug">Slug</label>
        <input class="admin-input" type="text" id="admin-file-slug" placeholder="operation-fault-echo" />
      </div>
      <div class="admin-form-group">
        <label for="admin-file-classification">Classification Label</label>
        <input class="admin-input" type="text" id="admin-file-classification" placeholder="CLASSIFIED — VAULT ACCESS" />
      </div>
      <div class="admin-form-group">
        <label for="admin-file-rank">Minimum Rank Required</label>
        <select class="admin-select" id="admin-file-rank">
          <option value="0">0 — All members</option>
          <option value="1">1 — Vault Runner+</option>
          <option value="2">2 — Rift Scout+</option>
          <option value="3">3 — Vault Guard+</option>
          <option value="4">4 — Vault Breacher+</option>
          <option value="5">5 — Void Operative+</option>
          <option value="6">6 — Vault Keeper+</option>
          <option value="7">7 — Forge Master+</option>
          <option value="8">8 — The Sparked only</option>
        </select>
      </div>
      <div class="admin-form-group">
        <label for="admin-file-plan">Membership Plan Required</label>
        <select class="admin-select" id="admin-file-plan">
          <option value="free">Free Vault Member+</option>
          <option value="vault_sparked">VaultSparked only</option>
          <option value="promogrind_pro">PromoGrind Pro or VaultSparked</option>
        </select>
      </div>
      <div class="admin-form-group">
        <label for="admin-file-universe">Universe Tag</label>
        <input class="admin-input" type="text" id="admin-file-universe" placeholder="dreadspike" />
      </div>
    </div>
    <div class="admin-form-group">
      <label for="admin-file-html">Content HTML</label>
      <textarea class="admin-textarea admin-html" id="admin-file-html" placeholder="<p>The fault layer extends further than any cartographer has mapped…</p>"></textarea>
    </div>
    <div class="p-flex-row">
      <button type="button" class="admin-submit-btn" id="admin-file-btn">Uplink to Archive</button>
      <span class="admin-feedback" id="admin-file-fb"></span>
    </div>
  </div>

  <!-- Challenge Analytics (full-width) -->
  <div class="settings-block admin-panel-full">
    <h3>Challenge Analytics</h3>
    <p class="p-desc-admin">Completion rates and engagement for all active challenges.</p>
    <div id="admin-challenge-analytics">
      <button type="button" class="admin-submit-btn" id="load-analytics-btn" style="margin-bottom:0.75rem;">Load Analytics</button>
      <div id="admin-analytics-list" style="font-size:0.86rem;color:var(--muted);"></div>
    </div>
  </div>

  <!-- Member Export CSV (full-width) -->
  <div class="settings-block admin-panel-full">
    <h3>Member Export</h3>
    <p class="p-desc-admin">Download a CSV of all vault members — username, email placeholder, rank, points, joined date.</p>
    <button type="button" class="admin-submit-btn" id="admin-csv-btn">⬇ Download Members CSV</button>
    <span class="admin-feedback" id="admin-csv-fb"></span>
  </div>

  <!-- Push Notification Test -->
  <div class="settings-block admin-panel-full">
    <h3>Push Notification Test</h3>
    <p class="p-desc-admin">Send a test push notification to your own browser to verify VAPID keys and the <code>send-push</code> Edge Function are working.</p>
    <div class="p-flex-row">
      <button type="button" class="admin-submit-btn" id="admin-push-test-btn">Send Test Push</button>
      <span class="admin-feedback" id="admin-push-test-fb"></span>
    </div>
  </div>

  <!-- Investor Requests -->
  <!-- Fan Art Moderation -->
  <div class="settings-block admin-panel-full">
    <h3>Fan Art Submissions
      <span id="fan-art-pending-badge" style="display:none;margin-left:0.6rem;padding:0.15rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:800;background:rgba(255,196,0,0.15);color:var(--gold);"></span>
    </h3>
    <p class="p-desc-admin">
      Review community fan art. Approved pieces appear in the <a href="/community/#fan-art" style="color:var(--gold);">/community</a> gallery.
    </p>
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;">
      <button type="button" id="fanart-pending-btn" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:rgba(255,196,0,0.15);border:1px solid rgba(255,196,0,0.3);">Pending</button>
      <button type="button" id="fanart-approved-btn" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);">Approved</button>
      <button type="button" id="fanart-rejected-btn" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);">Rejected</button>
    </div>
    <div id="fan-art-queue" style="font-size:0.88rem;color:var(--muted);">Loading…</div>
  </div>

  <div class="settings-block admin-panel-full">
    <h3>Investor Requests
      <span id="inv-req-badge" style="display:none;margin-left:0.6rem;padding:0.15rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:800;background:rgba(31,162,255,0.15);color:#1FA2FF;"></span>
    </h3>
    <p class="p-desc-admin">
      Applications submitted via <a href="/investor-portal/apply/" style="color:#1FA2FF;">/investor-portal/apply/</a>. Approve to grant portal access.
    </p>
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap;" id="inv-req-filters">
      <button type="button" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:rgba(31,162,255,0.15);border:1px solid rgba(31,162,255,0.3);" data-member-action="inv-filter" data-filter="pending">Pending</button>
      <button type="button" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);" data-member-action="inv-filter" data-filter="contacted">Contacted</button>
      <button type="button" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);" data-member-action="inv-filter" data-filter="approved">Approved</button>
      <button type="button" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);" data-member-action="inv-filter" data-filter="rejected">Rejected</button>
      <button type="button" class="admin-submit-btn" style="padding:0.3rem 0.85rem;font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.1);" data-member-action="inv-filter" data-filter="all">All</button>
    </div>
    <div id="inv-req-list" style="font-size:0.88rem;color:var(--muted);">Loading…</div>
  </div>

  <!-- ── Community Polls ── -->
  <div class="settings-block admin-panel-full">
    <h3>Community Polls</h3>
    <p class="p-desc-admin">
      Create polls visible to all Vault members on the Community page. Members can vote once per poll.
    </p>
    <form id="create-poll-form" data-member-submit="create-poll" autocomplete="off">
      <div style="margin-bottom:0.75rem;">
        <label style="font-size:0.82rem;color:var(--muted);display:block;margin-bottom:0.3rem;" for="poll-question">Question</label>
        <input id="poll-question" class="poll-text-input" type="text" maxlength="240" required placeholder="e.g. Which game should we release next?" />
      </div>
      <div id="poll-options-container">
        <label style="font-size:0.82rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Options (2–4)</label>
        <div style="display:flex;flex-direction:column;gap:0.5rem;" id="poll-options-list">
          <input type="text" maxlength="120" required placeholder="Option 1" class="poll-option-input" />
          <input type="text" maxlength="120" required placeholder="Option 2" class="poll-option-input" />
        </div>
        <button type="button" id="add-poll-option-btn" data-member-action="add-poll-option" style="margin-top:0.5rem;padding:0.3rem 0.75rem;font-size:0.8rem;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--muted);cursor:pointer;">+ Add option</button>
      </div>
      <div style="margin-top:0.75rem;">
        <label style="font-size:0.82rem;color:var(--muted);display:block;margin-bottom:0.3rem;" for="poll-closes-at">Closes at (optional)</label>
        <input id="poll-closes-at" class="poll-datetime-input" type="datetime-local" />
      </div>
      <button type="submit" class="admin-submit-btn" style="margin-top:1rem;" id="create-poll-btn">Create Poll</button>
      <p id="create-poll-status" style="margin-top:0.5rem;font-size:0.82rem;min-height:1.2em;"></p>
    </form>
    <div style="margin-top:1.5rem;">
      <h4 style="font-size:0.9rem;margin-bottom:0.6rem;color:var(--muted);">Active Polls</h4>
      <div id="admin-polls-list" style="font-size:0.88rem;color:var(--muted);">Loading…</div>
    </div>
  </div>

</div>
</div>
