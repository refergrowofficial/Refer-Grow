import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { env } from "@/lib/env";
import { signAuthToken } from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { UserModel } from "@/models/User";
import { withRateLimit, withValidatedBody } from "@/app/api/_middleware";

export const runtime = "nodejs";

// Dummy hash used to reduce timing differences between "user not found" and
// "wrong password" cases. This helps mitigate user enumeration attacks.
const DUMMY_PASSWORD_HASH = "$2b$12$npwxPAElS4BfdU.iS5LIFuqi0v31VhieuIsoP1t9cMORH152MK/3i";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = withRateLimit(
  { keyPrefix: "auth:login", windowMs: 60_000, max: 20 },
  withValidatedBody(loginSchema, async (_req: NextRequest, { body }) => {
    await connectToDatabase();

    const user = await UserModel.findOne({ email: body.email.toLowerCase() });
    if (!user) {
      // Run a compare anyway to avoid leaking whether the email exists.
      await verifyPassword(body.password, DUMMY_PASSWORD_HASH);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
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
  })
);
