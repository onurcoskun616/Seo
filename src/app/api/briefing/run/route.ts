import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";
import { composeAndSendBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const briefing = await composeAndSendBriefing();
    return NextResponse.json({ briefing });
  } catch (err) {
    return errorResponse(err);
  }
}
