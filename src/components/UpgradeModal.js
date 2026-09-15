import React from "react";
import { apiUrl } from "../config/api.js";

export default function UpgradeModal({ open, onClose }) {
  if (!open) return null;

  const handleUpgrade = async (tier) => {
    const res = await fetch(apiUrl("/api/billing/create-checkout-session"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tier }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50">
      <div className="bg-gray-900 p-6 rounded w-[400px] text-white">

        <h2 className="text-xl mb-4">🚀 Upgrade Aigenikz</h2>

        <button onClick={() => handleUpgrade("basic")} className="w-full mb-2 bg-blue-500 p-2">
          Basic Plan
        </button>

        <button onClick={() => handleUpgrade("pro")} className="w-full mb-2 bg-purple-500 p-2">
          Pro Plan
        </button>

        <button onClick={() => handleUpgrade("elite")} className="w-full mb-2 bg-yellow-500 p-2">
          Elite Plan
        </button>

        <button onClick={onClose} className="mt-4 text-gray-400">
          Cancel
        </button>

      </div>
    </div>
  );
}