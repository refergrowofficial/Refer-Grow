import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/app/api/_utils";
import { ServiceModel } from "@/models/Service";

export const runtime = "nodejs";

const createServiceSchema = z.object({
  name: z.string().min(1),
  price: z.number().finite().min(0),
  businessVolume: z.number().finite().min(0),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET() {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const services = await ServiceModel.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ services });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Forbidden";
    return NextResponse.json({ error: msg }, { status: msg === "Forbidden" ? 403 : 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = createServiceSchema.parse(await req.json());

    await connectToDatabase();
    const service = await ServiceModel.create({
      name: body.name,
      price: body.price,
      businessVolume: body.businessVolume,
      status: body.status ?? "active",
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
