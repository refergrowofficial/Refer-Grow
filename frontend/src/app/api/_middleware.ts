import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { UserRole } from "@/models/User";
import { requireAuth, requireRole, type AuthContext } from "@/app/api/_utils";

export type NextRouteContext = {
  // Next.js provides `params` as a Promise in route handlers.
  // For non-dynamic routes it resolves to an empty object (still compatible with Record).
  params: Promise<Record<string, string>>;
};

export type MiddlewareCtx = NextRouteContext & {
  auth?: AuthContext;
  body?: unknown;
  query?: URLSearchParams;
};

export type ApiHandler<TCtx extends MiddlewareCtx = MiddlewareCtx> = (
  req: NextRequest,
  ctx: TCtx
) => Promise<Response>;

export function withAuth<TCtx extends MiddlewareCtx>(handler: ApiHandler<TCtx & { auth: AuthContext }>) {
  return async (req: NextRequest, ctx: TCtx) => {
    const auth = await requireAuth();
    return handler(req, { ...ctx, auth });
  };
}

export function withRole<TCtx extends MiddlewareCtx>(
  role: UserRole,
  handler: ApiHandler<TCtx & { auth: AuthContext }>
) {
  return async (req: NextRequest, ctx: TCtx) => {
    const auth = await requireRole(role);
    return handler(req, { ...ctx, auth });
  };
}

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  max: number;
};

type RateLimitEntry = { count: number; resetAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __refergrowRateLimit: Map<string, RateLimitEntry> | undefined;
}

function getRateLimitStore() {
  if (!globalThis.__refergrowRateLimit) globalThis.__refergrowRateLimit = new Map();
  return globalThis.__refergrowRateLimit;
}

function getClientIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  // NextRequest.ip exists in some deployments, but isn't guaranteed.
  const reqWithIp = req as NextRequest & { ip?: string };
  return reqWithIp.ip ?? "unknown";
}

export function withRateLimit<TCtx extends MiddlewareCtx>(
  options: RateLimitOptions,
  handler: ApiHandler<TCtx>
) {
  return async (req: NextRequest, ctx: TCtx) => {
    const store = getRateLimitStore();
    const now = Date.now();
    const ip = getClientIp(req);
    const key = `${options.keyPrefix}:${ip}`;

    const existing = store.get(key);
    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
    } else {
      existing.count += 1;
      store.set(key, existing);
      if (existing.count > options.max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
        return new NextResponse(JSON.stringify({ error: "Too Many Requests" }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": String(retryAfterSeconds),
          },
        });
      }
    }

    return handler(req, ctx);
  };
}

export function withValidatedBody<TSchema extends z.ZodTypeAny, TCtx extends MiddlewareCtx>(
  schema: TSchema,
  handler: ApiHandler<TCtx & { body: z.infer<TSchema> }>
) {
  return async (req: NextRequest, ctx: TCtx) => {
    let jsonBody: unknown;
    try {
      jsonBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = schema.safeParse(jsonBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    return handler(req, { ...ctx, body: parsed.data });
  };
}

export function withQuery<TCtx extends MiddlewareCtx>(handler: ApiHandler<TCtx & { query: URLSearchParams }>) {
  return async (req: NextRequest, ctx: TCtx) => {
    return handler(req, { ...ctx, query: req.nextUrl.searchParams });
  };
}
