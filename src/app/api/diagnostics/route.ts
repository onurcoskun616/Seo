import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { runDiagnostics } from "@/lib/diagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const report = await runDiagnostics();
    return NextResponse.json({ report });
  } catch (err) {
    return errorResponse(err);
  }
}
