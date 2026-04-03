// VaultSpark Studios — Membership Access (browser IIFE)
// Version: 2026-04-03
(function (global) {
  'use strict';

const CONFIG = {
  "version": "2026-04-03",
  "defaultPlan": "free",
  "planAliases": {
    "pro": "promogrind_pro"
  },
  "rankThresholds": [
    0,
    250,
    1000,
    3000,
    7500,
    15000,
    30000,
    60000,
    100000
  ],
  "ranks": [
    {
      "index": 0,
      "key": "spark_initiate",
      "label": "Spark Initiate"
    },
    {
      "index": 1,
      "key": "vault_runner",
      "label": "Vault Runner"
    },
    {
      "index": 2,
      "key": "rift_scout",
      "label": "Rift Scout"
    },
    {
      "index": 3,
      "key": "vault_guard",
      "label": "Vault Guard"
    },
    {
      "index": 4,
      "key": "vault_breacher",
      "label": "Vault Breacher"
    },
    {
      "index": 5,
      "key": "void_operative",
      "label": "Void Operative"
    },
    {
      "index": 6,
      "key": "vault_keeper",
      "label": "Vault Keeper"
    },
    {
      "index": 7,
      "key": "forge_master",
      "label": "Forge Master"
    },
    {
      "index": 8,
      "key": "the_sparked",
      "label": "The Sparked"
    }
  ],
  "plans": {
    "free": {
      "label": "Free Vault Member",
      "kind": "free",
      "isPaid": false,
      "monthlyPriceUsd": 0,
      "priceDisplay": "$0",
      "portalLabel": "Free Vault Member"
    },
    "vault_sparked": {
      "label": "VaultSparked",
      "kind": "studio",
      "isPaid": true,
      "isSparked": true,
      "isPro": false,
      "monthlyPriceUsd": null,
      "priceDisplay": "From $4.99/mo",
      "portalLabel": "VaultSparked"
    },
    "vault_sparked_pro": {
      "label": "VaultSparked Pro",
      "kind": "studio",
      "isPaid": true,
      "isSparked": true,
      "isPro": true,
      "monthlyPriceUsd": null,
      "priceDisplay": "From $29.99/mo",
      "portalLabel": "VaultSparked Pro"
    },
    "promogrind_pro": {
      "label": "PromoGrind Pro",
      "kind": "product",
      "isPaid": true,
      "monthlyPriceUsd": null,
      "priceDisplay": "Legacy",
      "portalLabel": "PromoGrind Pro"
    }
  },
  "features": {
    "member_identity": {
      "label": "Cross-project member identity",
      "rule": {
        "requiresAccount": true,
        "minPlan": "free"
      }
    },
    "classified_archive": {
      "label": "Vault archive access",
      "rule": {
        "requiresAccount": true,
        "minPlan": "free"
      }
    },
    "classified_archive_full": {
      "label": "Full archive access",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "beta_pool": {
      "label": "Development early-access pool",
      "rule": {
        "requiresAccount": true,
        "minPlan": "free"
      }
    },
    "beta_priority": {
      "label": "First-wave development access",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "promoGrind_core": {
      "label": "PromoGrind core tools",
      "rule": {
        "requiresAccount": true,
        "minPlan": "free"
      }
    },
    "promoGrind_live_tools": {
      "label": "PromoGrind live odds tools",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "promogrind_pro",
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "sparked_badge": {
      "label": "VaultSparked badge",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "sparked_discord_role": {
      "label": "VaultSparked Discord role",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "sparked_profile_theme": {
      "label": "VaultSparked profile theme",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked",
          "vault_sparked_pro"
        ]
      }
    },
    "project_unknown_brief": {
      "label": "Project Unknown redacted brief",
      "rule": {
        "requiresAccount": true,
        "minPlan": "free",
        "minRankIndex": 2
      }
    },
    "pro_cross_product": {
      "label": "Cross-product Pro access",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked_pro"
        ]
      }
    },
    "pro_beta_builds": {
      "label": "Pro-tier beta build access",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked_pro"
        ]
      }
    },
    "pro_discord_role": {
      "label": "VaultSparked Pro Discord role",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked_pro"
        ]
      }
    },
    "pro_founder_video": {
      "label": "Founder video updates",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked_pro"
        ]
      }
    },
    "pro_studio_credits": {
      "label": "Studio credits",
      "rule": {
        "requiresAccount": true,
        "allowedPlans": [
          "vault_sparked_pro"
        ]
      }
    }
  },
  "projects": {
    "call_of_doodie": {
      "label": "Call of Doodie",
      "model": "freemium",
      "publicAccess": "free",
      "memberFeatures": [
        "member_identity",
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "sparked_badge",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "gridiron_gm": {
      "label": "Gridiron GM",
      "model": "freemium",
      "publicAccess": "free",
      "memberFeatures": [
        "member_identity",
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "sparked_badge",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "vaultspark_football_gm": {
      "label": "VaultSpark Football GM",
      "model": "freemium",
      "publicAccess": "free",
      "memberFeatures": [
        "member_identity",
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "sparked_badge",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "vaultfront": {
      "label": "VaultFront",
      "model": "freemium",
      "publicAccess": "waitlist",
      "memberFeatures": [
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "solara": {
      "label": "Solara",
      "model": "freemium",
      "publicAccess": "waitlist",
      "memberFeatures": [
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "mindframe": {
      "label": "MindFrame",
      "model": "freemium",
      "publicAccess": "waitlist",
      "memberFeatures": [
        "beta_pool"
      ],
      "paidFeatures": [
        "beta_priority",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "project_unknown": {
      "label": "Project Unknown",
      "model": "freemium",
      "publicAccess": "waitlist",
      "memberFeatures": [
        "beta_pool",
        "project_unknown_brief"
      ],
      "paidFeatures": [
        "beta_priority",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    },
    "promogrind": {
      "label": "PromoGrind",
      "model": "freemium",
      "publicAccess": "free_member",
      "memberFeatures": [
        "promoGrind_core"
      ],
      "paidFeatures": [
        "promoGrind_live_tools",
        "pro_cross_product",
        "pro_beta_builds"
      ]
    }
  }
};

const PLAN_ORDER = {
  free: 0,
  promogrind_pro: 1,
  vault_sparked: 2,
  vault_sparked_pro: 3,
};

const PLAN_ALIASES = CONFIG.planAliases || {};

function normalizePlanKey(planKey) {
  const raw = typeof planKey === 'string' ? planKey.trim() : '';
  if (!raw) return CONFIG.defaultPlan;
  return PLAN_ALIASES[raw] || raw;
}

function getPlan(planKey) {
  const key = normalizePlanKey(planKey);
  return CONFIG.plans[key] || CONFIG.plans[CONFIG.defaultPlan];
}

function isPaidPlan(planKey) {
  return !!getPlan(planKey).isPaid;
}

function isVaultSparkedPlan(planKey) {
  const key = normalizePlanKey(planKey);
  return key === 'vault_sparked' || key === 'vault_sparked_pro';
}

function isVaultSparkedProPlan(planKey) {
  return normalizePlanKey(planKey) === 'vault_sparked_pro';
}

function getRankIndex(points) {
  const value = Number.isFinite(points) ? points : Number(points || 0);
  let rankIndex = 0;
  for (let i = 0; i < CONFIG.rankThresholds.length; i += 1) {
    if (value >= CONFIG.rankThresholds[i]) rankIndex = i;
  }
  return rankIndex;
}

function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.current_period_end) return true;
  return new Date(subscription.current_period_end).getTime() > Date.now();
}

function getActivePlanKey(subscription) {
  if (!isSubscriptionActive(subscription)) return CONFIG.defaultPlan;
  return normalizePlanKey(subscription.plan);
}

function buildContext(input) {
  input = input || {};
  const rankIndex = Number.isInteger(input.rankIndex) ? input.rankIndex : getRankIndex(input.points || 0);
  const hasAccount = input.hasAccount !== false;
  const planKey = normalizePlanKey(input.planKey);
  return {
    hasAccount,
    planKey,
    rankIndex,
    points: Number(input.points || 0),
  };
}

function comparePlanOrder(currentPlan, minimumPlan) {
  const current = PLAN_ORDER[normalizePlanKey(currentPlan)] !== undefined
    ? PLAN_ORDER[normalizePlanKey(currentPlan)]
    : PLAN_ORDER[CONFIG.defaultPlan];
  const required = PLAN_ORDER[normalizePlanKey(minimumPlan)] !== undefined
    ? PLAN_ORDER[normalizePlanKey(minimumPlan)]
    : PLAN_ORDER[CONFIG.defaultPlan];
  return current >= required;
}

function matchesRule(rule, contextInput) {
  rule = rule || {};
  contextInput = contextInput || {};
  const context = buildContext(contextInput);
  if (rule.public) return true;
  if (rule.requiresAccount && !context.hasAccount) return false;
  if (rule.allowedPlans && rule.allowedPlans.length > 0 && !rule.allowedPlans.includes(context.planKey)) return false;
  if (rule.minPlan && !comparePlanOrder(context.planKey, rule.minPlan)) return false;
  if (Number.isInteger(rule.minRankIndex) && context.rankIndex < rule.minRankIndex) return false;
  return true;
}

function getFeature(featureKey) {
  return CONFIG.features[featureKey] || null;
}

function hasEntitlement(featureKey, contextInput) {
  const feature = getFeature(featureKey);
  if (!feature) return false;
  return matchesRule(feature.rule, contextInput);
}

function getProject(projectKey) {
  return CONFIG.projects[projectKey] || null;
}

function getPriceDisplay(planKey) {
  return getPlan(planKey).priceDisplay || '';
}

  global.VSMembership = {
    config: CONFIG,
    normalizePlanKey,
    getPlan,
    isPaidPlan,
    isVaultSparkedPlan,
    isVaultSparkedProPlan,
    getRankIndex,
    isSubscriptionActive,
    getActivePlanKey,
    buildContext,
    matchesRule,
    getFeature,
    hasEntitlement,
    getProject,
    getPriceDisplay,
  };
})(globalThis);
