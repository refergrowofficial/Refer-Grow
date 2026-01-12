import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/app/api/_utils";
import { DistributionRuleModel } from "@/models/DistributionRule";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    // Accept either 0-1 (fraction) or 0-100 (percent)
    basePercentage: z
      .number()
      .finite()
      .min(0)
      .optional()
      .transform((v) => (v == null ? v : v > 1 ? v / 100 : v))
      .refine((v) => v == null || (v >= 0 && v <= 1), "basePercentage must be between 0 and 1"),
    decayEnabled: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const { id } = await params;

    const rule = await DistributionRuleModel.findById(id);
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ rule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const body = updateSchema.parse(await req.json());

    await connectToDatabase();

    const { id } = await params;

    if (body.isActive === true) {
      await DistributionRuleModel.updateMany({ isActive: true }, { $set: { isActive: false } });
    }

    const rule = await DistributionRuleModel.findByIdAndUpdate(id, body, { new: true });
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ rule });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const { id } = await params;

    const rule = await DistributionRuleModel.findByIdAndDelete(id);
    if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
