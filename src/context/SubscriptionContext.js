// src/context/SubscriptionContext.js

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIER, getCapsForTier, TIERS } from "../core/subscription/tierConfig.js";
import { useAuth } from "./AuthContext.js";

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [tier, setTier] = useState(DEFAULT_TIER);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !token) { setTier(DEFAULT_TIER); setSubscription(null); return; }
    setLoading(true);
    try {
      const base = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${base}/api/billing/me`, { headers:{ Authorization:`Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Subscription lookup failed.");
      const nextTier = String(data.subscription?.planId || "free").toUpperCase();
      setTier(Object.values(TIERS).includes(nextTier) ? nextTier : DEFAULT_TIER);
      setSubscription(data.subscription || null);
    } catch { setTier(DEFAULT_TIER); setSubscription(null); }
    finally { setLoading(false); }
  }, [isAuthenticated, token]);

  useEffect(() => { refresh(); }, [refresh]);

  const caps = useMemo(() => getCapsForTier(tier), [tier]);

  const value = useMemo(() => {
    return {
      tier,
      subscription,
      loading,
      refresh,
      caps,
      hasExport: !!caps.canExport,
      hasBundles: !!caps.canExportBundles,
      hasBatchExport: !!caps.canBatchExport,
      hasBrandKit: !!caps.canUseBrandKit,
      hasConnectors: !!caps.canUseConnectors,
    };
  }, [tier, caps, subscription, loading, refresh]);

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
