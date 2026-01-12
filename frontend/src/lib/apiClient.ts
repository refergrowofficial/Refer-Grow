const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL;

function normalizeBase(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function apiUrl(path: string) {
  const base = rawBase ? normalizeBase(rawBase) : "";
  if (!base) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function apiFetch(input: string, init: RequestInit = {}) {
  const url = apiUrl(input);
  const credentials = init.credentials ?? "include";
  return fetch(url, { ...init, credentials });
}
