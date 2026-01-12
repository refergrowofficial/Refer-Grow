import { NextResponse } from "next/server";
import { getCurrentUserOrThrow } from "@/app/api/_utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { user } = await getCurrentUserOrThrow();
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        parentUserId: user.parent?.toString() ?? null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
