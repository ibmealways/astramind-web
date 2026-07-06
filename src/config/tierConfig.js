export const SUBSCRIPTION_TIERS = {
  FREE: "free",
  CREATOR: "creator",
  PRO: "pro",
  EMPIRE: "empire",
};

export const TIER_CONFIG = {
  [SUBSCRIPTION_TIERS.FREE]: {
    label: "Free",
    monthlyPrice: 0,
    description: "Core AstraMind experience for testing the OS.",
    entitlements: {
      chat: true,
      creatorDashboard: false,
      financeHub: true,
      contentCreator: true,
      contentLab: false,
      scriptWriter: true,
      imageStudio: false,
      videoStudio: false,
      audioStudio: false,
      bookWriter: false,
      exportManager: false,
      voiceListener: false,
      adaptiveMode: true,
    },
    limits: {
      dailyChats: 20,
      dailyGenerations: 5,
      projects: 3,
    },
  },

  [SUBSCRIPTION_TIERS.CREATOR]: {
    label: "Creator",
    monthlyPrice: 19,
    description: "Built for content creators, social media operators, and solo brands.",
    entitlements: {
      chat: true,
      creatorDashboard: true,
      financeHub: true,
      contentCreator: true,
      contentLab: true,
      scriptWriter: true,
      imageStudio: true,
      videoStudio: true,
      audioStudio: true,
      bookWriter: true,
      exportManager: true,
      voiceListener: true,
      adaptiveMode: true,
    },
    limits: {
      dailyChats: 200,
      dailyGenerations: 50,
      projects: 30,
    },
  },

  [SUBSCRIPTION_TIERS.PRO]: {
    label: "Pro",
    monthlyPrice: 49,
    description: "For operators running serious output across content and business systems.",
    entitlements: {
      chat: true,
      creatorDashboard: true,
      financeHub: true,
      contentCreator: true,
      contentLab: true,
      scriptWriter: true,
      imageStudio: true,
      videoStudio: true,
      audioStudio: true,
      bookWriter: true,
      exportManager: true,
      voiceListener: true,
      adaptiveMode: true,
    },
    limits: {
      dailyChats: 1000,
      dailyGenerations: 250,
      projects: 100,
    },
  },

  [SUBSCRIPTION_TIERS.EMPIRE]: {
    label: "Empire",
    monthlyPrice: 99,
    description: "Full AstraMind OS access for advanced creators and business operators.",
    entitlements: {
      chat: true,
      creatorDashboard: true,
      financeHub: true,
      contentCreator: true,
      contentLab: true,
      scriptWriter: true,
      imageStudio: true,
      videoStudio: true,
      audioStudio: true,
      bookWriter: true,
      exportManager: true,
      voiceListener: true,
      adaptiveMode: true,
    },
    limits: {
      dailyChats: 5000,
      dailyGenerations: 1000,
      projects: 500,
    },
  },
};

export function getTierConfig(tierKey = SUBSCRIPTION_TIERS.FREE) {
  return TIER_CONFIG[tierKey] || TIER_CONFIG[SUBSCRIPTION_TIERS.FREE];
}

export function hasTierAccess(tierKey, entitlementKey) {
  const tier = getTierConfig(tierKey);
  return Boolean(tier.entitlements?.[entitlementKey]);
}

export function getTierLimit(tierKey, limitKey) {
  const tier = getTierConfig(tierKey);
  return tier.limits?.[limitKey] ?? null;
}

export default TIER_CONFIG;