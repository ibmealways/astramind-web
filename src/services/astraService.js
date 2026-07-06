const API_BASE =
  process.env.REACT_APP_ASTRAMIND_API_BASE || "http://localhost:5000";

async function handleResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  let payload;

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return payload;
}

export async function sendChatMessage(message, context = {}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      context,
    }),
  });

  return handleResponse(response);
}

export async function generateContent(payload) {
  const response = await fetch(`${API_BASE}/api/content/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function runFinanceAnalysis(payload) {
  const response = await fetch(`${API_BASE}/api/finance/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function generateBookContent(payload) {
  const response = await fetch(`${API_BASE}/api/content/book`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}