// VaultSpark Studios — Monthly Member Newsletter
// Sends a personalised digest to active, opted-in, email-confirmed Vault Members.
//
// Mail provider: BREVO transactional API (studio policy D-S259.2 — Brevo is the
// transactional/app mail provider; human mail is Zoho).
//
// Deploy: node scripts/deploy-member-newsletter.mjs --deploy
//   (Management API upload of THIS FILE ONLY — keep it self-contained: no
//   relative imports. verify_jwt=false is pinned in supabase/config.toml.)
//
// Function env (names only):
//   BREVO_API_KEY               — required for preview/send
//   NEWSLETTER_SECRET           — required; Bearer token shared with the GitHub Action
//   NEWSLETTER_FROM             — optional, default news@vaultsparkstudios.com (Brevo sender 8)
//   APP_URL                     — optional, default https://vaultsparkstudios.com
//   NEWSLETTER_UNSUBSCRIBE_BASE — optional https base of the newsletter-unsubscribe route.
//                                 Default: the function on *.supabase.co. That host rewrites
//                                 text/html GETs to text/plain, so real SENDS refuse the default
//                                 until this points at a browser-renderable custom-domain proxy.
//                                 Preview + dry-run work with either.
//   NEWSLETTER_PREVIEW_DOMAINS  — optional, comma list; default vaultsparkstudios.com
//   NEWSLETTER_TIME_BUDGET_MS   — optional, default 110000
//   NEWSLETTER_THROTTLE_MS      — optional, default 250
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — injected by the platform
//
// Request (POST, Authorization: Bearer <NEWSLETTER_SECRET>), JSON body — exactly one of:
//   {"dryRun": true}                 build everything, send nothing, counts only
//   {"previewTo": "<email>"}         render with the first eligible member's data,
//                                    send ONLY to previewTo, subject "[PREVIEW] ",
//                                    no member_newsletter_log write
//   {"send": true}                   real monthly send (idempotent per YYYY-MM period)
// An authorised POST with no body is rejected (400 mode_required) so a bare call
// can never mail every member.
//
// Trigger: .github/workflows/member-newsletter.yml

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
export const DEFAULT_FROM = 'news@vaultsparkstudios.com';
const DEFAULT_APP_URL = 'https://vaultsparkstudios.com';
const DEFAULT_PREVIEW_DOMAINS = ['vaultsparkstudios.com'];
export const DEFAULT_UNSUBSCRIBE_BASE = 'https://fjnpzjjyhnpmunfoycrp.supabase.co/functions/v1/newsletter-unsubscribe';
/** Clearly fake, well-formed token for preview mail: matches no row, changes no subscription. */
export const PREVIEW_UNSUBSCRIBE_TOKEN = '0'.repeat(32);
/** Same shape as the newsletter_preferences.unsubscribe_token DB default: encode(gen_random_bytes(16),'hex'). */
export const UNSUBSCRIBE_TOKEN_RE = /^[0-9a-f]{32}$/;
const SENDER_NAME = 'VaultSpark Studios';
/**
 * CAN-SPAM §7704(a)(5)(A)(iii): every commercial message must carry the sender's
 * valid physical postal address. Founder-provided, rendered as a normal US
 * address block beside the unsubscribe link in EVERY issue — real sends and
 * previews alike, because renderIssue() is the single renderer for both.
 */
export const POSTAL_ADDRESS_LINES = [
  'VaultSpark Studios LLC',
  '2807 N Parham Rd, Ste 320 #7389',
  'Henrico, VA 23294',
] as const;
const DAY_MS = 86_400_000;
const PAGE_SIZE = 1000;
const MAX_BODY_BYTES = 4096;
/** Hard ceiling on one Brevo request. A hung request must never outlive the isolate. */
export const SEND_TIMEOUT_MS = 20_000;
/**
 * A 'sending' claim older than this was stranded by an isolate that died mid-send.
 * Safely above the largest permitted time budget (380s) + one send timeout (20s),
 * so a row a concurrent invocation is still working on can never reach this age.
 */
export const STALE_CLAIM_MS = 15 * 60_000;
export const MAX_TIME_BUDGET_MS = 380_000;
/** Upper bound on a provider Retry-After we will repeat back to the operator. */
export const MAX_RETRY_AFTER_SECONDS = 3600;

