// src/components/FloatingChappy.js
import { useEffect, useState } from "react";
import "../styles/FloatingChappy.css";

export default function FloatingChappy() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`chappy-orb ${active ? "awake" : ""}`} title="Chappy is listening">
      🤖
    </div>
  );
}


