import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: ["/api/:path*"],
};

type RateEntry = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __refergrowEdgeRateLimit: Map<string, RateEntry> | undefined;
}

function getStore() {
  if (!globalThis.__refergrowEdgeRateLimit) globalThis.__refergrowEdgeRateLimit = new Map();
  return globalThis.__refergrowEdgeRateLimit;
}

function getIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

async function verifyJwtRole(req: NextRequest): Promise<"admin" | "user" | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const key = new TextEncoder().encode(secret);
  try {
    const { payload } = await jwtVerify(token, key);
    const role = payload.role;
    return role === "admin" || role === "user" ? role : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  // Basic edge rate limiting for all /api/*.
  // Note: in-memory and per-instance; for real production use a shared store (e.g. Redis/Upstash).
  const store = getStore();
  const now = Date.now();
  const ip = getIp(req);

  const windowMs = 60_000;
  const max = req.nextUrl.pathname.startsWith("/api/auth/") ? 20 : 120;
  const key = `${req.nextUrl.pathname.startsWith("/api/auth/") ? "auth" : "api"}:${ip}`;

  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
    store.set(key, entry);
    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfterSeconds),
        },
      });
    }
  }

  // RBAC gate: all /api/admin/* requires an admin JWT.
  if (req.nextUrl.pathname.startsWith("/api/admin/")) {
    // Allow first-time bootstrap endpoint (still protected by ADMIN_SETUP_SECRET).
    if (req.nextUrl.pathname === "/api/admin/setup") {
      return NextResponse.next();
    }

    const role = await verifyJwtRole(req);
    if (role !== "admin") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  return NextResponse.next();
}