const RANKS = [
  { min: 100000, name: 'The Sparked' },
  { min: 60000,  name: 'Forge Master' },
  { min: 30000,  name: 'Vault Keeper' },
  { min: 15000,  name: 'Void Operative' },
  { min: 7500,   name: 'Vault Breacher' },
  { min: 3000,   name: 'Vault Guard' },
  { min: 1000,   name: 'Rift Scout' },
  { min: 250,    name: 'Vault Runner' },
  { min: 0,      name: 'Spark Initiate' },
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

export type Mode = { kind: 'send' } | { kind: 'dry-run' } | { kind: 'preview'; to: string };

export interface Member {
  id: string;
  username: string | null;
  points: number | null;
  created_at: string;
  opted_out: boolean;
  unsubscribe_token: string | null;
}

export interface StudioStats {
  totalMembers: number;
  activeMembers: number;
  /** The 30-day activity scan hit its page cap: activeMembers is a floor, rendered as "N+". */
  activeMembersAtLeast: boolean;
  topMembers: { username: string | null; points: number | null }[];
}

export interface Activity {
  recentXp: number;
  games: string[];
  /** The per-member activity scan hit its page cap: recentXp/games understate reality. */
  truncated: boolean;
}

export type ClaimResult = 'claimed' | 'exists' | 'error';

/** A paged read plus whether it stopped at its page cap instead of at the end of the data. */
export interface Paged<T> {
  rows: T[];
  truncated: boolean;
}

/** Data access boundary — the real implementation is Supabase; tests inject a fake. */
export interface NewsletterData {
  listMembers(): Promise<Paged<Member>>;
  /** user id → email, confirmed non-anonymous addresses only. */
  loadAuthEmails(): Promise<{ emails: Map<string, string>; truncated: boolean }>;
  loadLoggedUserIds(period: string): Promise<Set<string>>;
  loadStudioStats(sinceIso: string): Promise<StudioStats>;
  loadActivity(userId: string, sinceIso: string): Promise<Activity>;
  /** Insert the (user, period) log row BEFORE sending; the UNIQUE constraint makes this the idempotency lock. */
  claim(userId: string, period: string): Promise<ClaimResult>;
  markSent(userId: string, period: string): Promise<void>;
  /** Remove a claim whose send failed so the next run retries it. */
  release(userId: string, period: string): Promise<void>;
  /**
   * Mark a claim whose delivery could NOT be disproved (transport error, 5xx, 408).
   * The claim is deliberately kept — releasing it risks a double-send — and the row
   * is flagged for operator review instead.
   */
  markUncertain(userId: string, period: string): Promise<void>;
  /** Release 'sending' claims for this period older than the cutoff. Returns how many. */
  sweepStaleClaims(period: string, olderThanIso: string): Promise<number>;
  /**
   * Guarantee a newsletter_preferences row with a well-formed unsubscribe_token.
   * Creates the row (opted_out default false) when missing, never overwrites an
   * existing opted_out, and reports the current opted_out so a late opt-out is honoured.
   */
  ensureUnsubscribeToken(userId: string): Promise<{ token: string; optedOut: boolean }>;
}

export interface Deps {
  env(name: string): string | undefined;
  data(): NewsletterData;
  fetch: typeof fetch;
  sleep(ms: number): Promise<void>;
  now(): Date;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Constant-time secret comparison. Both sides are hashed first so the compare
 * runs over equal-length digests regardless of input length. An empty expected
 * secret never matches (fail closed).
 */
export async function secretMatches(provided: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const enc = new TextEncoder();
  const [pa, ea] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  const p = new Uint8Array(pa);
  const e = new Uint8Array(ea);
  let diff = p.length ^ e.length;
  for (let i = 0; i < e.length; i++) diff |= p[i] ^ e[i];
  return diff === 0;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email)) return null;
  if (email.includes('..')) return null;
  return email;
}

export function getRankTitle(points: number): string {
  return RANKS.find((rank) => points >= rank.min)?.name ?? 'Spark Initiate';
}

