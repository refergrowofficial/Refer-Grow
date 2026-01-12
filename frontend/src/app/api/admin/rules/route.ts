import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/app/api/_utils";
import { DistributionRuleModel } from "@/models/DistributionRule";

export const runtime = "nodejs";

const upsertSchema = z.object({
  // Accept either 0-1 (fraction) or 0-100 (percent)
  basePercentage: z
    .number()
    .finite()
    .min(0)
    .transform((v) => (v > 1 ? v / 100 : v))
    .refine((v) => v >= 0 && v <= 1, "basePercentage must be between 0 and 1"),
  decayEnabled: z.boolean(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const activeRule = await DistributionRuleModel.findOne({ isActive: true }).sort({ createdAt: -1 });
    const recentRules = await DistributionRuleModel.find({}).sort({ createdAt: -1 }).limit(10);
    return NextResponse.json({ activeRule, recentRules });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = upsertSchema.parse(await req.json());

    await connectToDatabase();

    const isActive = body.isActive ?? true;
    if (isActive) {
      await DistributionRuleModel.updateMany({ isActive: true }, { $set: { isActive: false } });
    }

    const rule = await DistributionRuleModel.create({
      basePercentage: body.basePercentage,
      decayEnabled: body.decayEnabled,
      isActive,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
