const FEEDBACK_KEY = "astramind_content_feedback";

function readFeedback() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(FEEDBACK_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function recordFeedback(feedback) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify([...readFeedback(), feedback].slice(-200)));
}

export function getBestPlatform(type) {
  const relevant = readFeedback().filter((item) => !type || item.type === type);
  const scores = relevant.reduce((result, item) => {
    if (!item.platform) return result;
    result[item.platform] = (result[item.platform] || 0) + Number(item.score || 1);
    return result;
  }, {});
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}