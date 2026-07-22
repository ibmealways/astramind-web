export const CONTENT_LAB_EXPERIMENTS_KEY = "astramind_experiments";

export function loadContentLabExperiments() {
  try {
    const records = JSON.parse(localStorage.getItem(CONTENT_LAB_EXPERIMENTS_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch { return []; }
}

export function persistContentLabExperiment(experiment) {
  if (!experiment?.id || !experiment?.question) return null;
  const current = loadContentLabExperiments();
  const normalized = {
    ...experiment,
    domain: experiment.domain || "science",
    status: experiment.status || "evidence-ready",
    createdAt: experiment.createdAt || new Date().toISOString(),
  };
  const next = [normalized, ...current.filter(({ id }) => id !== normalized.id)].slice(0, 100);
  localStorage.setItem(CONTENT_LAB_EXPERIMENTS_KEY, JSON.stringify(next));
  return normalized;
}

export default persistContentLabExperiment;
