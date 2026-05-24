export const API_URL = "http://localhost:5050";

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getHeaders(customHeaders = {}) {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(text || "Server error");
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await parseResponse(response);

  if (response.status === 401) {
    clearAuthStorage();
    throw new Error(data.error || "Sesiunea a expirat. Autentifică-te din nou.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Eroare API.");
  }

  return data;
}

export async function apiUpload(path, formData) {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await parseResponse(response);

  if (response.status === 401) {
    clearAuthStorage();
    throw new Error(data.error || "Sesiunea a expirat. Autentifică-te din nou.");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Upload eșuat.");
  }

  return data;
}