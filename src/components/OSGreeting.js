import { useEffect, useState } from "react";
import "../styles/OSGreeting.css";

export default function OSGreeting() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasGreeted = sessionStorage.getItem("astramindGreeted");
    if (hasGreeted) return;

    sessionStorage.setItem("astramindGreeted", "true");

    setTimeout(() => setVisible(true), 900);
    setTimeout(() => setVisible(false), 4200);
  }, []);

  if (!visible) return null;

  return (
    <div className="os-greeting">
      <div className="os-greeting-card">
        <span className="os-greeting-title">AstraMind Online</span>
        <span className="os-greeting-sub">
          Chappy standing by.
        </span>
      </div>
    </div>
  );
}