export function periodOf(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(now: Date): string {
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function subjectFor(now: Date): string {
  return `VaultSpark Studios — ${monthLabel(now)} Dispatch`;
}

type ParsedMode = { ok: true; mode: Mode } | { ok: false; error: string };

export function parseMode(body: unknown, previewDomains: string[]): ParsedMode {
  if (body === null || body === undefined) return { ok: false, error: 'mode_required' };
  if (typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid_body' };
  const b = body as Record<string, unknown>;
  const wantsPreview = b.previewTo !== undefined;
  const wantsDry = b.dryRun !== undefined;
  const wantsSend = b.send !== undefined;
  if ([wantsPreview, wantsDry, wantsSend].filter(Boolean).length !== 1) {
    return { ok: false, error: wantsPreview || wantsDry || wantsSend ? 'conflicting_modes' : 'mode_required' };
  }
  if (wantsDry) return b.dryRun === true ? { ok: true, mode: { kind: 'dry-run' } } : { ok: false, error: 'invalid_dry_run' };
  if (wantsSend) return b.send === true ? { ok: true, mode: { kind: 'send' } } : { ok: false, error: 'invalid_send' };
  const to = normalizeEmail(b.previewTo);
  if (!to) return { ok: false, error: 'invalid_preview_to' };
  const domain = to.split('@')[1];
  if (!previewDomains.includes(domain)) return { ok: false, error: 'preview_domain_not_allowed' };
  return { ok: true, mode: { kind: 'preview', to } };
}

export function unsubscribeUrl(appUrl: string, token: string | null, unsubBase: string): string {
  if (token && /^https:\/\//.test(unsubBase)) {
    return `${unsubBase}${unsubBase.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
  }
  // No verified token route: the member portal hosts the newsletter opt-out toggle.
  return `${appUrl}/vault-member/`;
}

export function isUnsubscribeToken(token: unknown): token is string {
  return typeof token === 'string' && UNSUBSCRIBE_TOKEN_RE.test(token);
}

/** 128-bit CSPRNG token, lowercase hex — identical shape to the column default. */
export function generateUnsubscribeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate the configured unsubscribe base. `browserReady` is false on the default
 * *.supabase.co host, where the platform serves text/html GETs as text/plain.
 */
export function resolveUnsubscribeBase(raw: string | undefined): { ok: true; base: string; browserReady: boolean } | { ok: false } {
  const base = (raw || DEFAULT_UNSUBSCRIBE_BASE).trim();
  let url: URL;
  try { url = new URL(base); } catch { return { ok: false }; }
  if (url.protocol !== 'https:' || url.hash || url.username || url.password) return { ok: false };
  const host = url.hostname.toLowerCase();
  return { ok: true, base, browserReady: !(host === 'supabase.co' || host.endsWith('.supabase.co')) };
}

/** Recipient display name: no header-breaking or angle characters, bounded. */
export function displayName(raw: unknown): string {
  return String(raw ?? '').replace(/[\r\n\t"<>\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!raw || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export interface RenderInput {
  member: Member;
  activity: Activity;
  stats: StudioStats;
  appUrl: string;
  unsubUrl: string;
  now: Date;
  /** Preview copies say their unsubscribe link is a placeholder. */
  previewNote?: boolean;
}

export function renderIssue({ member, activity, stats, appUrl, unsubUrl, now, previewNote }: RenderInput): { subject: string; html: string } {
  const month = escapeHtml(monthLabel(now));
  const name = escapeHtml(member.username || 'member');
  const app = escapeHtml(appUrl);
  const unsub = escapeHtml(unsubUrl);
  const joined = new Date(member.created_at).getTime();
  const isNew = Number.isFinite(joined) && now.getTime() - joined < 30 * DAY_MS;
  const isActive = activity.recentXp > 0 || activity.games.length > 0;

  const greeting = isNew
    ? `Welcome to the vault, ${name}. You joined recently and we want to make sure you know what's here.`
    : isActive
      ? `You've been active in the vault lately — ${activity.recentXp.toLocaleString('en-US')} XP earned in the last 30 days. Here's what's new.`
      : `The forge has been busy. Here's what's happened in the vault this month.`;

  const personalSection = isActive
    ? `
        <tr><td style="padding:0 0 28px;">
          <div style="background:#0d1220;border:1px solid rgba(255,196,0,0.2);border-radius:12px;padding:20px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#FFC400;margin-bottom:8px;">Your Last 30 Days</div>
            <div style="font-size:22px;font-weight:800;color:#ffffff;margin-bottom:4px;">${activity.recentXp.toLocaleString('en-US')} XP</div>
            <div style="font-size:13px;color:#8b9bb4;">Current rank: <strong style="color:#e2e8f0;">${escapeHtml(getRankTitle(member.points || 0))}</strong></div>
            ${activity.games.length > 0 ? `<div style="font-size:13px;color:#8b9bb4;margin-top:4px;">Games played: ${activity.games.map(escapeHtml).join(', ')}</div>` : ''}
          </div>
        </td></tr>`
    : '';

  const topMembersHtml = stats.topMembers.length > 0 ? `
      <tr><td style="padding:0 0 28px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8b9bb4;margin-bottom:12px;">Top Members</div>
        ${stats.topMembers.map((m, i) => `
        <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:15px;font-weight:800;color:#FFC400;">#${i + 1}</span>
          <span style="font-size:14px;font-weight:700;color:#e2e8f0;margin-left:8px;">${escapeHtml(m.username || 'Vault Member')}</span>
          <div style="font-size:12px;color:#8b9bb4;">${escapeHtml(getRankTitle(m.points || 0))} · ${(m.points || 0).toLocaleString('en-US')} pts</div>
        </div>`).join('')}
      </td></tr>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>VaultSpark Studios — ${month} Dispatch</title>
</head>
<body style="margin:0;padding:0;background:#080c18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080c18;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <tr><td style="padding:0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:#FFC400;"><a href="https://vaultsparkstudios.com/" style="color:#FFC400;text-decoration:none;">VaultSpark Studios</a></td>
            <td align="right" style="font-size:12px;color:#8b9bb4;">${month} Dispatch</td>
          </tr>
        </table>
        <div style="height:1px;background:rgba(255,196,0,0.2);margin-top:16px;"></div>
      </td></tr>

      <tr><td style="padding:0 0 28px;">
        <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;color:#ffffff;margin:0 0 12px;line-height:1.2;">Signal from the Forge</h1>
        <p style="font-size:15px;color:#8b9bb4;line-height:1.7;margin:0;">${greeting}</p>
      </td></tr>

      ${personalSection}

      <tr><td style="padding:0 0 28px;">
        <div style="background:#0d1220;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8b9bb4;margin-bottom:16px;">Vault Stats</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:0 8px 0 0;">
                <div style="font-size:24px;font-weight:800;color:#ffffff;">${stats.totalMembers.toLocaleString('en-US')}</div>
                <div style="font-size:11px;color:#8b9bb4;margin-top:2px;">Total Members</div>
              </td>
              <td align="center" style="padding:0 8px;">
                <div style="font-size:24px;font-weight:800;color:#FFC400;">${stats.activeMembers.toLocaleString('en-US')}${stats.activeMembersAtLeast ? '+' : ''}</div>
                <div style="font-size:11px;color:#8b9bb4;margin-top:2px;">Active in the Last 30 Days</div>
              </td>
            </tr>
          </table>
        </div>
      </td></tr>

      ${topMembersHtml}

      <tr><td style="padding:0 0 32px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:8px;width:50%;">
              <a href="${app}/vault-member/" style="display:block;text-align:center;padding:12px;background:#FFC400;color:#000000;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;">Open Vault Dashboard</a>
            </td>
            <td style="padding-left:8px;width:50%;">
              <a href="${app}/journal/" style="display:block;text-align:center;padding:12px;background:rgba(255,255,255,0.06);color:#e2e8f0;font-size:13px;font-weight:800;text-decoration:none;border-radius:10px;border:1px solid rgba(255,255,255,0.1);">Read Signal Log</a>
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
        <p style="font-size:12px;color:#8b9bb4;margin:0;line-height:1.6;">
          You're receiving this because you're a Vault Member at vaultsparkstudios.com.<br>
          <a href="${unsub}" style="color:#8b9bb4;">Unsubscribe</a> &nbsp;·&nbsp;
          <a href="${app}/privacy/" style="color:#8b9bb4;">Privacy Policy</a>
        </p>
        <p style="font-size:12px;color:#8b9bb4;margin:12px 0 0;line-height:1.6;font-style:normal;">
          ${POSTAL_ADDRESS_LINES.map(escapeHtml).join('<br>\n          ')}
        </p>
        <p style="font-size:12px;color:#8b9bb4;margin:12px 0 0;line-height:1.6;">
          ${previewNote ? 'Preview copy: the unsubscribe link above uses a placeholder token and changes no subscription.<br>' : ''}
          © ${now.getUTCFullYear()} VaultSpark Studios LLC. All rights reserved.
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;

  return { subject: subjectFor(now), html };
}

/** Synthetic member for preview mail. Clearly fake: it matches no row and mails no one. */
export function previewMember(now: Date): Member {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'demo_vault_runner',
    points: 4200,
    // A recent joiner so the preview exercises the richest layout: the named
    // welcome greeting AND the 30-day activity card below it.
    created_at: new Date(now.getTime() - 10 * DAY_MS).toISOString(),
    opted_out: false,
    unsubscribe_token: PREVIEW_UNSUBSCRIBE_TOKEN,
  };
}

/** Plausible, invented activity for the preview copy — no member's real history. */
export const PREVIEW_ACTIVITY: Activity = { recentXp: 1850, games: ['void-drift', 'spark-run'], truncated: false };

export type SendResult =
  | { ok: true; status: number; messageId?: string }
  | { ok: false; status: number; detail: string; retryAfterSeconds?: number };

/**
 * RFC 9110 Retry-After: delta-seconds or an HTTP-date. Returns whole seconds,
 * clamped to [0, MAX_RETRY_AFTER_SECONDS]; null when absent or unparseable.
 */
export function parseRetryAfter(raw: string | null | undefined, now: Date): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else {
    const at = Date.parse(value);
    if (!Number.isFinite(at)) return null;
    seconds = Math.ceil((at - now.getTime()) / 1000);
  }
  if (!Number.isFinite(seconds)) return null;
  return Math.min(MAX_RETRY_AFTER_SECONDS, Math.max(0, Math.trunc(seconds)));
}

/**
 * What a failed send permits us to conclude about the claim row.
 *
 * 'release'   — the provider demonstrably did NOT accept the message, so the claim
 *               can be dropped and the member retried with no risk of a second copy.
 *               4xx is a rejection: the request was understood and refused.
 *               429 belongs here too — a rate limiter refuses BEFORE queueing, so
 *               nothing was delivered and the member must stay claimable (the run
 *               still aborts, so the retry happens on a later invocation).
 * 'uncertain' — delivery can be neither confirmed nor disproved: status 0 (transport
 *               error/timeout — the request may have been received), 408 (the request
 *               timed out somewhere in the middle), and any 5xx (Brevo may have
 *               accepted and then failed to answer). Keep the claim: a release here
 *               is exactly the double-send this guards against.
 */
export type FailureDisposition = 'release' | 'uncertain';

export function dispositionFor(status: number): FailureDisposition {
  if (status === 429) return 'release';
  if (status === 408) return 'uncertain';
  if (status >= 400 && status < 500) return 'release';
  return 'uncertain'; // status 0 (transport), 5xx, and anything unexpected
}

export async function sendViaBrevo(
  fetchFn: typeof fetch,
  apiKey: string,
  msg: { from: string; to: string; name: string; subject: string; html: string; unsubUrl: string },
  now: Date = new Date(),
): Promise<SendResult> {
  const recipient: { email: string; name?: string } = { email: msg.to };
  if (msg.name) recipient.name = msg.name;
  try {
    const res = await fetchFn(BREVO_SEND_URL, {
      method: 'POST',
      // A hung request must not outlive the isolate and strand a 'sending' claim.
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: msg.from },
        to: [recipient],
        subject: msg.subject,
        htmlContent: msg.html,
        // RFC 2369 + RFC 8058 one-click (Gmail/Yahoo bulk-sender requirement).
        headers: { 'List-Unsubscribe': `<${msg.unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    });
    const text = await res.text();
    if (res.status === 201 || res.status === 202) {
      let messageId: string | undefined;
      try {
        const parsed = JSON.parse(text);
        if (typeof parsed?.messageId === 'string') messageId = parsed.messageId;
      } catch { /* body is optional */ }
      return { ok: true, status: res.status, ...(messageId ? { messageId } : {}) };
    }
    const retryAfterSeconds = parseRetryAfter(res.headers.get('retry-after'), now);
    return {
      ok: false, status: res.status, detail: text.slice(0, 200),
      ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
    };
  } catch (err) {
    // Includes the AbortSignal.timeout firing: the request may or may not have
    // reached Brevo, which is why status 0 is classified 'uncertain', never released.
    return { ok: false, status: 0, detail: `transport: ${String(err).slice(0, 120)}` };
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export function createHandler(deps: Deps) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    // Auth first, before reading the body or touching data. Response text stays
    // exactly "Unauthorized" — scripts/deploy-member-newsletter.mjs --verify keys on it.
    const expected = deps.env('NEWSLETTER_SECRET') ?? '';
    if (!expected) console.error('send-member-newsletter: NEWSLETTER_SECRET not configured — refusing all calls');
    const header = req.headers.get('Authorization') ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!(await secretMatches(provided, expected))) {
      return new Response('Unauthorized', { status: 401 });
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: 'body_too_large' }, 413);
    let body: unknown = null;
    if (raw.trim()) {
      try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'invalid_json' }, 400); }
    }
    const previewDomains = (deps.env('NEWSLETTER_PREVIEW_DOMAINS') || '')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const parsed = parseMode(body, previewDomains.length ? previewDomains : DEFAULT_PREVIEW_DOMAINS);
    if (!parsed.ok) return json({ ok: false, error: parsed.error }, 400);
    const mode = parsed.mode;

    const apiKey = deps.env('BREVO_API_KEY') ?? '';
    if (mode.kind !== 'dry-run' && !apiKey) {
      console.error('send-member-newsletter: BREVO_API_KEY not configured');
      return json({ ok: false, error: 'mail_provider_not_configured' }, 503);
    }
    const from = normalizeEmail(deps.env('NEWSLETTER_FROM') || DEFAULT_FROM);
    if (!from) return json({ ok: false, error: 'invalid_sender_config' }, 500);
    const appUrl = (deps.env('APP_URL') || DEFAULT_APP_URL).replace(/\/+$/, '');
    const unsub = resolveUnsubscribeBase(deps.env('NEWSLETTER_UNSUBSCRIBE_BASE'));
    if (!unsub.ok) return json({ ok: false, error: 'invalid_unsubscribe_config' }, 500);
    const unsubBase = unsub.base;

    const now = deps.now();
    const period = periodOf(now);
    const since = new Date(now.getTime() - 30 * DAY_MS).toISOString();
    const subject = subjectFor(now);

    let data: NewsletterData;
    let members: Member[];
    let emails: Map<string, string>;
    let stats: StudioStats;
    // True when a member/email page cap was hit: the audience below is a SUBSET of
    // reality, so no run built on it may ever report itself complete.
    let listTruncated = false;
    try {
      data = deps.data();
      const [memberPage, emailPage, loadedStats] = await Promise.all([
        data.listMembers(),
        data.loadAuthEmails(),
        data.loadStudioStats(since),
      ]);
      members = memberPage.rows;
      emails = emailPage.emails;
      stats = loadedStats;
      listTruncated = memberPage.truncated || emailPage.truncated;
      if (listTruncated) {
        console.error('send-member-newsletter: member/email listing hit its page cap — audience is incomplete');
      }
    } catch (err) {
      console.error('send-member-newsletter: data load failed', String(err).slice(0, 200));
      return json({ ok: false, error: 'data_load_failed' }, 500);
    }

    const optedIn = members.filter((m) => !m.opted_out);
    const eligible = optedIn.filter((m) => emails.has(m.id));
    const optedOut = members.length - optedIn.length;
    const noEmail = optedIn.length - eligible.length;

    // ── Dry run: counts only, no addresses, names, or ids in the response ──
    if (mode.kind === 'dry-run') {
      let logged: Set<string>;
      try {
        logged = await data.loadLoggedUserIds(period);
      } catch (err) {
        console.error('send-member-newsletter: log load failed', String(err).slice(0, 200));
        return json({ ok: false, error: 'data_load_failed' }, 500);
      }
      const alreadySent = eligible.filter((m) => logged.has(m.id)).length;
      return json({
        ok: true, mode: 'dry-run', period,
        members: members.length, eligible: eligible.length, optedOut, noEmail,
        alreadySent, wouldSend: eligible.length - alreadySent,
        sampleSubject: subject, providerConfigured: Boolean(apiKey),
        unsubscribeRouteBrowserReady: unsub.browserReady,
        // Honest caps: a truncated audience means these counts are floors, not totals.
        listTruncated, activeMembersAtLeast: stats.activeMembersAtLeast,
      });
    }

    const buildFor = async (member: Member, token: string, previewNote = false) => {
      // Never mail without a working token route: the portal fallback is not an unsubscribe.
      if (!isUnsubscribeToken(token)) throw new Error('missing unsubscribe token');
      const activity = await data.loadActivity(member.id, since);
      const unsubUrl = unsubscribeUrl(appUrl, token, unsubBase);
      return {
        ...renderIssue({ member, activity, stats, appUrl, unsubUrl, now, previewNote }),
        unsubUrl, activityTruncated: activity.truncated,
      };
    };

    // ── Preview: SYNTHETIC member data, delivered only to previewTo, no log ──
    // No real member is rendered: a preview leaked the highest-points member's
    // username and XP regardless of their public_profile choice.
    if (mode.kind === 'preview') {
      try {
        const sample = previewMember(now);
        const unsubUrl = unsubscribeUrl(appUrl, PREVIEW_UNSUBSCRIBE_TOKEN, unsubBase);
        const issue = {
          ...renderIssue({ member: sample, activity: PREVIEW_ACTIVITY, stats, appUrl, unsubUrl, now, previewNote: true }),
          unsubUrl,
        };
        const result = await sendViaBrevo(deps.fetch, apiKey, {
          from, to: mode.to, name: 'Preview', subject: `[PREVIEW] ${issue.subject}`, html: issue.html, unsubUrl: issue.unsubUrl,
        }, now);
        if (!result.ok) {
          console.error('send-member-newsletter: preview rejected', result.status, result.detail);
          return json({ ok: false, mode: 'preview', period, sent: 0, skipped: 0, failed: 1, providerStatus: result.status }, 502);
        }
        return json({
          ok: true, mode: 'preview', period, sent: 1, skipped: 0, failed: 0,
          subject: `[PREVIEW] ${issue.subject}`, unsubscribeRouteBrowserReady: unsub.browserReady,
          synthetic: true, eligible: eligible.length,
          ...(result.messageId ? { messageId: result.messageId } : {}),
        });
      } catch (err) {
        console.error('send-member-newsletter: preview build failed', String(err).slice(0, 200));
        return json({ ok: false, mode: 'preview', period, sent: 0, skipped: 0, failed: 1, error: 'build_failed' }, 500);
      }
    }

    // ── Send ──
    // CAN-SPAM / GDPR: the visible link must work in a browser. On *.supabase.co the
    // confirmation page arrives as text/plain, so refuse before claiming anyone.
    if (!unsub.browserReady) {
      console.error('send-member-newsletter: NEWSLETTER_UNSUBSCRIBE_BASE is the default supabase.co host — refusing real send');
      return json({ ok: false, mode: 'send', period, sent: 0, error: 'unsubscribe_route_not_browser_ready' }, 503);
    }
    const budgetMs = clampInt(deps.env('NEWSLETTER_TIME_BUDGET_MS'), 110_000, 5_000, MAX_TIME_BUDGET_MS);
    const throttleMs = clampInt(deps.env('NEWSLETTER_THROTTLE_MS'), 250, 0, 5_000);
    const started = now.getTime();

    // Startup sweep. A claim left in 'sending' by an isolate that died mid-send (a hung
    // provider request, an eviction) would otherwise block that member for the whole
    // period and read as alreadySent in dry-run. Only THIS period's rows, only
    // status='sending', only those older than STALE_CLAIM_MS.
    //
    // Why this cannot steal a row from a concurrent invocation: an invocation returns
    // after at most MAX_TIME_BUDGET_MS (380s) plus one SEND_TIMEOUT_MS (20s), so every
    // claim a live invocation holds is younger than ~6.7 minutes. A 15-minute-old
    // 'sending' row can therefore only belong to an invocation that no longer exists.
    // Rows marked 'uncertain' are deliberately never swept — they are held for operator
    // review precisely because delivery could not be disproved.
    let swept = 0;
    try {
      swept = await data.sweepStaleClaims(period, new Date(started - STALE_CLAIM_MS).toISOString());
      if (swept > 0) console.log('send-member-newsletter: released stale sending claim(s)', swept);
    } catch (err) {
      console.error('send-member-newsletter: stale-claim sweep failed', String(err).slice(0, 160));
    }

    let sent = 0;
    let skipped = 0;
    let failedPermanent = 0;
    let uncertain = 0;
    let activityTruncated = 0;
    let processed = 0;
    let aborted: string | null = null;
    let retryAfterSeconds: number | null = null;

    for (const member of eligible) {
      if (deps.now().getTime() - started > budgetMs) break;
      processed++;

      const claim = await data.claim(member.id, period);
      if (claim === 'exists') { skipped++; continue; }
      if (claim === 'error') { failedPermanent++; continue; }

      // 'release' is the default only for paths where nothing was ever handed to the
      // provider (build failure, token failure, late opt-out).
      let outcome: 'delivered' | 'release' | 'uncertain' = 'release';
      let lateOptOut = false;
      try {
        let token = member.unsubscribe_token;
        if (!isUnsubscribeToken(token)) {
          const ensured = await data.ensureUnsubscribeToken(member.id);
          if (ensured.optedOut) lateOptOut = true;
          token = ensured.token;
        }
        if (lateOptOut) throw new Error('late opt-out');
        const issue = await buildFor(member, token ?? '');
        if (issue.activityTruncated) activityTruncated++;
        const result = await sendViaBrevo(deps.fetch, apiKey, {
          from,
          to: emails.get(member.id)!,
          name: displayName(member.username),
          subject: issue.subject,
          html: issue.html,
          unsubUrl: issue.unsubUrl,
        }, now);
        if (result.ok) {
          outcome = 'delivered';
          sent++;
          console.log('send-member-newsletter: sent', member.id, result.messageId ?? '(no messageId)');
          try {
            await data.markSent(member.id, period);
          } catch (err) {
            // The mail went out; the claim row still blocks a resend, so only the status is stale.
            console.error('send-member-newsletter: markSent failed', member.id, String(err).slice(0, 120));
          }
        } else {
          outcome = dispositionFor(result.status);
          if (outcome === 'uncertain') uncertain++; else failedPermanent++;
          console.error('send-member-newsletter: brevo rejected', member.id, result.status, outcome, result.detail);
          if (result.status === 401 || result.status === 403) {
            aborted = 'provider_auth_rejected';
          } else if (result.status === 429) {
            // A rate limit at member 40 must not burn every remaining member in seconds.
            // Abort instead: unclaimed members stay claimable and the next invocation
            // resumes. Retry-After is surfaced rather than slept through, so the pause
            // happens between invocations instead of inside this one's time budget.
            aborted = 'provider_rate_limited';
            retryAfterSeconds = result.retryAfterSeconds ?? null;
          }
        }
      } catch (err) {
        if (lateOptOut) {
          skipped++;
          console.log('send-member-newsletter: skipped (opted out in preferences)', member.id);
        } else {
          failedPermanent++;
          console.error('send-member-newsletter: build/send failed', member.id, String(err).slice(0, 200));
        }
      }

      if (outcome === 'uncertain') {
        try {
          await data.markUncertain(member.id, period);
        } catch (err) {
          // The claim row survives either way, which is the property that matters.
          console.error('send-member-newsletter: markUncertain failed', member.id, String(err).slice(0, 120));
        }
      } else if (outcome !== 'delivered') {
        try {
          await data.release(member.id, period);
        } catch (err) {
          console.error('send-member-newsletter: release failed (member will be skipped this period)', member.id, String(err).slice(0, 120));
        }
      }
      if (aborted) break;
      if (throttleMs > 0) await deps.sleep(throttleMs);
    }

    const remaining = eligible.length - processed;
    // `failed` stays the total of everything not delivered (permanent + uncertain) so
    // the workflow's `failed > 0` gate still fails the run visibly; the split is
    // reported alongside it for the operator.
    const failed = failedPermanent + uncertain;
    return json({
      ok: failed === 0 && !aborted && !listTruncated,
      mode: 'send', period,
      eligible: eligible.length, sent, skipped, failed, failedPermanent, uncertain, remaining,
      // A truncated audience can never be "complete": the workflow keeps re-invoking
      // and then reports the incompleteness rather than declaring a partial run done.
      complete: remaining === 0 && !aborted && !listTruncated,
      optedOut, noEmail, swept, listTruncated,
      ...(activityTruncated ? { activityTruncated } : {}),
      ...(stats.activeMembersAtLeast ? { activeMembersAtLeast: true } : {}),
      ...(aborted ? { aborted } : {}),
      ...(retryAfterSeconds === null ? {} : { retryAfterSeconds }),
    });
  };
}

