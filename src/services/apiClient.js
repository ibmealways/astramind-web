const DEFAULT_API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function getApiUrl() {
  return localStorage.getItem("astramind_api_url") || DEFAULT_API_URL;
}

export function authHeaders(headers = {}) {
  const token = localStorage.getItem("astramind_token") || "";
  return { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: authHeaders(options.headers || {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.code = data?.code;
    error.payload = data;
    throw error;
  }
  return data;
}

export default apiFetch;
