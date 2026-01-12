const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL;

function normalizeBase(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function apiUrl(path: string) {
  // In the browser we prefer same-origin calls (Next.js API proxy) so httpOnly cookies
  // are set on the frontend domain. On the server, allow an explicit base.
  const base = typeof window === "undefined" && rawBase ? normalizeBase(rawBase) : "";
  if (!base) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function apiFetch(input: string, init: RequestInit = {}) {
  const url = apiUrl(input);
  const credentials = init.credentials ?? "include";
  return fetch(url, { ...init, credentials });
}
