const STORAGE_KEY = "astramind_content_projects";

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createProject({ type, title, content }) {
  return {
    id: "proj_" + Date.now(),
    type,
    title,
    versions: [
      {
        id: "v1",
        content,
        createdAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };
}
