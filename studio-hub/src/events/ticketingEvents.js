// Ticketing view event handlers — extracted from clientApp.js

export function bindTicketingEvents(ctx) {
  const { state, render, config, loadStoredCredentials, submitProjectTicket, submitRenameTicket, submitInitiateTicket, loadTickets, navigate } = ctx;

  // Refresh
  document.getElementById("tickets-refresh-btn")?.addEventListener("click", () => {
    try { sessionStorage.removeItem("vshub_gh_project_tickets"); } catch {}
    state.tickets = [];
    loadTickets();
  });

  // Color picker ↔ hex input sync
  const colorPicker = document.getElementById("ticket-color-picker");
  const colorHex    = document.getElementById("ticket-color-hex");
  if (colorPicker && colorHex) {
    colorPicker.addEventListener("input", () => { colorHex.value = colorPicker.value; });
    colorHex.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(colorHex.value)) colorPicker.value = colorHex.value;
    });
    colorHex.value = colorPicker.value;
  }

  // Submit form
  document.getElementById("ticket-submit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name         = document.getElementById("ticket-name")?.value.trim();
    const githubRepo   = document.getElementById("ticket-repo")?.value.trim();
    const type         = document.getElementById("ticket-type")?.value;
    const status       = document.getElementById("ticket-status")?.value;
    const description  = document.getElementById("ticket-description")?.value.trim();
    const deployedUrl  = document.getElementById("ticket-deployed-url")?.value.trim();
    const supabaseSlug = document.getElementById("ticket-supabase-slug")?.value.trim();
    const color        = document.getElementById("ticket-color-hex")?.value.trim()
                      || document.getElementById("ticket-color-picker")?.value || "";

    if (!name || !githubRepo || !type || !status || !description) {
      state.ticketError = "Please fill in all required fields (name, repo, type, status, description).";
      state.ticketSuccess = null;
      render();
      return;
    }

    state.ticketSubmitting = true;
    state.ticketError = null;
    state.ticketSuccess = null;
    render();

    const studioOsChecks = document.querySelectorAll(".studio-os-check");
    const studioOsCompliant = studioOsChecks.length > 0 && [...studioOsChecks].every((cb) => cb.checked);

    const credentials = loadStoredCredentials();
    const token = config.githubToken || credentials.githubToken || "";
    const result = await submitProjectTicket({ name, githubRepo, type, status, description, deployedUrl, supabaseSlug, color, studioOsCompliant }, token);

    state.ticketSubmitting = false;
    if (result.ok) {
      state.ticketSuccess = { url: result.url, id: result.id };
      state.ticketError = null;
      document.getElementById("ticket-submit-form")?.reset();
      const cp = document.getElementById("ticket-color-picker");
      const ch = document.getElementById("ticket-color-hex");
      if (ch) ch.value = "#7ae7c7";
      if (cp) cp.value = "#7ae7c7";
      loadTickets();
    } else {
      state.ticketError = result.error;
    }
    render();
  });

  // Rename / Rebrand form
  document.getElementById("rename-submit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const currentName  = document.getElementById("rename-current-name")?.value.trim();
    const currentSlug  = document.getElementById("rename-current-slug")?.value.trim();
    const proposedName = document.getElementById("rename-proposed-name")?.value.trim();
    const proposedSlug = document.getElementById("rename-proposed-slug")?.value.trim();
    const changeType   = document.getElementById("rename-change-type")?.value;
    const repoChanging = document.getElementById("rename-repo-changing")?.value;
    const newRepo      = document.getElementById("rename-new-repo")?.value.trim();
    const reason       = document.getElementById("rename-reason")?.value.trim();

    if (!currentName || !proposedName || !changeType || !reason) {
      state.renameError = "Please fill in all required fields.";
      state.renameSuccess = null;
      render();
      return;
    }

    state.renameSubmitting = true;
    state.renameError = null;
    state.renameSuccess = null;
    render();

    const credentials = loadStoredCredentials();
    const token = config.githubToken || credentials.githubToken || "";
    const result = await submitRenameTicket(
      { currentName, currentSlug, proposedName, proposedSlug, changeType, repoChanging, newRepo, reason },
      token
    );

    state.renameSubmitting = false;
    if (result.ok) {
      state.renameSuccess = { url: result.url, id: result.id };
      state.renameError = null;
      document.getElementById("rename-submit-form")?.reset();
    } else {
      state.renameError = result.error;
    }
    render();
  });

  // Initiate Project form
  document.getElementById("initiate-submit-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const codename    = document.getElementById("initiate-codename")?.value.trim();
    const type        = document.getElementById("initiate-type")?.value;
    const vaultStatus = document.getElementById("initiate-vault-status")?.value || "forge";
    const priority    = document.getElementById("initiate-priority")?.value || "medium";
    const brief       = document.getElementById("initiate-brief")?.value.trim();
    const soul        = document.getElementById("initiate-soul")?.value.trim();

    if (!codename || !type || !brief) {
      state.initiateError = "Please fill in all required fields (codename, type, brief).";
      state.initiateSuccess = null;
      render();
      return;
    }

    state.initiateSubmitting = true;
    state.initiateError = null;
    state.initiateSuccess = null;
    render();

    const credentials = loadStoredCredentials();
    const token = config.githubToken || credentials.githubToken || "";
    const result = await submitInitiateTicket({ codename, type, vaultStatus, priority, brief, soul }, token);

    state.initiateSubmitting = false;
    if (result.ok) {
      state.initiateSuccess = { url: result.url, id: result.id };
      state.initiateError = null;
      document.getElementById("initiate-submit-form")?.reset();
    } else {
      state.initiateError = result.error;
    }
    render();
  });

  // "Submit Ticket" quick-action from Studio Ops pipeline strip
  document.querySelectorAll("[data-action='submit-ticket']").forEach((btn) => {
    btn.addEventListener("click", () => navigate("ticketing"));
  });
}
