const STORAGE_KEY = "astramind_creator_profile";

function defaultProfile() {
  return {
    niche: "general",
    tone: "engaging",
    platforms: ["tiktok"],
    preferences: {},
    history: [],
  };
}

function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      const profile = defaultProfile();
      saveProfile(profile);
      return profile;
    }
    return JSON.parse(saved);
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getCreatorProfile() {
  return loadProfile();
}

export function updateCreatorProfile({ idea = "", type = "general" }) {
  const profile = loadProfile();
  const text = String(idea).toLowerCase();

  if (text.includes("pressure washing")) profile.niche = "cleaning / service business";
  else if (text.includes("money") || text.includes("invest")) profile.niche = "finance";
  else if (text.includes("fitness")) profile.niche = "fitness";

  if (text.includes("tiktok")) profile.platforms = ["tiktok"];
  if (text.includes("instagram")) profile.platforms = ["instagram"];
  if (text.includes("youtube")) profile.platforms = ["youtube"];

  if (text.includes("viral")) profile.tone = "viral";
  if (text.includes("professional")) profile.tone = "professional";

  profile.preferences[type] = (profile.preferences[type] || 0) + 1;

  profile.history.unshift({
    idea,
    type,
    timestamp: new Date().toISOString(),
  });

  profile.history = profile.history.slice(0, 50);
  saveProfile(profile);

  return profile;
}