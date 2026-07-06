import { useEffect } from "react";
import { startListening } from "../core/voice/speechInput.js";

export default function VoiceListener({ onCommand }) {
  useEffect(() => {
    startListening(onCommand);
  }, [onCommand]);

  return null;
}
