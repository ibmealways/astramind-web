import { useEffect } from "react";

export default function BootScreen({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1800); // 1.8s boot delay

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at bottom, #1e3a8a, #020617)",
        color: "#fff",
        fontSize: "1.8rem",
        letterSpacing: "0.05em",
      }}
    >
      🚀 AstraMind Booting…
    </div>
  );
}
