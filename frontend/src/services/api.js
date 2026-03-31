export const API_URL = "http://localhost:5050";

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function getHeaders(customHeaders = {}) {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders
  };
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";

  let data;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(text || "Server error");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "API error");
  }

  return data;
}

export async function apiUpload(path, formData) {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  const contentType = response.headers.get("content-type") || "";

  let data;
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    throw new Error(text || "Server error");
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Upload failed");
  }

  return data;
}