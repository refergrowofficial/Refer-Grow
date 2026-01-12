import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { signAuthToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/password";
import { generateUniqueReferralCode } from "@/lib/referral";
import { findBinaryPlacement } from "@/lib/binaryPlacement";
import { getBusinessOpportunityEmailContent } from "@/lib/businessOpportunity";
import { sendEmail } from "@/lib/email";
import { UserModel } from "@/models/User";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptedTerms: z.literal(true, { message: "You must accept Terms & Conditions" }),
  referralCode: z
    .string()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim() : v))
    .transform((v) => (v ? v : undefined)),
});

export async function POST(req: NextRequest) {
  try {
    const body = registerSchema.parse(await req.json());
    await connectToDatabase();

    const existing = await UserModel.findOne({ email: body.email.toLowerCase() }).select("_id");
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Optional referral code: when provided, user is placed into the binary tree under the sponsor.
    // When not provided, the user is created as a root (no upline / no binary position).
    let parentId: import("mongoose").Types.ObjectId | null = null;
    let position: "left" | "right" | null = null;

    if (body.referralCode) {
      const sponsor = await UserModel.findOne({ referralCode: body.referralCode }).select("_id");
      if (!sponsor) {
        return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
      }

      const placement = await findBinaryPlacement({ sponsorId: sponsor._id });
      parentId = placement.parentId;
      position = placement.position;
    }

    const passwordHash = await hashPassword(body.password);
    const referralCode = await generateUniqueReferralCode();

    const user = await UserModel.create({
      name: body.name,
      email: body.email,
      passwordHash,
      role: "user",
      referralCode,
      parent: parentId,
      position,
    });

    // Best-effort: email business opportunity content (no-op if SMTP isn't configured).
    try {
      const content = getBusinessOpportunityEmailContent();
      await sendEmail({ to: user.email, subject: content.subject, text: content.text });
    } catch {
      // Intentionally ignore email failures to keep signup robust.
    }

    const token = await signAuthToken({
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    const res = NextResponse.json({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        parentUserId: user.parent?.toString() ?? null,
      },
    });

    res.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
