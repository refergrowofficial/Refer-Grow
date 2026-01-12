import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

function normalizeBase(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function backendBaseUrl() {
  // Prefer a server-only env var if provided, fallback to the public one.
  const raw = process.env.BACKEND_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  return normalizeBase(raw);
}

async function proxy(req: NextRequest) {
  const base = backendBaseUrl();
  const url = `${base}${req.nextUrl.pathname}${req.nextUrl.search}`;

  const headers = new Headers(req.headers);
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.delete("host");

  const method = req.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const upstream = await fetch(url, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    if (key.toLowerCase() === "content-encoding") return;
    if (key.toLowerCase() === "connection") return;
    responseHeaders.set(key, value);
  });

  // Preserve multi-set-cookie behavior if available.
  const getSetCookie = (upstream.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = typeof getSetCookie === "function" ? getSetCookie.call(upstream.headers) : undefined;
  if (setCookies && setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const c of setCookies) responseHeaders.append("set-cookie", c);
  }

  const data = await upstream.arrayBuffer();
  return new NextResponse(data, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
