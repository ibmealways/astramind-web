import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOSMode } from "../context/ModeContext.js";
import { COMMANDS } from "../core/os/commands.js";
import "../styles/CommandPalette.css";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { setMode } = useOSMode();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = COMMANDS.filter((cmd) =>
    [cmd.label, ...cmd.keywords]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const run = (cmd) => {
    setOpen(false);
    setQuery("");
    setMode(cmd.mode);
    navigate(cmd.path);
  };

  if (!open) return null;

  return (
    <div className="command-overlay">
      <div className="command-palette">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a command…"
        />

        <div className="command-results">
          {filtered.map((cmd, i) => (
            <div
              key={i}
              className="command-item"
              onClick={() => run(cmd)}
            >
              {cmd.label}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="command-empty">No matching commands</div>
          )}
        </div>
      </div>
    </div>
  );
}

