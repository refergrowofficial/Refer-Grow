import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireAuth } from "@/app/api/_utils";
import { IncomeModel } from "@/models/Income";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireAuth();
    await connectToDatabase();

    const incomes = await IncomeModel.find({ toUser: ctx.userId })
      .populate("fromUser", "email referralCode")
      .populate("purchase")
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ incomes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
