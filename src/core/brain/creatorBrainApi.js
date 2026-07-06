const DEFAULT_API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

function getApiUrl() {
  return localStorage.getItem("astramind_api_url") || DEFAULT_API_URL;
}

async function handleJson(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }
  return data;
}

export async function getCreatorProfile() {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/profile`);
  return handleJson(response);
}

export async function updateCreatorProfile(payload) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(response);
}

export async function getCreatorProjects() {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/projects`);
  return handleJson(response);
}

export async function createCreatorProject(payload) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(response);
}

export async function updateCreatorProject(id, payload) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(response);
}

export async function deleteCreatorProject(id) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/projects/${id}`, {
    method: "DELETE",
  });
  return handleJson(response);
}

export async function getCreatorMemory(params = {}) {
  const query = new URLSearchParams();

  if (params.category) query.set("category", params.category);
  if (params.linkedProjectId) query.set("linkedProjectId", params.linkedProjectId);

  const url = `${getApiUrl()}/api/creator-brain/memory${
    query.toString() ? `?${query.toString()}` : ""
  }`;

  const response = await fetch(url);
  return handleJson(response);
}

export async function createCreatorMemory(payload) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(response);
}

export async function updateCreatorMemory(id, payload) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/memory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson(response);
}

export async function deleteCreatorMemory(id) {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/memory/${id}`, {
    method: "DELETE",
  });
  return handleJson(response);
}

export async function getCreatorDashboard() {
  const response = await fetch(`${getApiUrl()}/api/creator-brain/dashboard`);
  return handleJson(response);
}