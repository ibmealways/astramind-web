import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Setup() {
  const navigate = useNavigate();

  const [identity, setIdentity] = useState({
    niche: "News",
    platform: "TikTok",
    style: "Bold",
    goal: "Monetization",
  });

  const handleInitialize = () => {
    localStorage.setItem("astra_initialized", "true");
    localStorage.setItem("astra_identity", JSON.stringify(identity));
    navigate("/chat");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #060816 0%, #0b1120 55%, #09111d 100%)",
        color: "#fff",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
          background: "rgba(15,22,42,0.7)",
          border: "1px solid rgba(117,140,255,0.22)",
          borderRadius: "18px",
          padding: "28px",
          boxShadow: "0 0 30px rgba(24,53,120,0.2)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>🚀 Initialize AstraMind</h1>
        <p style={{ color: "#b6c2ea" }}>
          Define your creator identity so AstraMind can align its intelligence.
        </p>

        <div style={{ display: "grid", gap: "14px", marginTop: "24px" }}>
          <input
            value={identity.niche}
            onChange={(e) =>
              setIdentity({ ...identity, niche: e.target.value })
            }
            placeholder="Niche"
            style={inputStyle}
          />
          <input
            value={identity.platform}
            onChange={(e) =>
              setIdentity({ ...identity, platform: e.target.value })
            }
            placeholder="Platform"
            style={inputStyle}
          />
          <input
            value={identity.style}
            onChange={(e) =>
              setIdentity({ ...identity, style: e.target.value })
            }
            placeholder="Style"
            style={inputStyle}
          />
          <input
            value={identity.goal}
            onChange={(e) =>
              setIdentity({ ...identity, goal: e.target.value })
            }
            placeholder="Goal"
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleInitialize}
          style={{
            marginTop: "22px",
            border: "none",
            borderRadius: "12px",
            background: "linear-gradient(90deg, #4f7cff, #47d7ff)",
            color: "#fff",
            fontWeight: 700,
            padding: "12px 18px",
            cursor: "pointer",
          }}
        >
          Initialize AstraMind
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid rgba(123,156,255,0.25)",
  background: "rgba(7,12,24,0.95)",
  color: "#fff",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};
