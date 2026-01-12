import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { distributeBusinessVolumeWithSession } from "@/lib/bvDistribution";
import { requireAuth } from "@/app/api/_utils";
import { PurchaseModel } from "@/models/Purchase";
import { withAuth, withRateLimit, withValidatedBody } from "@/app/api/_middleware";

export const runtime = "nodejs";

const createSchema = z.object({
  serviceId: z.string().min(1),
});

export async function GET() {
  try {
    const ctx = await requireAuth();
    await connectToDatabase();

    const purchases = await PurchaseModel.find({ user: ctx.userId })
      .populate("service")
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ purchases });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  // Keep signature for Next.js, but delegate to composed middleware.
  return composedPOST(req, { params: Promise.resolve({}) });
}

const composedPOST = withRateLimit(
  { keyPrefix: "purchases:create", windowMs: 60_000, max: 60 },
  withAuth(
    withValidatedBody(createSchema, async (_req: NextRequest, { auth, body }) => {
      await connectToDatabase();

      if (!auth) {
        // Guaranteed by withAuth; keeps TypeScript happy.
        throw new Error("Unauthorized");
      }

      const session = await mongoose.startSession();
      try {
        const result = await session.withTransaction(async () => {
          const [purchase] = await PurchaseModel.create(
            [
              {
                user: new mongoose.Types.ObjectId(auth.userId),
                service: new mongoose.Types.ObjectId(body.serviceId),
                // Filled after BV is computed from the Service.
                bv: 0,
              },
            ],
            { session }
          );

          const distribution = await distributeBusinessVolumeWithSession({
            userId: auth.userId,
            serviceId: body.serviceId,
            purchaseId: purchase._id.toString(),
            session,
          });

          await PurchaseModel.updateOne(
            { _id: purchase._id },
            { $set: { bv: distribution.bv } },
            { session }
          );

          return {
            purchaseId: purchase._id.toString(),
            bv: distribution.bv,
            logsCreated: distribution.logsCreated,
            levelsPaid: distribution.levelsPaid,
          };
        });

        if (!result) throw new Error("Transaction failed");
        return NextResponse.json({ ok: true, ...result }, { status: 201 });
      } finally {
        session.endSession();
      }
    })
  )
);
