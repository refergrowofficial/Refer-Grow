import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getBusinessOpportunityEmailContent } from "@/lib/businessOpportunity";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());

    const content = getBusinessOpportunityEmailContent();
    const result = await sendEmail({
      to: body.email,
      subject: content.subject,
      text: content.text,
    });

    return NextResponse.json({ ok: true, emailed: result.sent });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
