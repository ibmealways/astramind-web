import { isFeatureEnabled } from "./featureFlags.js";

export const ROUTES_CONFIG = [
  {
    path: "/",
    label: "Home",
    icon: "🏠",
    featureFlag: null,
    group: "Core",
    searchable: true,
  },
  {
    path: "/creator-dashboard",
    label: "Creator Dashboard",
    icon: "📊",
    featureFlag: "creatorDashboard",
    group: "Core",
    searchable: true,
  },
  {
    path: "/setup",
    label: "Creator Setup",
    icon: "🛠️",
    featureFlag: "creatorSetup",
    group: "Core",
    searchable: true,
  },
  {
    path: "/chat",
    label: "Chat",
    icon: "💬",
    featureFlag: null,
    group: "Core",
    searchable: true,
  },

  {
    path: "/finance",
    label: "Finance Hub",
    icon: "💸",
    featureFlag: "financeHub",
    group: "Finance OS",
    searchable: true,
  },
  {
    path: "/finance/income",
    label: "Income",
    icon: "📈",
    featureFlag: "financeIncome",
    group: "Finance OS",
    searchable: true,
  },
  {
    path: "/finance/expenses",
    label: "Expenses",
    icon: "📉",
    featureFlag: "financeExpenses",
    group: "Finance OS",
    searchable: true,
  },
  {
    path: "/finance/savings",
    label: "Savings",
    icon: "🏦",
    featureFlag: "financeSavings",
    group: "Finance OS",
    searchable: true,
  },

  {
    path: "/content",
    label: "Content Creator",
    icon: "🎬",
    featureFlag: "contentCreator",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/project-library",
    label: "Project Library",
    icon: "\u{1F5C2}",
    featureFlag: null,
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content-lab",
    label: "Content Lab",
    icon: "🧪",
    featureFlag: "contentLab",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content/script",
    label: "Script Writer",
    icon: "✍️",
    featureFlag: "contentScript",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content/image",
    label: "Image Studio",
    icon: "🖼️",
    featureFlag: "contentImage",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content/video",
    label: "Video Studio",
    icon: "🎥",
    featureFlag: "contentVideo",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content/audio",
    label: "Audio / Music",
    icon: "🎵",
    featureFlag: "contentAudio",
    group: "Content Creation OS",
    searchable: true,
  },
  {
    path: "/content/book",
    label: "Book Writer",
    icon: "📚",
    featureFlag: "contentBook",
    group: "Content Creation OS",
    searchable: true,
  },

  {
    path: "/settings",
    label: "Settings",
    icon: "⚙️",
    featureFlag: null,
    group: "System",
    searchable: true,
  },
];

export function getEnabledRoutes() {
  return ROUTES_CONFIG.filter((route) => {
    if (!route.featureFlag) return true;
    return isFeatureEnabled(route.featureFlag);
  });
}

export function getRoutesByGroup() {
  return getEnabledRoutes().reduce((acc, route) => {
    if (!acc[route.group]) {
      acc[route.group] = [];
    }
    acc[route.group].push(route);
    return acc;
  }, {});
}

export function findRouteByPath(pathname) {
  return ROUTES_CONFIG.find((route) => route.path === pathname) || null;
}

export default ROUTES_CONFIG;