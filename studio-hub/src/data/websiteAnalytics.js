// Website Analytics — PageSpeed Insights, page probing, SEO, security headers
// Follows socialFeedsAdapter.js pattern: fetch with retry + sessionStorage cache

const CACHE_PREFIX = "vshub_webanalytics_";
const SITE_URL = "https://vaultsparkstudios.com";

// Known site pages/subpaths to analyze
const SITE_PAGES = [
  { path: "/", label: "Homepage" },
  { path: "/call-of-doodie/", label: "Call of Doodie" },
  { path: "/vaultspark-football-gm/", label: "Football GM" },
  { path: "/studio-hub/", label: "Studio Hub" },
];

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function wsFetch(url, options = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(tid);
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

function readCache(key, ttlMs) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* quota exceeded — silently skip */ }
}

// ── PageSpeed Insights API ────────────────────────────────────────────────────
// Free tier: 25K queries/day without key, 400/100s with key.
// Returns Lighthouse scores + Core Web Vitals from CrUX.

export async function fetchPageSpeedData(apiKey, ttlMs = 900000) {
  const cacheKey = "pagespeed_all";
  const cached = readCache(cacheKey, ttlMs);
  if (cached) return cached;

  const results = [];
  for (const page of SITE_PAGES) {
    try {
      const url = `${SITE_URL}${page.path}`;
      const params = new URLSearchParams({
        url,
        category: "PERFORMANCE",
        strategy: "mobile",
      });
      // Add extra categories
      params.append("category", "ACCESSIBILITY");
      params.append("category", "SEO");
      params.append("category", "BEST_PRACTICES");
      if (apiKey) params.set("key", apiKey);

      const res = await wsFetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`);
      if (!res.ok) {
        results.push({ page: page.label, path: page.path, error: `HTTP ${res.status}` });
        continue;
      }
      const json = await res.json();
      const lh = json.lighthouseResult;
      const cats = lh?.categories || {};
      const audits = lh?.audits || {};

      // Core Web Vitals from Lighthouse
      const cwv = {
        lcp: audits["largest-contentful-paint"]?.numericValue,
        fid: audits["max-potential-fid"]?.numericValue,
        cls: audits["cumulative-layout-shift"]?.numericValue,
        inp: audits["interaction-to-next-paint"]?.numericValue || null,
        fcp: audits["first-contentful-paint"]?.numericValue,
        tbt: audits["total-blocking-time"]?.numericValue,
        si: audits["speed-index"]?.numericValue,
        tti: audits["interactive"]?.numericValue,
      };

      // CrUX field data if available
      const crux = json.loadingExperience?.metrics || {};
      const fieldData = {
        lcpMs: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile,
        lcpCategory: crux.LARGEST_CONTENTFUL_PAINT_MS?.category,
        fidMs: crux.FIRST_INPUT_DELAY_MS?.percentile,
        fidCategory: crux.FIRST_INPUT_DELAY_MS?.category,
        clsScore: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null
          ? crux.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100
          : null,
        clsCategory: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category,
        inpMs: crux.INTERACTION_TO_NEXT_PAINT?.percentile,
        inpCategory: crux.INTERACTION_TO_NEXT_PAINT?.category,
        overallCategory: json.loadingExperience?.overall_category || null,
      };

      // Extract key audits for recommendations
      const opportunities = [];
      const diagnostics = [];
      for (const [id, audit] of Object.entries(audits)) {
        if (audit.details?.type === "opportunity" && audit.score !== null && audit.score < 0.9) {
          opportunities.push({
            id,
            title: audit.title,
            description: audit.description,
            savings: audit.details?.overallSavingsMs,
            score: audit.score,
          });
        }
        if (audit.details?.type === "table" && audit.score !== null && audit.score < 0.5) {
          diagnostics.push({ id, title: audit.title, score: audit.score });
        }
      }
      opportunities.sort((a, b) => (b.savings || 0) - (a.savings || 0));

      // SEO-specific audits
      const seoAudits = {};
      const seoKeys = [
        "document-title", "meta-description", "link-text", "crawlable-anchors",
        "is-crawlable", "robots-txt", "canonical", "hreflang", "structured-data",
        "http-status-code", "viewport", "font-size", "tap-targets",
      ];
      for (const k of seoKeys) {
        if (audits[k]) {
          seoAudits[k] = { score: audits[k].score, title: audits[k].title, displayValue: audits[k].displayValue };
        }
      }

      results.push({
        page: page.label,
        path: page.path,
        url,
        scores: {
          performance: Math.round((cats.performance?.score || 0) * 100),
          accessibility: Math.round((cats.accessibility?.score || 0) * 100),
          seo: Math.round((cats["seo"]?.score || 0) * 100),
          bestPractices: Math.round((cats["best-practices"]?.score || 0) * 100),
        },
        cwv,
        fieldData,
        opportunities: opportunities.slice(0, 8),
        diagnostics: diagnostics.slice(0, 6),
        seoAudits,
        fetchStrategy: "mobile",
        fetchedAt: new Date().toISOString(),
      });
    } catch (err) {
      results.push({ page: page.label, path: page.path, error: err.message });
    }
  }

  const data = { pages: results, fetchedAt: new Date().toISOString() };
  writeCache(cacheKey, data);
  return data;
}

// ── Site-wide probing (robots.txt, sitemap, meta, headers) ────────────────────

export async function fetchSiteProbe(ttlMs = 900000) {
  const cacheKey = "site_probe";
  const cached = readCache(cacheKey, ttlMs);
  if (cached) return cached;

  const probe = {
    robotsTxt: null,
    sitemap: null,
    securityHeaders: {},
    https: true,
    pages: [],
  };

  // robots.txt
  try {
    const res = await wsFetch(`${SITE_URL}/robots.txt`);
    if (res.ok) {
      const text = await res.text();
      probe.robotsTxt = {
        exists: true,
        content: text.slice(0, 2000),
        hasSitemap: /sitemap/i.test(text),
        hasDisallow: /disallow/i.test(text),
        lines: text.split("\n").filter((l) => l.trim()).length,
      };
    } else {
      probe.robotsTxt = { exists: false };
    }
  } catch {
    probe.robotsTxt = { exists: false, error: true };
  }

  // sitemap.xml
  try {
    const res = await wsFetch(`${SITE_URL}/sitemap.xml`);
    if (res.ok) {
      const text = await res.text();
      const urlCount = (text.match(/<loc>/g) || []).length;
      probe.sitemap = {
        exists: true,
        urlCount,
        size: text.length,
        hasLastmod: /<lastmod>/i.test(text),
        hasChangefreq: /<changefreq>/i.test(text),
      };
    } else {
      probe.sitemap = { exists: false };
    }
  } catch {
    probe.sitemap = { exists: false, error: true };
  }

  // Probe each page for meta tags, OG, structured data
  for (const page of SITE_PAGES) {
    try {
      const res = await wsFetch(`${SITE_URL}${page.path}`);
      if (!res.ok) {
        probe.pages.push({ path: page.path, label: page.label, error: `HTTP ${res.status}` });
        continue;
      }

      // Security headers from response
      if (page.path === "/") {
        const hdrs = {};
        for (const h of ["content-security-policy", "x-content-type-options", "x-frame-options",
          "strict-transport-security", "x-xss-protection", "referrer-policy",
          "permissions-policy", "cross-origin-opener-policy"]) {
          hdrs[h] = res.headers.get(h) || null;
        }
        probe.securityHeaders = hdrs;
      }

      const html = await res.text();

      // Parse meta tags
      const getMetaContent = (name) => {
        const m = html.match(new RegExp(`<meta\\s+(?:name|property)=["']${name}["']\\s+content=["']([^"']*)["']`, "i"))
          || html.match(new RegExp(`<meta\\s+content=["']([^"']*)["']\\s+(?:name|property)=["']${name}["']`, "i"));
        return m ? m[1] : null;
      };

      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || null;
      const description = getMetaContent("description");
      const ogTitle = getMetaContent("og:title");
      const ogDescription = getMetaContent("og:description");
      const ogImage = getMetaContent("og:image");
      const ogType = getMetaContent("og:type");
      const twitterCard = getMetaContent("twitter:card");
      const viewport = getMetaContent("viewport");
      const canonical = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || [])[1] || null;
      const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
      const favicon = /<link[^>]+rel=["'](?:icon|shortcut icon)["']/i.test(html);
      const hasCharset = /<meta\s+charset/i.test(html);
      const hasLang = /<html[^>]+lang=/i.test(html);
      const internalLinks = (html.match(/href=["'][^"']*vaultsparkstudios\.com[^"']*/g) || []).length;
      const externalLinks = (html.match(/href=["']https?:\/\/(?!.*vaultsparkstudios\.com)[^"']*/g) || []).length;
      const imgTags = (html.match(/<img\b/g) || []).length;
      const imgWithAlt = (html.match(/<img\b[^>]*\balt=["'][^"']+["']/g) || []).length;
      const h1Count = (html.match(/<h1[\s>]/g) || []).length;
      const h2Count = (html.match(/<h2[\s>]/g) || []).length;
      const htmlSize = html.length;

      probe.pages.push({
        path: page.path,
        label: page.label,
        title,
        description,
        og: { title: ogTitle, description: ogDescription, image: ogImage, type: ogType },
        twitter: { card: twitterCard },
        viewport,
        canonical,
        hasStructuredData,
        favicon,
        hasCharset,
        hasLang,
        links: { internal: internalLinks, external: externalLinks },
        images: { total: imgTags, withAlt: imgWithAlt },
        headings: { h1: h1Count, h2: h2Count },
        htmlSize,
      });
    } catch (err) {
      probe.pages.push({ path: page.path, label: page.label, error: err.message });
    }
  }

  probe.fetchedAt = new Date().toISOString();
  writeCache(cacheKey, probe);
  return probe;
}

// ── Aggregate website health score (0–100) ────────────────────────────────────

export function computeWebsiteHealthScore(psiData, probeData) {
  if (!psiData?.pages?.length) return { score: null, breakdown: {} };

  let score = 0;
  const breakdown = {};

  // Performance avg (0–30)
  const perfScores = psiData.pages.filter((p) => p.scores).map((p) => p.scores.performance);
  if (perfScores.length) {
    const avg = perfScores.reduce((a, b) => a + b, 0) / perfScores.length;
    const pts = (avg / 100) * 30;
    score += pts;
    breakdown.performance = Math.round(pts);
  }

  // SEO avg (0–25)
  const seoScores = psiData.pages.filter((p) => p.scores).map((p) => p.scores.seo);
  if (seoScores.length) {
    const avg = seoScores.reduce((a, b) => a + b, 0) / seoScores.length;
    const pts = (avg / 100) * 25;
    score += pts;
    breakdown.seo = Math.round(pts);
  }

  // Accessibility avg (0–20)
  const a11yScores = psiData.pages.filter((p) => p.scores).map((p) => p.scores.accessibility);
  if (a11yScores.length) {
    const avg = a11yScores.reduce((a, b) => a + b, 0) / a11yScores.length;
    const pts = (avg / 100) * 20;
    score += pts;
    breakdown.accessibility = Math.round(pts);
  }

  // Best practices avg (0–10)
  const bpScores = psiData.pages.filter((p) => p.scores).map((p) => p.scores.bestPractices);
  if (bpScores.length) {
    const avg = bpScores.reduce((a, b) => a + b, 0) / bpScores.length;
    const pts = (avg / 100) * 10;
    score += pts;
    breakdown.bestPractices = Math.round(pts);
  }

  // Site infrastructure (0–15)
  let infraPts = 0;
  if (probeData) {
    if (probeData.robotsTxt?.exists) infraPts += 3;
    if (probeData.sitemap?.exists) infraPts += 3;
    if (probeData.https) infraPts += 3;
    // Security headers
    const hdrCount = Object.values(probeData.securityHeaders || {}).filter(Boolean).length;
    infraPts += Math.min(3, hdrCount);
    // OG tags on homepage
    const homePage = probeData.pages?.find((p) => p.path === "/");
    if (homePage?.og?.title && homePage?.og?.image) infraPts += 3;
  }
  score += Math.min(15, infraPts);
  breakdown.infrastructure = Math.min(15, infraPts);

  return { score: Math.round(Math.min(100, score)), breakdown };
}

export { SITE_PAGES, SITE_URL };
