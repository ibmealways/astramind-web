export const FEATURE_FLAGS = {
  bootScreen: true,
  ambientLayer: true,
  commandPalette: true,
  floatingChappy: true,
  voiceListener: true,

  creatorDashboard: true,
  creatorSetup: true,

  financeHub: true,
  financeIncome: true,
  financeExpenses: true,
  financeSavings: true,

  contentCreator: true,
  contentLab: true,
  contentScript: true,
  contentImage: true,
  contentVideo: true,
  contentAudio: true,
  contentBook: true,

  adaptiveMode: true,
  memorySystem: true,
  schedulerSystem: true,
  pluginSystem: true,

  autonomousGoalEngine: false,
  contentFactoryMode: false,
  revenueOS: false,
  subscriptionOS: false,
};

export function isFeatureEnabled(flagName) {
  return Boolean(FEATURE_FLAGS[flagName]);
}

export function getEnabledFeatures() {
  return Object.entries(FEATURE_FLAGS)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
}

export default FEATURE_FLAGS;