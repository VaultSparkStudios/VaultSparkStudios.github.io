// AI Copilot — conversational assistant powered by Claude API.
// Uses project scores, signals, and studio context to answer questions.
// Stores conversation per session; cache for repeated questions.

import { PROJECTS } from "../data/studioRegistry.js";
import { scoreProject } from "../utils/projectScoring.js";
import { loadStoredCredentials } from "./settingsView.js";
import { escapeHtml, safeGetJSON } from "../utils/helpers.js";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 600;
const COPILOT_HISTORY_KEY = "vshub_copilot_history";
const MAX_HISTORY = 30;

// ── In-memory conversation state ─────────────────────────────────────────────
let _messages = []; // { role, content, ts }
let _loading = false;
let _error = null;

export function getCopilotMessages() { return _messages; }

// ── Persist / restore last session ───────────────────────────────────────────
function persistHistory() {
  try {
    const trimmed = _messages.slice(-MAX_HISTORY);
    localStorage.setItem(COPILOT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* quota */ }
}

function restoreHistory() {
  if (_messages.length > 0) return; // already populated this session
  const saved = safeGetJSON(COPILOT_HISTORY_KEY, []);
  if (Array.isArray(saved) && saved.length) _messages = saved.slice(-MAX_HISTORY);
}

// ── Build studio context snapshot for system prompt ──────────────────────────
function buildStudioContext(state) {
  const { ghData = {}, sbData = null, socialData = null } = state;
  const lines = ["Studio Portfolio Snapshot:"];

  const scored = PROJECTS.map((p) => {
    const rd = ghData[p.githubRepo] || null;
    const sc = scoreProject(p, rd, sbData, socialData);
    return { project: p, scoring: sc, repoData: rd };
  }).sort((a, b) => b.scoring.total - a.scoring.total);

  for (const { project, scoring } of scored) {
    const pillars = scoring.pillars;
    lines.push(
      `- ${project.name} (${project.type}, ${project.status}): ${scoring.total}/130 ${scoring.grade} ` +
      `[Dev:${pillars.development.score}/${pillars.development.max} ` +
      `Eng:${pillars.engagement.score}/${pillars.engagement.max} ` +
      `Mom:${pillars.momentum.score}/${pillars.momentum.max} ` +
      `Risk:${pillars.risk.score}/${pillars.risk.max} ` +
      `Comm:${pillars.community.score}/${pillars.community.max}]`
    );
    // Top 2 signals per weakest pillar
    const weakest = Object.entries(pillars)
      .sort((a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max))[0];
    if (weakest) {
      const sigs = weakest[1].signals?.slice(0, 3).join("; ") || "";
      if (sigs) lines.push(`  ^ weakest: ${weakest[0]} — ${sigs}`);
    }
  }

  // Studio averages
  const avg = scored.length
    ? Math.round(scored.reduce((s, x) => s + x.scoring.total, 0) / scored.length)
    : 0;
  lines.push(`\nStudio average: ${avg}/130`);
  lines.push(`Total projects: ${scored.length}`);
  lines.push(`Date: ${new Date().toLocaleDateString()}`);

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the AI Copilot for VaultSpark Studio Hub — an indie game studio's internal operations dashboard.

Your role:
- Answer questions about project health scores, trends, and priorities
- Recommend specific actions to improve scores (be concrete: "add CI workflow" not "improve development")
- Explain scoring signals and what drives grade changes
- Help prioritize which projects need attention
- Provide strategic studio-level advice

Style: concise, direct, data-driven. Use the score data provided. Reference specific projects and numbers. No fluff. Markdown formatting is OK for lists.

Scoring system: 5 pillars (Development 0-30, Engagement 0-25, Momentum 0-25, Risk 0-20+5 governance, Community 0-25) = max 130. Grades: S>=124, A+>=105, A>=93, B+>=80, B>=68, C+>=56, C>=43, D>=31, F<31.`;

// ── Send message to Claude API ───────────────────────────────────────────────
export async function sendCopilotMessage(userText, state) {
  const creds = loadStoredCredentials();
  const claudeApiKey = creds.claudeApiKey || "";
  if (!claudeApiKey) {
    _error = "No Claude API key configured. Add it in Settings → Credentials.";
    return { ok: false, error: _error };
  }

  _loading = true;
  _error = null;
  _messages.push({ role: "user", content: userText, ts: Date.now() });

  const studioContext = buildStudioContext(state);

  // Build conversation for API — include system + context + recent messages
  const apiMessages = [];

  // Inject studio context as first user message if first in conversation
  const conversationMsgs = _messages.slice(-10); // last 10 for context window
  for (const msg of conversationMsgs) {
    apiMessages.push({ role: msg.role, content: msg.content });
  }

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-calls": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT + "\n\n" + studioContext,
        messages: apiMessages,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      _error = body?.error?.message || `API error ${res.status}`;
      _loading = false;
      // Remove the user message on failure
      _messages.pop();
      return { ok: false, error: _error };
    }

    const data = await res.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) {
      _error = "Empty response from Claude";
      _loading = false;
      _messages.pop();
      return { ok: false, error: _error };
    }

    _messages.push({ role: "assistant", content: text, ts: Date.now() });
    _loading = false;
    persistHistory();
    return { ok: true, text };
  } catch (err) {
    _error = err.message;
    _loading = false;
    _messages.pop();
    return { ok: false, error: _error };
  }
}

export function clearCopilotHistory() {
  _messages = [];
  _error = null;
  try { localStorage.removeItem(COPILOT_HISTORY_KEY); } catch {}
}

// ── Quick-ask suggestions ────────────────────────────────────────────────────
const QUICK_ASKS = [
  "Which project needs the most attention right now?",
  "What are the top 3 actions to raise our studio average?",
  "Which projects are at risk of a grade drop?",
  "Summarize the studio health in 3 bullet points",
  "What should I ship this week for maximum impact?",
  "Compare our game projects vs tool projects",
];

// ── Render helpers ───────────────────────────────────────────────────────────
function renderMessage(msg) {
  const isUser = msg.role === "user";
  const time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const contentHtml = isUser ? escapeHtml(msg.content) : formatAssistantContent(msg.content);
  return `
    <div class="copilot-msg ${isUser ? "copilot-msg-user" : "copilot-msg-assistant"}" style="
      display:flex; flex-direction:column; align-items:${isUser ? "flex-end" : "flex-start"};
      margin-bottom:16px;">
      <div style="
        max-width:85%; padding:12px 16px; border-radius:12px; font-size:13px; line-height:1.6;
        background:${isUser ? "var(--accent)" : "var(--panel)"};
        color:${isUser ? "#fff" : "var(--text)"};
        border:${isUser ? "none" : "1px solid var(--border)"};
        white-space:pre-wrap; word-break:break-word;">
        ${contentHtml}
      </div>
      <span style="font-size:10px; color:var(--muted); margin-top:4px; padding:0 4px;">${time}</span>
    </div>
  `;
}

function formatAssistantContent(text) {
  // Light markdown: **bold**, `code`, - lists, ### headers
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg); padding:1px 5px; border-radius:3px; font-size:12px;">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<div style="font-weight:700; font-size:14px; margin:8px 0 4px;">$1</div>');
  html = html.replace(/^- (.+)$/gm, '<div style="padding-left:12px;">• $1</div>');
  return html;
}

// ── Main render ──────────────────────────────────────────────────────────────
export function renderAiCopilotView(state) {
  restoreHistory();
  const creds = loadStoredCredentials();
  const hasKey = !!(creds.claudeApiKey);

  const messagesHtml = _messages.length > 0
    ? _messages.map(renderMessage).join("")
    : `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; color:var(--muted); text-align:center; gap:16px;">
        <div style="font-size:40px; opacity:0.3;">🤖</div>
        <div style="font-size:15px; font-weight:600;">Ask me anything about your studio</div>
        <div style="font-size:12px; max-width:360px;">I have full context on all your project scores, signals, and trends. Try one of the suggestions below.</div>
      </div>`;

  const quickAsksHtml = _messages.length === 0
    ? `<div style="display:flex; flex-wrap:wrap; gap:8px; padding:12px 16px; border-top:1px solid var(--border);">
        ${QUICK_ASKS.map((q, i) => `<button class="copilot-quick-ask" data-copilot-quick="${i}" style="
          background:var(--bg); border:1px solid var(--border); color:var(--text); padding:6px 12px;
          border-radius:16px; font-size:11px; cursor:pointer; transition:all 0.15s;
          white-space:nowrap;">${escapeHtml(q)}</button>`).join("")}
      </div>`
    : "";

  const inputDisabled = !hasKey || _loading;

  return `
    <div class="main-panel">
      <div class="main-content" style="max-width:900px; margin:0 auto; display:flex; flex-direction:column; height:calc(100vh - 40px);">
        <!-- Header -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-shrink:0;">
          <div>
            <h1 style="font-size:22px; font-weight:800; margin:0; display:flex; align-items:center; gap:10px;">
              AI Copilot
              <span style="font-size:10px; font-weight:600; padding:3px 8px; border-radius:8px; background:var(--accent); color:#fff; letter-spacing:0.05em;">BETA</span>
            </h1>
            <p style="margin:4px 0 0; font-size:12px; color:var(--muted);">
              Studio intelligence powered by Claude — ask about scores, priorities, strategy
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            ${_messages.length > 0 ? `<button id="copilot-clear-btn" style="
              background:transparent; border:1px solid var(--border); color:var(--muted);
              padding:6px 12px; border-radius:6px; font-size:11px; cursor:pointer;">Clear Chat</button>` : ""}
          </div>
        </div>

        ${!hasKey ? `
          <div class="panel" style="border:1px solid var(--yellow); background:color-mix(in srgb, var(--yellow) 8%, transparent); padding:16px; border-radius:8px; margin-bottom:16px; flex-shrink:0;">
            <div style="font-size:13px; font-weight:600; color:var(--yellow); margin-bottom:6px;">Claude API Key Required</div>
            <div style="font-size:12px; color:var(--muted);">Go to <strong>Settings → Credentials</strong> and enter your Claude API key (sk-ant-...) to enable the AI Copilot.</div>
            <button class="empty-state-action" data-navigate="settings" style="
              margin-top:10px; background:var(--accent); color:#fff; border:none; padding:8px 16px;
              border-radius:6px; font-size:12px; cursor:pointer;">Open Settings</button>
          </div>
        ` : ""}

        <!-- Chat area -->
        <div class="panel" style="flex:1; display:flex; flex-direction:column; overflow:hidden; border-radius:10px;">
          <div id="copilot-messages" style="flex:1; overflow-y:auto; padding:20px 16px; scroll-behavior:smooth;">
            ${messagesHtml}
            ${_loading ? `
              <div class="copilot-msg copilot-msg-assistant" style="display:flex; align-items:flex-start; margin-bottom:16px;">
                <div style="padding:12px 16px; border-radius:12px; background:var(--panel); border:1px solid var(--border);">
                  <span class="copilot-typing" style="display:inline-flex; gap:4px;">
                    <span style="width:6px; height:6px; border-radius:50%; background:var(--muted); animation:copilotDot 1.2s ease-in-out infinite;"></span>
                    <span style="width:6px; height:6px; border-radius:50%; background:var(--muted); animation:copilotDot 1.2s ease-in-out 0.2s infinite;"></span>
                    <span style="width:6px; height:6px; border-radius:50%; background:var(--muted); animation:copilotDot 1.2s ease-in-out 0.4s infinite;"></span>
                  </span>
                </div>
              </div>
            ` : ""}
            ${_error && !_loading ? `
              <div style="padding:10px 14px; background:color-mix(in srgb, var(--red) 12%, transparent); border:1px solid var(--red); border-radius:8px; margin-bottom:12px; font-size:12px; color:var(--red);">
                ${escapeHtml(_error)}
              </div>
            ` : ""}
          </div>

          ${quickAsksHtml}

          <!-- Input -->
          <div style="padding:12px 16px; border-top:1px solid var(--border); display:flex; gap:8px; flex-shrink:0;">
            <input id="copilot-input" type="text" placeholder="${hasKey ? "Ask about your projects, scores, strategy..." : "Configure API key first"}"
              ${inputDisabled ? "disabled" : ""}
              style="flex:1; background:var(--bg); border:1px solid var(--border); color:var(--text);
                padding:10px 14px; border-radius:8px; font-size:13px; outline:none;
                opacity:${inputDisabled ? "0.5" : "1"};"
              autocomplete="off" />
            <button id="copilot-send-btn" ${inputDisabled ? "disabled" : ""} style="
              background:var(--accent); color:#fff; border:none; padding:10px 20px;
              border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
              opacity:${inputDisabled ? "0.5" : "1"}; white-space:nowrap;">Send</button>
          </div>
        </div>

        <!-- Model info -->
        <div style="text-align:center; padding:8px; font-size:10px; color:var(--muted); flex-shrink:0;">
          Powered by Claude Haiku 4.5 — responses use live studio data as context
        </div>
      </div>
    </div>
  `;
}
