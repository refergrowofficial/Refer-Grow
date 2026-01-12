import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/app/api/_utils";
import { buildReferralTree } from "@/lib/referralTree";

export const runtime = "nodejs";

// GET /api/referrals/tree?userId=...&depth=...
// - Admin can fetch any user's tree.
// - Regular users can fetch only their own tree.
const querySchema = z.object({
  userId: z.string().min(1),
  depth: z.coerce.number().int().min(0).max(50).default(3),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAuth();

    const url = new URL(req.url);
    const parsed = querySchema.parse({
      userId: url.searchParams.get("userId"),
      depth: url.searchParams.get("depth") ?? undefined,
    });

    if (ctx.role !== "admin" && parsed.userId !== ctx.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tree = await buildReferralTree({
      rootUserId: parsed.userId,
      depth: parsed.depth,
    });

    return NextResponse.json({
      userId: parsed.userId,
      depth: parsed.depth,
      tree,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
