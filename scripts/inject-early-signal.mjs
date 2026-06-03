#!/usr/bin/env node
/**
 * inject-early-signal.mjs — Add the shared "Notify Me" early-access form
 * to every project/game landing page that doesn't already have one.
 *
 * Idempotent via <form class="notify-me-form"> marker check.
 * Derives the display name from <title> (trimming the " | VaultSpark Studios" tail)
 * or falls back to the first <h1>.
 *
 * Usage: node scripts/inject-early-signal.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const DRY = process.argv.includes('--dry-run');

// Meta pages whose whole point IS the signup funnel — a second email form
// would be redundant with the primary CTA.
const EXCLUDES = new Set(['projects/vault-member', 'projects/vault-pipeline']);

const TARGETS = [
  ...fs.readdirSync(path.join(ROOT, 'projects')).filter(d => {
    const p = path.join(ROOT, 'projects', d, 'index.html');
    return fs.existsSync(p);
  }).map(d => `projects/${d}`),
  ...fs.readdirSync(path.join(ROOT, 'games')).filter(d => {
    const p = path.join(ROOT, 'games', d, 'index.html');
    return fs.existsSync(p);
  }).map(d => `games/${d}`),
];

function extractName(html, slug) {
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) return t[1].split(/\s*[—|·]\s*/)[0].trim();
  const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1) return h1[1].trim();
  return slug.split('/')[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function section(name) {
  return `
    <!-- Notify Me — Early Access (auto-injected by scripts/inject-early-signal.mjs) -->
    <section style="padding:2.5rem 0;border-top:1px solid rgba(255,255,255,0.06);">
      <div class="container">
        <div style="background:linear-gradient(135deg,rgba(255,196,0,0.06),rgba(13,17,28,0.97));border:1px solid rgba(255,196,0,0.18);border-radius:18px;padding:2rem 2.25rem;">
          <div style="font-size:0.72rem;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;color:var(--gold);margin-bottom:0.6rem;">Early Signal</div>
          <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.55rem;font-weight:400;letter-spacing:-0.025em;margin:0 0 0.4rem;color:var(--text);">Get the First Signal from ${name}</h2>
          <p style="color:var(--muted);font-size:0.93rem;line-height:1.6;max-width:52ch;margin:0 0 1.25rem;">Drop your email — we'll notify you the moment ${name} opens.</p>
          <form class="notify-me-form" data-game="${name}" novalidate>
            <input type="hidden" name="access_key" value="af76f2ed-d5fd-4b28-8b73-a2e47be2bb71" />
            <div class="notify-me-fields" style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
              <input type="email" name="email" required placeholder="you@email.com" autocomplete="email" style="flex:1;min-width:210px;height:44px;padding:0 1rem;border-radius:10px;border:1px solid rgba(255,196,0,0.25);background:rgba(255,255,255,0.05);color:var(--text);font-size:0.92rem;font-family:inherit;outline:none;" />
              <button type="submit" class="button button-sm" style="height:44px;background:linear-gradient(135deg,#FFC400,#FF7A00);color:#000;font-weight:800;border:none;">Notify Me</button>
            </div>
            <p class="notify-me-feedback" hidden style="margin-top:0.75rem;font-size:0.88rem;line-height:1.5;"></p>
          </form>
        </div>
      </div>
    </section>
    <script src="/assets/notify-me.js" defer></script>
`;
}

let written = 0, skipped = 0, noAnchor = 0, excluded = 0;
for (const slug of TARGETS) {
  if (EXCLUDES.has(slug)) { excluded++; continue; }
  const file = path.join(ROOT, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  if (/class="notify-me-form"/i.test(html)) { skipped++; continue; }
  const name = extractName(html, slug);
  const block = section(name);
  // Insert right before </main>, or before </footer class=..., or before </body>
  let out;
  if (html.includes('</main>')) {
    out = html.replace(/<\/main>/i, block + '\n  </main>');
  } else if (/<footer class="site-footer"/i.test(html)) {
    out = html.replace(/<footer class="site-footer"/i, block + '\n<footer class="site-footer"');
  } else if (html.includes('</body>')) {
    out = html.replace('</body>', block + '\n</body>');
  } else {
    noAnchor++;
    console.log(`[no-anchor] ${slug}`);
    continue;
  }
  if (DRY) {
    console.log(`[dry-run] would inject into ${slug} (name="${name}")`);
  } else {
    fs.writeFileSync(file, out, 'utf8');
    console.log(`injected: ${slug} (name="${name}")`);
  }
  written++;
}
console.log(`\nDone. Injected: ${written}, Skipped (already has form): ${skipped}, Excluded (meta): ${excluded}, No anchor: ${noAnchor}`);