// ── Supabase data implementation ────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type Client = any;
type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message?: string } | null }>;

/**
 * Read every page, up to `maxPages`. `truncated` reports whether the cap was reached
 * instead of the end of the data — the caller must surface that, never swallow it.
 * A final page that exactly fills PAGE_SIZE is reported as truncated (conservative:
 * we cannot tell it apart from more rows waiting).
 */
async function pageAll<T>(build: (from: number, to: number) => PageResult<T>, maxPages = 50): Promise<Paged<T>> {
  const out: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const { data, error } = await build(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw new Error(error.message ?? 'query failed');
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return { rows: out, truncated: false };
  }
  return { rows: out, truncated: true };
}

export function supabaseData(client: Client): NewsletterData {
  return {
    async listMembers() {
      type Row = {
        id: string; username: string | null; points: number | null; created_at: string;
        newsletter_preferences: { opted_out: boolean | null; unsubscribe_token: string | null }
          | { opted_out: boolean | null; unsubscribe_token: string | null }[] | null;
      };
      // Ordered by id ONLY. Paging by a mutable column (points desc) let a member's
      // points change between pages and drop them out of the listing entirely — the
      // member would silently never be mailed. Points-based ordering belongs to the
      // decorative top-members query below, not to the pagination key.
      const page = await pageAll<Row>((a, b) => client.from('vault_members')
        .select('id, username, points, created_at, newsletter_preferences(opted_out, unsubscribe_token)')
        .order('id', { ascending: true })
        .range(a, b));
      return {
        truncated: page.truncated,
        rows: page.rows.map((r) => {
          const prefs = Array.isArray(r.newsletter_preferences) ? r.newsletter_preferences[0] : r.newsletter_preferences;
          return {
            id: r.id, username: r.username, points: r.points, created_at: r.created_at,
            opted_out: Boolean(prefs?.opted_out), unsubscribe_token: prefs?.unsubscribe_token ?? null,
          };
        }),
      };
    },

    async loadAuthEmails() {
      const emails = new Map<string, string>();
      const MAX_PAGES = 100;
      let truncated = true;
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
        if (error) throw error;
        const users = data?.users ?? [];
        for (const user of users) {
          // Only confirmed, non-anonymous addresses: an unconfirmed signup could name someone else's inbox.
          if (user.id && user.email && user.email_confirmed_at && !user.is_anonymous) emails.set(user.id, user.email);
        }
        if (users.length < PAGE_SIZE) { truncated = false; break; }
      }
      return { emails, truncated };
    },

    async loadLoggedUserIds(period) {
      const page = await pageAll<{ user_id: string }>((a, b) => client.from('member_newsletter_log')
        .select('user_id').eq('period', period).order('user_id', { ascending: true }).range(a, b));
      // Dry-run only. A cap hit would understate alreadySent, so say so out loud.
      if (page.truncated) console.error('send-member-newsletter: newsletter log listing hit its page cap — alreadySent is a floor');
      return new Set(page.rows.map((r) => r.user_id));
    },

    async loadStudioStats(sinceIso) {
      const [totalRes, activePage, topRes] = await Promise.all([
        client.from('vault_members').select('id', { count: 'exact', head: true }),
        // 100 pages = 100k point_events in 30 days. Past that activeMembers is a floor
        // and the issue renders "N+" instead of a number it cannot stand behind.
        pageAll<{ user_id: string }>((a, b) => client.from('point_events')
          .select('user_id').gte('created_at', sinceIso).order('id', { ascending: true }).range(a, b), 100),
        // Leaderboard opt-out is honoured: only public profiles are named.
        client.from('vault_members').select('username, points').eq('public_profile', true)
          .order('points', { ascending: false }).limit(3),
      ]);
      if (totalRes.error) throw new Error(totalRes.error.message);
      // The top list is decorative: a failure omits the section rather than blocking the issue.
      if (topRes.error) console.error('send-member-newsletter: top members query failed', String(topRes.error.message ?? '').slice(0, 120));
      return {
        totalMembers: totalRes.count ?? 0,
        activeMembers: new Set(activePage.rows.map((r) => r.user_id)).size,
        activeMembersAtLeast: activePage.truncated,
        topMembers: topRes.error ? [] : (topRes.data ?? []),
      };
    },

    async loadActivity(userId, sinceIso) {
      // Paged rather than a bare limit(1000): a busy member's 30-day history used to be
      // cut off at exactly 1000 rows with no indication, understating their own XP.
      const [xpPage, gamesPage] = await Promise.all([
        pageAll<{ points: number | null }>((a, b) => client.from('point_events')
          .select('points').eq('user_id', userId).gte('created_at', sinceIso)
          .order('id', { ascending: true }).range(a, b), 20),
        pageAll<{ game_slug: string | null }>((a, b) => client.from('game_sessions')
          .select('game_slug').eq('user_id', userId).gte('played_at', sinceIso)
          .order('id', { ascending: true }).range(a, b), 20),
      ]);
      // Earned XP only: gifts sent and treasury purchases are negative rows.
      const recentXp = xpPage.rows.reduce((s: number, e: { points: number | null }) => s + Math.max(0, e.points ?? 0), 0);
      const games = [...new Set(gamesPage.rows.map((g) => g.game_slug).filter(Boolean))] as string[];
      return { recentXp, games, truncated: xpPage.truncated || gamesPage.truncated };
    },

    async claim(userId, period) {
      const { error } = await client.from('member_newsletter_log').insert({ user_id: userId, period, status: 'sending' });
      if (!error) return 'claimed';
      if (error.code === '23505') return 'exists';
      console.error('send-member-newsletter: claim failed', userId, error.code ?? '', String(error.message ?? '').slice(0, 120));
      return 'error';
    },

    async markSent(userId, period) {
      const { error } = await client.from('member_newsletter_log')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('user_id', userId).eq('period', period);
      if (error) throw new Error(error.message);
    },

    async release(userId, period) {
      const { error } = await client.from('member_newsletter_log')
        .delete().eq('user_id', userId).eq('period', period).eq('status', 'sending');
      if (error) throw new Error(error.message);
    },

    // The claim row is KEPT (status only) — that is the whole point: delivery could not
    // be disproved, so a resend must stay impossible until an operator looks.
    async markUncertain(userId, period) {
      const { error } = await client.from('member_newsletter_log')
        .update({ status: 'uncertain', sent_at: new Date().toISOString() })
        .eq('user_id', userId).eq('period', period).eq('status', 'sending');
      if (error) throw new Error(error.message);
    },

    async sweepStaleClaims(period, olderThanIso) {
      const { data, error } = await client.from('member_newsletter_log')
        .delete().eq('period', period).eq('status', 'sending').lt('sent_at', olderThanIso)
        .select('user_id');
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    },

    // newsletter_preferences (supabase-phase45-newsletter.sql): PK user_id,
    // opted_out DEFAULT false, unsubscribe_token text DEFAULT 32-hex. The service
    // role bypasses RLS. The token is supplied explicitly so the insert does not
    // depend on pgcrypto's gen_random_bytes being on the search_path.
    async ensureUnsubscribeToken(userId) {
      const fresh = generateUnsubscribeToken();
      // INSERT … ON CONFLICT (user_id) DO NOTHING: an existing row (and its opted_out) is never overwritten.
      const ins = await client.from('newsletter_preferences')
        .upsert({ user_id: userId, unsubscribe_token: fresh }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (ins.error) throw new Error(String(ins.error.message ?? 'prefs insert failed'));
      const sel = await client.from('newsletter_preferences')
        .select('opted_out, unsubscribe_token').eq('user_id', userId).maybeSingle();
      if (sel.error || !sel.data) throw new Error(String(sel.error?.message ?? 'prefs row missing after insert'));
      let row = sel.data as { opted_out: boolean | null; unsubscribe_token: string | null };
      if (!isUnsubscribeToken(row.unsubscribe_token)) {
        // A row with a null/malformed token never had a working link; replace it.
        const upd = await client.from('newsletter_preferences')
          .update({ unsubscribe_token: fresh, updated_at: new Date().toISOString() })
          .eq('user_id', userId).select('opted_out, unsubscribe_token').maybeSingle();
        if (upd.error || !upd.data) throw new Error(String(upd.error?.message ?? 'prefs token update failed'));
        row = upd.data;
      }
      if (!isUnsubscribeToken(row.unsubscribe_token)) throw new Error('prefs token still malformed');
      return { token: row.unsubscribe_token, optedOut: Boolean(row.opted_out) };
    },
  };
}

// ── Entrypoint ──────────────────────────────────────────────────────────────

if (!(globalThis as { __NEWSLETTER_NO_SERVE__?: boolean }).__NEWSLETTER_NO_SERVE__) {
  Deno.serve(createHandler({
    env: (name) => Deno.env.get(name),
    data: () => supabaseData(createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )),
    fetch: (input, init) => fetch(input, init),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    now: () => new Date(),
  }));
}
