import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/app/api/_utils";
import { buildReferralTree } from "@/lib/referralTree";

export const runtime = "nodejs";

// Returns a downline tree up to a limited depth (default 3) to keep response sizes safe.
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();

    const url = new URL(req.url);
    const depthParam = Number(url.searchParams.get("depth") ?? "3");
    const maxDepth = Math.min(Math.max(depthParam, 1), 10);

    const tree = await buildReferralTree({ rootUserId: ctx.userId, depth: maxDepth });
    return NextResponse.json({ tree, maxDepth });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
