// src/core/integration/integrationEngine.js
import { DEFAULT_INTEGRATION } from "./integrationConfig.js";

const STORAGE_KEY = "astramind_integration_config_v1";

export function getIntegrationConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INTEGRATION));
      return DEFAULT_INTEGRATION;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_INTEGRATION, ...(parsed || {}) };
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INTEGRATION));
    return DEFAULT_INTEGRATION;
  }
}

export function setIntegrationConfig(nextConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextConfig));
  return nextConfig;
}

export function patchIntegrationConfig(patch) {
  const current = getIntegrationConfig();
  const next = { ...current, ...patch };
  return setIntegrationConfig(next);
}

export function isIntegrationEnabled(key) {
  const cfg = getIntegrationConfig();
  return !!cfg[key];
}

