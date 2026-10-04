/**
 * org-entity.mjs — the ONE schema.org entity graph for vaultsparkstudios.com.
 *
 * Every page used to re-declare the studio as its own anonymous Organization
 * ({"@type":"Organization","name":"VaultSpark Studios"} with a different field
 * set on each page), so search engines and answer engines saw dozens of
 * unrelated studio entities instead of one. The audit item agent-geo-layer-v2
 * fixed that: the studio is declared once, under a stable @id, and every other
 * node points at it.
 *
 *   ORG_ID      https://vaultsparkstudios.com/#org      — the Organization
 *   WEBSITE_ID  https://vaultsparkstudios.com/#website  — the WebSite
 *
 * Generators import ORG_REF / WEBSITE_REF for publisher / creator / isPartOf
 * and only the canonical surfaces (homepage, /press/, /brand/, the entity
 * graph) emit the full definition via orgNode().
 *
 * sameAs mirrors the official accounts in api/public-intelligence.json
 * (social.accounts). check-schema-coverage.mjs fails if any served page
 * declares a VaultSpark Organization without ORG_ID.
 */
export const ORIGIN = 'https://vaultsparkstudios.com';
export const ORG_ID = `${ORIGIN}/#org`;
export const WEBSITE_ID = `${ORIGIN}/#website`;

export const ORG_REF = Object.freeze({ '@id': ORG_ID });
export const WEBSITE_REF = Object.freeze({ '@id': WEBSITE_ID });

export const ORG_LOGO = `${ORIGIN}/assets/brand/logo-signature.png`;

/** Official studio profiles (public-intelligence social.accounts, in display order). */
export const ORG_SAME_AS = Object.freeze([
  'https://github.com/VaultSparkStudios',
  'https://www.youtube.com/@VaultSparkStudios',
  'https://x.com/VaultSpark',
  'https://www.instagram.com/vaultsparkstudios/',
  'https://www.reddit.com/r/VaultSparkStudios/',
  'https://bsky.app/profile/vaultsparkstudios.bsky.social',
  'https://www.facebook.com/VaultSparkStudios/',
  'https://www.tiktok.com/@vaultsparkstudios',
  'https://www.threads.com/@vaultsparkstudios',
  'https://discord.gg/rKG9GGaSdu',
  'https://www.pinterest.com/VaultSparkStudios/',
  'https://vaultsparkstudios.gumroad.com/',
  'https://suno.com/@VaultSparkStudios',
]);

/**
 * D-S368.8 — the studio's ONE self-description. Hybrid positioning: an AI &
 * Synthetic Intelligence (SI) studio. "SI" is spelled out on first reference
 * because it is ambiguous (Super Intelligence is the 2026 U.S. federal term).
 * Never claim VaultSpark systems are superintelligent. agents.json, llms.txt,
 * the llms-full shards and the entity graph all read these constants, so the
 * description changes in one place.
 */
export const STUDIO_DESCRIPTION = 'Independent AI & Synthetic Intelligence (SI) studio building browser games, intelligence tools, and worlds. The Vault is sparked.';
export const STUDIO_CONTEXT_LINE = 'an independent AI & Synthetic Intelligence (SI) studio building browser games, intelligence tools, and worlds';
export const STUDIO_SLOGAN = 'From Artificial Intelligence to Synthetic Intelligence.';
export const STUDIO_KNOWS_ABOUT = Object.freeze([
  'Artificial Intelligence',
  'Agentic AI',
  'Synthetic Intelligence',
  'Super Intelligence',
  'AI agents',
  'Browser games',
  'Game development',
  'Worldbuilding',
]);

/** The single full Organization definition. Extra fields merge on top (never replace @id). */
export function orgNode(extra = {}) {
  return {
    '@type': 'Organization',
    ...extra,
    '@id': ORG_ID,
    name: 'VaultSpark Studios',
    legalName: 'VaultSpark Studios LLC',
    url: `${ORIGIN}/`,
    logo: ORG_LOGO,
    description: STUDIO_DESCRIPTION,
    slogan: STUDIO_SLOGAN,
    knowsAbout: [...STUDIO_KNOWS_ABOUT],
    sameAs: [...ORG_SAME_AS],
  };
}

/** The WebSite node, published by the Organization. */
export function websiteNode(extra = {}) {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${ORIGIN}/`,
    name: 'VaultSpark Studios',
    publisher: ORG_REF,
    ...extra,
  };
}

const STUDIO_NAME = /^VaultSpark Studios(?: LLC)?$/i;
const STUDIO_URL = /^https:\/\/vaultsparkstudios\.com\/?$/i;

/** True for a JSON-LD node that claims to BE the studio Organization. */
export function isStudioOrganization(node) {
  if (!node || typeof node !== 'object') return false;
  const types = [].concat(node['@type'] || []);
  if (!types.includes('Organization')) return false;
  return STUDIO_NAME.test(String(node.name || '').trim()) || STUDIO_URL.test(String(node.url || '').trim());
}

/** True for a JSON-LD node that claims to be the studio WebSite. */
export function isStudioWebsite(node) {
  if (!node || typeof node !== 'object') return false;
  const types = [].concat(node['@type'] || []);
  return types.includes('WebSite') && STUDIO_URL.test(String(node.url || '').trim());
}
