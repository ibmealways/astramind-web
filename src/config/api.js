const configuredBase = process.env.REACT_APP_API_URL || process.env.REACT_APP_AIGENIKZ_API_BASE;

export const API_URL = String(
  configuredBase || (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "")
).replace(/\/$/, "");

export function apiUrl(path = "") {
  const normalizedPath = path && !path.startsWith("/") ? `/${path}` : path;
  return `${API_URL}${normalizedPath}`;
}

export function resolveApiAssetUrl(value = "") {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return apiUrl(value);
}