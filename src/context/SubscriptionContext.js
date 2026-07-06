// src/context/SubscriptionContext.js

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIER, getCapsForTier, TIERS } from "../core/subscription/tierConfig.js";

const STORAGE_KEY = "astramind_subscription_tier";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [tier, setTier] = useState(DEFAULT_TIER);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw && Object.values(TIERS).includes(raw)) setTier(raw);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, tier);
    } catch {
      // ignore
    }
  }, [tier]);

  const caps = useMemo(() => getCapsForTier(tier), [tier]);

  const value = useMemo(() => {
    return {
      tier,
      setTier,
      caps,
      hasExport: !!caps.canExport,
      hasBundles: !!caps.canExportBundles,
      hasBatchExport: !!caps.canBatchExport,
      hasBrandKit: !!caps.canUseBrandKit,
      hasConnectors: !!caps.canUseConnectors,
    };
  }, [tier, caps]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
