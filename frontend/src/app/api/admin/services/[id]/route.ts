import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/app/api/_utils";
import { ServiceModel } from "@/models/Service";

export const runtime = "nodejs";

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    price: z.number().finite().min(0).optional(),
    businessVolume: z.number().finite().min(0).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const { id } = await params;

    const service = await ServiceModel.findById(id);
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ service });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    const body = updateSchema.parse(await req.json());
    await connectToDatabase();

    const { id } = await params;

    const service = await ServiceModel.findByIdAndUpdate(id, body, { new: true });
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ service });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole("admin");
    await connectToDatabase();

    const { id } = await params;

    const service = await ServiceModel.findByIdAndDelete(id);
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
