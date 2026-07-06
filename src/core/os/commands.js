// src/core/os/commands.js
import { OS_MODES } from "./modes.js";

export const COMMANDS = [
  {
    label: "Go to Chat",
    keywords: ["chat", "talk", "assistant"],
    path: "/chat",
    mode: OS_MODES.CHAT,
  },
  {
    label: "Open Finance",
    keywords: ["finance", "money", "income", "expenses"],
    path: "/finance",
    mode: OS_MODES.FINANCE,
  },
  {
    label: "Open Content",
    keywords: ["content", "create", "media"],
    path: "/content",
    mode: OS_MODES.CONTENT,
  },
  {
    label: "Open Content Lab",
    keywords: ["lab", "intelligence", "strategy"],
    path: "/content-lab",
    mode: OS_MODES.LAB,
  },
  {
    label: "System Settings",
    keywords: ["settings", "system", "preferences"],
    path: "/settings",
    mode: OS_MODES.SYSTEM,
  },
];
