const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'https://vaultsparkstudios.com';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'mobile-audit');
const FINDINGS_PATH = path.join(OUT_DIR, 'findings.jsonl');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (fs.existsSync(FINDINGS_PATH)) fs.rmSync(FINDINGS_PATH);

const VIEWPORTS = [
  { name: 'iphone-se',      width: 360,  height: 640,  isMobile: true  },
  { name: 'iphone-14',      width: 390,  height: 844,  isMobile: true  },
  { name: 'iphone-pro-max', width: 430,  height: 932,  isMobile: true  },
  { name: 'ipad-portrait',  width: 768,  height: 1024, isMobile: false },
  { name: 'ipad-landscape', width: 1024, height: 768,  isMobile: false },
];

const PAGES = [
  { id: 'home',               url: '/' },
  { id: 'games-landing',      url: '/games/' },
  { id: 'game-cod',           url: '/games/call-of-doodie/' },
  { id: 'game-gridiron',      url: '/games/gridiron-gm/' },
  { id: 'game-solara',        url: '/games/solara/' },
  { id: 'game-vaultfront',    url: '/games/vaultfront/' },
  { id: 'game-mindframe',     url: '/games/mindframe/' },
  { id: 'game-the-exodus',    url: '/games/the-exodus/' },
  { id: 'game-unknown',       url: '/games/project-unknown/' },
  { id: 'game-vs-fb-gm',      url: '/games/franchise-architect/' },
  { id: 'projects-landing',   url: '/projects/' },
  { id: 'project-vorn',       url: '/projects/vorn/' },
  { id: 'project-velaxis',    url: '/projects/velaxis/' },
  { id: 'project-promogrind', url: '/projects/promogrind/' },
  { id: 'project-statvault',  url: '/projects/statvault/' },
  { id: 'project-canon',      url: '/projects/canon/' },
  { id: 'project-ideaforge',  url: '/projects/ideaforge/' },
  { id: 'project-living',     url: '/projects/the-living-protocol/' },
  { id: 'project-signal',     url: '/projects/signal-log/' },
  { id: 'project-vmember',    url: '/projects/vault-member/' },
  { id: 'project-vfront',     url: '/projects/vaultfront/' },
  { id: 'project-vpipe',      url: '/projects/vault-pipeline/' },
  { id: 'universe-landing',   url: '/universe/' },
  { id: 'universe-voidfall',  url: '/universe/voidfall/' },
  { id: 'universe-dreadspike',url: '/universe/dreadspike/' },
  { id: 'membership',         url: '/membership/' },
  { id: 'membership-value',   url: '/membership-value/' },
  { id: 'vault-wall',         url: '/vault-wall/' },
  { id: 'vault-member',       url: '/vault-member/' },
  { id: 'vaultsparked',       url: '/vaultsparked/' },
  { id: 'studio',             url: '/studio/' },
  { id: 'studio-hub',         url: '/studio-hub/' },
  { id: 'studio-pulse',       url: '/studio-pulse/' },
  { id: 'ignis',              url: '/ignis/' },
  { id: 'leaderboards',       url: '/leaderboards/' },
  { id: 'leaderboard-global', url: '/leaderboards/global/' },
  { id: 'journal',            url: '/journal/' },
  { id: 'journal-post',       url: '/journal/vault-opened/' },
  { id: 'contact',            url: '/contact/' },
  { id: 'join',               url: '/join/' },
  { id: 'faq',                url: '/faq/' },
  { id: 'roadmap',            url: '/roadmap/' },
  { id: 'press',              url: '/press/' },
  { id: 'ranks',              url: '/ranks/' },
  { id: 'changelog',          url: '/changelog/' },
  { id: 'status',             url: '/status/' },
  { id: 'notebook',           url: '/notebook/' },
  { id: 'community',          url: '/community/' },
];

function appendFinding(rec) {
  fs.appendFileSync(FINDINGS_PATH, JSON.stringify(rec) + '\n');
}

