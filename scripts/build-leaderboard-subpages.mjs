#!/usr/bin/env node
/**
 * build-leaderboard-subpages.mjs
 * Generates 7 leaderboard SEO sub-pages under leaderboards/{slug}/index.html
 * Each page: correct title, h1, "View Full Leaderboard" link, BreadcrumbList + FAQPage JSON-LD
 * Run: node scripts/build-leaderboard-subpages.mjs [--check]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const ALL_PAGES = [
  {
    slug: 'global',
    title: 'Global Leaderboard — All-Time Vault Rankings',
    h1: 'Global Leaderboard',
    description: 'The all-time Vault Point rankings across every VaultSpark Studios game and activity. Compete, earn points, and climb to the top.',
    faqQ: 'What is the Global Leaderboard?',
    faqA: 'The Global Leaderboard ranks every Vault Member by total Vault Points earned across all VaultSpark games, challenges, and community activity. Points accumulate over time — there is no reset.',
    anchor: '#global',
  },
  {
    slug: 'challenges',
    title: 'Challenge Leaderboard — Top Community Challengers',
    h1: 'Challenge Leaderboard',
    description: 'Rankings for VaultSpark Studios community challenges. Complete weekly and seasonal challenges to earn bonus points and rise in the standings.',
    faqQ: 'What is the Challenge Leaderboard?',
    faqA: 'The Challenge Leaderboard tracks members who complete community challenges for bonus Vault Points. New challenges drop weekly. Completing them earns extra points and boosts your rank.',
    anchor: '#challenges',
  },
  {
    slug: 'recruiters',
    title: 'Recruiters Leaderboard — Top Vault Referrers',
    h1: 'Recruiters Leaderboard',
    description: 'The top Vault Members who have referred the most new players to VaultSpark Studios. Earn bonus Vault Points every time a referral joins and plays.',
    faqQ: 'What is the Recruiters Leaderboard?',
    faqA: 'The Recruiters Leaderboard ranks Vault Members by the number of successful referrals they have made. Each new member you refer earns you Vault Points and appears in your recruiter count.',
    anchor: '#referrals',
  },
  {
    slug: 'football-gm',
    title: 'Franchise Architect Leaderboard — Franchise Architect Rankings',
    h1: 'Franchise Architect Leaderboard',
    description: 'Vault Member rankings for Franchise Architect. Earn points by playing, winning, and contributing to the community.',
    faqQ: 'What is the Franchise Architect Leaderboard?',
    faqA: 'The Franchise Architect Leaderboard ranks Vault Members who play Franchise Architect. Points are earned through gameplay activity, wins, and community contributions in the game.',
    anchor: '#football',
  },
  {
    slug: 'call-of-doodie',
    title: 'Call of Doodie Leaderboard — Top Players',
    h1: 'Call of Doodie Leaderboard',
    description: 'Top Vault Members in Call of Doodie ranked by Vault Points earned through gameplay and community activity.',
    faqQ: 'What is the Call of Doodie Leaderboard?',
    faqA: 'The Call of Doodie Leaderboard ranks Vault Members by Vault Points earned while playing Call of Doodie. Play more, earn more points, climb higher.',
    anchor: '#doodie',
  },
  {
    slug: 'teams',
    title: 'Team Rankings — VaultSpark Community Teams',
    h1: 'Team Rankings',
    description: 'Community team rankings for VaultSpark Studios. Form a team, recruit members, and compete together for team Vault Points.',
    faqQ: 'What are the Team Rankings?',
    faqA: 'The Team Rankings show how community teams stack up by combined Vault Points. Teams earn points through member activity, coordinated challenges, and team-specific competitions.',
    anchor: '#teams',
  },
  {
    slug: 'weekly',
    title: 'Weekly Leaderboard — This Week\'s Top Vault Members',
    h1: 'Weekly Leaderboard',
    description: 'A fresh start every week. Compete for the top spots in VaultSpark Studios\' weekly Vault Point rankings and earn special weekly rewards.',
    faqQ: 'What is the Weekly Leaderboard?',
    faqA: 'The Weekly Leaderboard resets every week, giving every Vault Member a fair shot at the top. Points earned Monday through Sunday count toward weekly rank. Top weekly members earn bonus rewards.',
    anchor: '#weekly',
  },
];
const retiredRoutes = new Set(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'route-consolidation.json'), 'utf8')).redirects || [])
    .map((rule) => rule.from),
);
const PAGES = ALL_PAGES.filter((page) => !retiredRoutes.has(`/leaderboards/${page.slug}/`));

// Extract the shared nav + shell from leaderboards/index.html
const leaderboardsIndexPath = path.join(ROOT, 'leaderboards', 'index.html');
const leaderboardsHTML = fs.readFileSync(leaderboardsIndexPath, 'utf8');

// Extract the critical shell CSS (between <style data-vs-critical-shell> and </style>)
const criticalCSSMatch = leaderboardsHTML.match(/<style data-vs-critical-shell>([\s\S]*?)<\/style>/);
const criticalCSS = criticalCSSMatch ? criticalCSSMatch[0] : '';

// Extract the CSS async loader script
const cssLoaderMatch = leaderboardsHTML.match(/<script>!function\(\).*?<\/script>/);
const cssLoader = cssLoaderMatch ? cssLoaderMatch[0] : '';

// Extract the shell CSS link
const shellCSSMatch = leaderboardsHTML.match(/<link rel="preload" href="[^"]*style\.shell[^"]*"[^>]*>[\s\S]*?<noscript>.*?<\/noscript>/);
const shellCSSBlock = shellCSSMatch ? shellCSSMatch[0] : '';

// Extract nav HTML (from <header class="site-header"> to </header>)
const navMatch = leaderboardsHTML.match(/<header class="site-header"[\s\S]*?<\/header>/);
const navHTML = navMatch ? navMatch[0] : '';

// Extract mobile sheet + footer + ambient scripts (from </main> to </body>)
const afterMainMatch = leaderboardsHTML.match(/<\/main>([\s\S]*?)<\/body>/);
const afterMainHTML = afterMainMatch ? afterMainMatch[1] : '';

function buildPage(page) {
  const BASE = 'https://vaultsparkstudios.com';
  const url = `${BASE}/leaderboards/${page.slug}/`;
  const jsonLD = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'Leaderboards', item: `${BASE}/leaderboards/` },
      { '@type': 'ListItem', position: 3, name: page.h1, item: url },
    ],
  });
  const faqLD = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [{
      '@type': 'Question',
      name: page.faqQ,
      acceptedAnswer: { '@type': 'Answer', text: page.faqA },
    }],
  });

  return `<!DOCTYPE html>
<html lang="en" class="dark-mode" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fjnpzjjyhnpmunfoycrp.supabase.co" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.title} | VaultSpark Studios</title>
  <meta name="description" content="${page.description}" />
  <link rel="canonical" href="${url}" />
  <meta name="robots" content="index, follow" />
  <meta property="og:title" content="${page.title} | VaultSpark Studios" />
  <meta property="og:description" content="${page.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${BASE}/assets/og-leaderboards.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@VaultSparkStudios" />
  <meta name="twitter:title" content="${page.title} | VaultSpark Studios" />
  <meta name="twitter:description" content="${page.description}" />
  <meta name="twitter:image" content="${BASE}/assets/og-leaderboards.png" />
  <script type="application/ld+json">
${jsonLD}
  </script>
  <script type="application/ld+json">
${faqLD}
  </script>
  <link rel="icon" type="image/png" href="/assets/icon-32.png" />
  ${criticalCSS}
  ${shellCSSBlock}
  ${cssLoader}
  <noscript><link rel="stylesheet" href="/assets/style.shell-920ea9c5cc.css" /></noscript>
<style>
  .lb-sub-hero { padding: 5rem 0 3rem; position: relative; text-align: center; }
  .lb-sub-hero::before { content:""; position:absolute; inset:0; pointer-events:none; background: radial-gradient(circle at 30% 40%, rgba(255,196,0,0.10), transparent 35%), radial-gradient(circle at 70% 40%, rgba(31,162,255,0.08), transparent 35%); }
  .lb-sub-hero .container { position:relative; z-index:1; }
  .lb-sub-hero h1 { font-family:Georgia,"Times New Roman",serif; font-size:clamp(2.2rem,5vw,3.8rem); font-weight:400; letter-spacing:-0.03em; line-height:1; margin:0 0 1rem; }
  .lb-sub-hero p { color:var(--muted); font-size:1.05rem; max-width:52ch; margin:0 auto 2rem; line-height:1.65; }
  .lb-sub-breadcrumb { font-size:0.82rem; color:var(--dim); margin-bottom:1.5rem; }
  .lb-sub-breadcrumb a { color:var(--muted); }
  .lb-sub-breadcrumb a:hover { color:var(--gold); }
  .lb-sub-cta-wrap { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }
</style>
</head>
<body class="dark-mode" data-theme="dark">
${navHTML}
<main id="main-content">
  <section class="lb-sub-hero">
    <div class="container">
      <p class="lb-sub-breadcrumb"><a href="/">Home</a> › <a href="/leaderboards/">Leaderboards</a> › ${page.h1}</p>
      <h1>${page.h1}</h1>
      <p>${page.description}</p>
      <div class="lb-sub-cta-wrap">
        <a href="/leaderboards/${page.anchor}" class="button">View Full Leaderboard</a>
        <a href="/ranks/" class="button-secondary">Vault Ranks</a>
      </div>
    </div>
  </section>

  <section style="padding:2rem 0 4rem;">
    <div class="container" style="max-width:680px;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:1.6rem;font-weight:400;margin-bottom:1.25rem;">About the ${page.h1}</h2>
      <p style="color:var(--muted);line-height:1.7;margin-bottom:1.5rem;">${page.faqA}</p>
      <p style="color:var(--muted);line-height:1.7;margin-bottom:2rem;">
        Vault Points are earned by playing VaultSpark Studios games, completing community challenges, referring new members, and participating in seasonal events.
        <a href="/ranks/" style="color:var(--gold);">Learn how ranks work →</a>
      </p>
      <div style="background:rgba(255,196,0,0.06);border:1px solid rgba(255,196,0,0.15);border-radius:12px;padding:1.25rem 1.5rem;">
        <p style="font-size:0.88rem;color:var(--muted);margin:0;line-height:1.65;">
          <strong style="color:var(--gold);">Join the Vault</strong> — Members earn Vault Points and appear on leaderboards.
          <a href="/membership/" style="color:var(--gold);">Explore membership →</a>
        </p>
      </div>
    </div>
  </section>
</main>
${afterMainHTML}
</body>
</html>`;
}

const isCheck = process.argv.includes('--check');
const isSelfTest = process.argv.includes('--self-test');

if (isSelfTest) {
  // Self-test: verify we can build each page and it contains required elements
  let pass = 0;
  let fail = 0;
  for (const page of PAGES) {
    const html = buildPage(page);
    const checks = [
      [html.includes(`<title>${page.title} | VaultSpark Studios</title>`), `${page.slug}: title`],
      [html.includes(`<h1>${page.h1}</h1>`), `${page.slug}: h1`],
      [html.includes('View Full Leaderboard'), `${page.slug}: CTA link`],
      [html.includes('"@type":"BreadcrumbList"') || html.includes('"@type": "BreadcrumbList"'), `${page.slug}: BreadcrumbList JSON-LD`],
      [html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"'), `${page.slug}: FAQPage JSON-LD`],
    ];
    for (const [ok, label] of checks) {
      if (ok) { pass++; } else { fail++; console.error(`FAIL: ${label}`); }
    }
  }
  console.log(`Self-test: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

if (isCheck) {
  // Check: verify all 7 sub-pages exist with correct content
  let missing = 0;
  for (const page of PAGES) {
    const dest = path.join(ROOT, 'leaderboards', page.slug, 'index.html');
    if (!fs.existsSync(dest)) {
      console.error(`MISSING: leaderboards/${page.slug}/index.html`);
      missing++;
    } else {
      const html = fs.readFileSync(dest, 'utf8');
      if (!html.includes(page.h1)) {
        console.error(`STALE: leaderboards/${page.slug}/index.html missing h1`);
        missing++;
      }
    }
  }
  if (missing === 0) {
    console.log(`check-leaderboard-subpages: ${PAGES.length}/${PAGES.length} pages OK`);
  }
  process.exit(missing > 0 ? 1 : 0);
}

// Generate pages
let count = 0;
for (const page of PAGES) {
  const dir = path.join(ROOT, 'leaderboards', page.slug);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, 'index.html');
  fs.writeFileSync(dest, buildPage(page), 'utf8');
  console.log(`  ✓ leaderboards/${page.slug}/index.html`);
  count++;
}
console.log(`\nbuild-leaderboard-subpages: ${count} pages written`);
