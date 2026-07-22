// src/pages/Settings.js
import React, { useEffect, useMemo, useState } from "react";
import { useOSMode } from "../context/ModeContext.js";
import { OS_MODES } from "../core/os/modes.js";
import { useSubscription } from "../context/SubscriptionContext.js";
import { getCapsForTier } from "../core/subscription/tierConfig.js";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { setMode } = useOSMode();
  const { tier, subscription } = useSubscription();
  const navigate = useNavigate();

  const [integrations, setIntegrations] = useState(() => {
    try {
      const raw = localStorage.getItem("astramind_integrations");
      return raw ? JSON.parse(raw) : { finance: true, content: true, chat: true };
    } catch {
      return { finance: true, content: true, chat: true };
    }
  });

  useEffect(() => {
    setMode(OS_MODES.SYSTEM);
  }, [setMode]);

  useEffect(() => {
    localStorage.setItem("astramind_integrations", JSON.stringify(integrations));
  }, [integrations]);

  const caps = useMemo(() => getCapsForTier(tier), [tier]);

  return (
    <div className="os-panel os-page-enter os-breathe w-full h-full p-6 text-white">
      <div className="max-w-6xl mx-auto bg-white/5 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(234,179,8,0.18)]">
        <h1 className="text-4xl font-extrabold text-yellow-300 mb-3 drop-shadow">
          ⚙️ System Settings
        </h1>

        <p className="text-sm text-gray-300 mb-10">
          Configure AstraMind system behavior, intelligence modules, and subscription tiers.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <SettingCard title="💳 Subscription Tier">
            <div className="text-[12px] text-gray-300 mb-3">
              Tier controls lock/unlock exports, bundles, remix depth, and future connectors.
            </div>

            <div className="os-select w-full">{subscription?.plan?.name || "Free"} · {subscription?.creditsBalance ?? 0} credits</div>
            <button type="button" className="creator-btn primary" onClick={() => navigate("/pricing")}>Manage plan and credits</button>

            <div className="mt-4 text-[12px] text-gray-300 bg-black/20 border border-white/10 rounded-xl p-4">
              <div className="font-semibold text-gray-200 mb-2">Unlocked on this tier</div>
              <ul className="space-y-1">
                <li>• Export: <span className={caps.canExport ? "text-emerald-200" : "text-rose-300"}>{caps.canExport ? "YES" : "NO"}</span></li>
                <li>• Bundles (TXT/JSON): <span className={caps.canExportBundles ? "text-emerald-200" : "text-rose-300"}>{caps.canExportBundles ? "YES" : "NO"}</span></li>
                <li>• Batch Export: <span className={caps.canBatchExport ? "text-emerald-200" : "text-rose-300"}>{caps.canBatchExport ? "YES" : "NO"}</span></li>
                <li>• Brand Kit: <span className={caps.canUseBrandKit ? "text-emerald-200" : "text-rose-300"}>{caps.canUseBrandKit ? "YES" : "NO"}</span></li>
                <li>• Connectors (future): <span className={caps.canUseConnectors ? "text-emerald-200" : "text-rose-300"}>{caps.canUseConnectors ? "YES" : "NO"}</span></li>
                <li>• Max Projects Stored: <span className="text-purple-200 font-semibold">{caps.maxProjectsStored}</span></li>
                <li>• Max Remixes / Project: <span className="text-purple-200 font-semibold">{caps.maxRemixesPerProject}</span></li>
              </ul>
            </div>
          </SettingCard>

          <SettingCard title="🧩 Integration Controls">
            <div className="text-[12px] text-gray-300 mb-3">
              Let Creators decide how deeply AstraMind modules integrate with each other.
            </div>

            <ToggleRow
              label="Finance ↔ Chat Intelligence"
              value={integrations.finance}
              onChange={(v) => setIntegrations((p) => ({ ...p, finance: v }))}
            />

            <ToggleRow
              label="Content ↔ Chat Intelligence"
              value={integrations.content}
              onChange={(v) => setIntegrations((p) => ({ ...p, content: v }))}
            />

            <ToggleRow
              label="Core Memory ↔ Chat Adaptation"
              value={integrations.chat}
              onChange={(v) => setIntegrations((p) => ({ ...p, chat: v }))}
            />

            <div className="mt-4 text-[11px] text-gray-400">
              These toggles are the foundation for modular integration routing across your OS.
            </div>
          </SettingCard>

        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-gray-200">{label}</span>
      <input
        type="checkbox"
        className="accent-yellow-400 w-5 h-5"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function SettingCard({ title, children }) {
  return (
    <div
      className="
        bg-black/30
        p-5
        rounded-xl
        border border-white/10
        backdrop-blur-md
        transition-all duration-300
        hover:shadow-[0_0_30px_rgba(234,179,8,0.25)]
      "
    >
      <h2 className="text-sm font-semibold mb-3 text-gray-200">{title}</h2>
      {children}
    </div>
  );
}

