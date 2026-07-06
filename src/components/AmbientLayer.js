// src/components/AmbientLayer.js
import { useOSMode } from "../context/ModeContext.js";
import { MODE_VISUALS } from "../core/os/modeVisuals.js";
import "../styles/AmbientLayer.css";

export default function AmbientLayer() {
  const { mode } = useOSMode();

  const visual = MODE_VISUALS[mode] || MODE_VISUALS.SYSTEM;

  return (
    <div
      className="ambient-layer"
      style={{
        "--ambient-hue": visual.hue,
        "--ambient-glow": visual.glow,
        "--pulse-speed": visual.pulseSpeed,
      }}
    />
  );
}

