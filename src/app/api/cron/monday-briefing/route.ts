import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { composeAndSendBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Haftalık "Yeniden ölç" adımı: GitHub Actions (veya başka bir zamanlayıcı) tarafından çağrılır. */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }
  try {
    const briefing = await composeAndSendBriefing();
    return NextResponse.json({ briefing });
  } catch (err) {
    return errorResponse(err);
  }
}
