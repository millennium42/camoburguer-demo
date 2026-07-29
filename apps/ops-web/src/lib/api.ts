export const API_BASE = "";

let csrfToken = "";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function setCsrfToken(nextToken: string) {
  csrfToken = String(nextToken || "");
}

export function clearCsrfToken() {
  csrfToken = "";
}

function isMutation(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method);
}

function syncCsrfFromPayload(payload: unknown) {
  if (payload && typeof payload === "object" && "csrfToken" in payload) {
    setCsrfToken(String(payload.csrfToken || ""));
  }
}

function errorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    if ("error" in payload && payload.error) return String(payload.error);
    if ("message" in payload && payload.message) return String(payload.message);
  }
  return `Erro ${status}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);

  if (!headers.has("content-type") && options.body && typeof options.body === "string") {
    headers.set("content-type", "application/json");
  }
  if (csrfToken && isMutation(method)) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers
  });

  if (response.status === 204) {
    return null as T;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearCsrfToken();
    }
    throw new ApiError(response.status, errorMessage(response.status, payload), payload);
  }

  syncCsrfFromPayload(payload);
  return payload as T;
}
