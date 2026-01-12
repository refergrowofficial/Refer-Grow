import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/app/api/_utils";
import { UserModel } from "@/models/User";
import { PurchaseModel } from "@/models/Purchase";
import { IncomeLogModel } from "@/models/IncomeLog";
import { ServiceModel } from "@/models/Service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const [totalUsers, activeServices] = await Promise.all([
      UserModel.estimatedDocumentCount(),
      ServiceModel.countDocuments({
        $or: [{ status: "active" }, { status: { $exists: false }, isActive: true }],
      }),
    ]);

    const bvAgg = await PurchaseModel.aggregate<{ _id: null; totalBVGenerated: number }>([
      { $group: { _id: null, totalBVGenerated: { $sum: { $ifNull: ["$bv", 0] } } } },
    ]);
    const totalBVGenerated = bvAgg[0]?.totalBVGenerated ?? 0;

    const incomeAgg = await IncomeLogModel.aggregate<{ _id: null; totalIncomeDistributed: number }>([
      {
        $group: {
          _id: null,
          totalIncomeDistributed: { $sum: { $ifNull: ["$incomeAmount", 0] } },
        },
      },
    ]);
    const totalIncomeDistributed = incomeAgg[0]?.totalIncomeDistributed ?? 0;

    return NextResponse.json({
      totalUsers,
      totalBVGenerated,
      totalIncomeDistributed,
      activeServices,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
