import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

const encoder = new TextEncoder();
const secretKey = encoder.encode(env.JWT_SECRET);

export type AuthTokenPayload = {
  sub: string; // user id
  role: "admin" | "user";
  email: string;
};

export async function signAuthToken(payload: AuthTokenPayload) {
  // 7 days by default; adjust as needed.
  return new SignJWT({ role: payload.role, email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyAuthToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey);

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Invalid token subject");
  }

  const role = payload.role;
  const email = payload.email;

  if ((role !== "admin" && role !== "user") || typeof email !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    sub: payload.sub,
    role,
    email,
  } satisfies AuthTokenPayload;
}
