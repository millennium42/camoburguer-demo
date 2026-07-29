export const API_BASE = "";

export async function api(path: string, options: RequestInit = {}) {
  const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || "";
  
  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body && typeof options.body === "string") {
    headers.set("content-type", "application/json");
  }
  if (csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method?.toUpperCase() || "")) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: Falha de rede ou resposta invalida`);
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Erro ${response.status}`);
  }

  return payload;
}
