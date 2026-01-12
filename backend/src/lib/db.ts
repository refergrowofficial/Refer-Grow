import mongoose from "mongoose";
import { env } from "@/lib/env";

// Cache the connection in Node global to avoid creating many connections
// in dev/watch mode.
declare global {
  // eslint-disable-next-line no-var
  var __mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const cached = global.__mongooseConn ?? { conn: null, promise: null };
global.__mongooseConn = cached;

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(env.MONGODB_URI, {
        // Keep defaults; tune here if needed (pool sizes, timeouts, etc.).
      })
      .then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
