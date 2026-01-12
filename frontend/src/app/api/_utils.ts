import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import { verifyAuthToken } from "@/lib/jwt";
import { UserModel, type UserRole } from "@/models/User";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorJson(message: string, status = 400) {
  return json({ error: message }, { status });
}

export async function readJson<T>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export type AuthContext = {
  userId: string;
  role: UserRole;
  email: string;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    const payload = await verifyAuthToken(token);
    return { userId: payload.sub, role: payload.role, email: payload.email };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) throw new Error("Unauthorized");
  return ctx;
}

export async function requireRole(role: UserRole): Promise<AuthContext> {
  const ctx = await requireAuth();
  if (ctx.role !== role) throw new Error("Forbidden");
  return ctx;
}

export async function getCurrentUserOrThrow() {
  const ctx = await requireAuth();
  await connectToDatabase();
  const user = await UserModel.findById(ctx.userId).select(
    "name email role referralCode parent"
  );
  if (!user) throw new Error("Unauthorized");
  return { ctx, user };
}