// Gather mobile-relevant diagnostics from the live page.
async function collectDiagnostics(page, viewport) {
  return await page.evaluate((vpWidth) => {
    const issues = [];

    // 1) horizontal overflow at the document level
    const docWidth = document.documentElement.scrollWidth;
    const innerWidth = window.innerWidth;
    if (docWidth > innerWidth + 1) {
      issues.push({
        severity: 'P0',
        type: 'horizontal-overflow',
        detail: `document scrollWidth=${docWidth} > viewport=${innerWidth}`,
      });
    }

    // 2) elements extending past the viewport (top offenders)
    //    Skip offenders whose ancestor chain contains an overflow-clipping container —
    //    those are intentional responsive patterns (scrollable tables, clipped hero orbs).
    function hasClippingAncestor(el) {
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        const cs = getComputedStyle(cur);
        if (cs.overflowX === 'hidden' || cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'clip' ||
            cs.overflow  === 'hidden' || cs.overflow  === 'auto' || cs.overflow  === 'scroll' || cs.overflow  === 'clip') {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    }
    const overflowing = [];
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > innerWidth + 1) {
        if (hasClippingAncestor(el)) continue;
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          cls: (el.className && el.className.toString().slice(0, 80)) || null,
          right: Math.round(r.right),
          width: Math.round(r.width),
        });
      }
    }
    if (overflowing.length) {
      // dedupe & cap
      const seen = new Set();
      const unique = [];
      for (const o of overflowing) {
        const k = `${o.tag}|${o.id}|${o.cls}|${o.width}`;
        if (seen.has(k)) continue;
        seen.add(k);
        unique.push(o);
        if (unique.length >= 8) break;
      }
      issues.push({
        severity: 'P0',
        type: 'element-overflow',
        detail: `${overflowing.length} element(s) extend past viewport`,
        offenders: unique,
      });
    }

    // 3) tap target size — only on mobile widths
    if (vpWidth <= 430) {
      const interactive = document.querySelectorAll('a, button, [role="button"], input[type="button"], input[type="submit"]');
      const tooSmall = [];
      for (const el of interactive) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.top < 0 || r.top > window.innerHeight) continue; // skip off-screen
        // skip inline links inside paragraphs (visually appropriate)
        const parent = el.parentElement;
        const inProse = parent && /^(P|LI|SPAN|SMALL|EM|STRONG)$/.test(parent.tagName);
        if (inProse) continue;
        const minDim = Math.min(r.width, r.height);
        if (minDim < 40) {
          tooSmall.push({
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
      if (tooSmall.length) {
        issues.push({
          severity: 'P1',
          type: 'tap-target-too-small',
          detail: `${tooSmall.length} interactive element(s) under 40px min-dim`,
          offenders: tooSmall.slice(0, 8),
        });
      }
    }

    // 4) unreadable font sizes on mobile
    if (vpWidth <= 430) {
      const smallText = [];
      const textNodes = document.querySelectorAll('p, li, span, small, a, button, td, th, label, figcaption');
      for (const el of textNodes) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const text = (el.innerText || '').trim();
        if (text.length < 8) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs && fs < 13) {
          smallText.push({
            tag: el.tagName.toLowerCase(),
            fs: Math.round(fs * 10) / 10,
            text: text.slice(0, 50),
          });
        }
      }
      if (smallText.length) {
        issues.push({
          severity: 'P2',
          type: 'font-too-small',
          detail: `${smallText.length} text block(s) under 13px`,
          offenders: smallText.slice(0, 6),
        });
      }
    }

    // 5) images without width/height attributes (CLS risk)
    const imgsNoDim = [];
    document.querySelectorAll('img').forEach(img => {
      if (!img.getAttribute('width') || !img.getAttribute('height')) {
        const r = img.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        imgsNoDim.push({
          src: (img.getAttribute('src') || '').slice(0, 80),
          w: Math.round(r.width),
          h: Math.round(r.height),
        });
      }
    });
    if (imgsNoDim.length) {
      issues.push({
        severity: 'P2',
        type: 'img-missing-dimensions',
        detail: `${imgsNoDim.length} image(s) without width/height attrs`,
        offenders: imgsNoDim.slice(0, 5),
      });
    }

    // 6) fixed-width elements (common mobile breaker) — skip if clipped
    const fixedWidth = [];
    for (const el of all) {
      const cs = getComputedStyle(el);
      const w = cs.width;
      if (w && w.endsWith('px')) {
        const px = parseFloat(w);
        if (px > vpWidth) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (hasClippingAncestor(el)) continue;
          fixedWidth.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            cls: (el.className && el.className.toString().slice(0, 60)) || null,
            w: Math.round(px),
          });
        }
      }
    }
    if (fixedWidth.length) {
      issues.push({
        severity: 'P1',
        type: 'fixed-width-exceeds-viewport',
        detail: `${fixedWidth.length} element(s) with fixed px width > viewport`,
        offenders: fixedWidth.slice(0, 5),
      });
    }

    // 7) viewport meta
    const vpMeta = document.querySelector('meta[name="viewport"]');
    if (!vpMeta) {
      issues.push({ severity: 'P0', type: 'missing-viewport-meta', detail: 'no <meta name="viewport">' });
    } else {
      const content = vpMeta.getAttribute('content') || '';
      if (!/width=device-width/.test(content)) {
        issues.push({ severity: 'P0', type: 'viewport-meta-bad', detail: `content="${content}"` });
      }
      if (/user-scalable\s*=\s*no/.test(content) || /maximum-scale\s*=\s*1(\.0)?[^\d]/.test(content)) {
        issues.push({ severity: 'P1', type: 'viewport-blocks-zoom', detail: `content="${content}"` });
      }
    }

    return issues;
  }, viewport.width);
}

for (const vp of VIEWPORTS) {
  test.describe(`[${vp.name}] ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const p of PAGES) {
      test(`${p.id}`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

        const resp = await page.goto(BASE + p.url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => { errors.push(`nav: ${e.message}`); return null; });

        if (!resp || !resp.ok()) {
          appendFinding({
            page: p.id, url: p.url, viewport: vp.name, width: vp.width,
            status: resp ? resp.status() : 'no-response',
            issues: [{ severity: 'P0', type: 'page-did-not-load', detail: `HTTP ${resp ? resp.status() : 'n/a'}` }],
            console: errors.slice(0, 10),
          });
          return;
        }

        await page.waitForTimeout(800); // let layout + fonts settle
        const issues = await collectDiagnostics(page, vp).catch(e => [{ severity: 'P0', type: 'diag-failed', detail: e.message }]);

        // screenshot only mobile widths + new finding pages
        const shotPath = path.join(OUT_DIR, `${p.id}__${vp.name}.png`);
        if (vp.isMobile || issues.length > 0) {
          await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
        }

        appendFinding({
          page: p.id,
          url: p.url,
          viewport: vp.name,
          width: vp.width,
          status: resp.status(),
          issues,
          console: errors.slice(0, 10),
          screenshot: fs.existsSync(shotPath) ? path.relative(path.join(__dirname, '..'), shotPath).replace(/\\/g, '/') : null,
        });
      });
    }
  });
}
