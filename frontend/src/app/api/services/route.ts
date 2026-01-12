import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ServiceModel } from "@/models/Service";

export const runtime = "nodejs";

export async function GET() {
  await connectToDatabase();
  const services = await ServiceModel.find({ status: "active" }).sort({ createdAt: -1 });
  return NextResponse.json({ services });
}
