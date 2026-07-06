// src/core/integration/integrationConfig.js

export const DEFAULT_INTEGRATION = {
  // Content → Lab
  contentToLab: true,

  // Content ↔ Finance (revenue + expense tracking)
  contentToFinance: false,

  // Finance → Markets (show live market widgets inside Finance)
  financeToMarkets: true,

  // Music ↔ Video (music suggestions inside video workflows)
  musicToVideo: true,

  // Auto track content revenue events to Finance
  autoRevenueTracking: false,

  // Let Lab publish “final output” back to Content page
  labToContent: true,
};
