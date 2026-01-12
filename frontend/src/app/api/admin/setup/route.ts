import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { generateUniqueReferralCode } from "@/lib/referral";
import { UserModel } from "@/models/User";

export const runtime = "nodejs";

// One-time bootstrap endpoint to create the first admin.
// Protect this using ADMIN_SETUP_SECRET and delete/disable it after setup.
const setupSchema = z.object({
  secret: z.string().min(1),
  name: z.string().min(1).optional(),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = setupSchema.parse(await req.json());

    if (!env.ADMIN_SETUP_SECRET) {
      return NextResponse.json(
        { error: "ADMIN_SETUP_SECRET not configured" },
        { status: 500 }
      );
    }

    if (body.secret !== env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    const existingAdmin = await UserModel.exists({ role: "admin" });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin already exists" },
        { status: 409 }
      );
    }

    const existingEmail = await UserModel.exists({ email: body.email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const referralCode = await generateUniqueReferralCode();

    const admin = await UserModel.create({
      name: body.name ?? "Admin",
      email: body.email,
      passwordHash,
      role: "admin",
      referralCode,
      parent: null,
    });

    return NextResponse.json({
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        role: admin.role,
        referralCode: admin.referralCode,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
