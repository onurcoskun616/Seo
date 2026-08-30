import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";
import { sendSlackMessage } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const result = await sendSlackMessage(
      "🔔 Topkapı Okulları SEO/GEO paneli test bildirimi — Slack entegrasyonu çalışıyor."
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Gönderilemedi." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
