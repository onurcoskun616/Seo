import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { startBatchJob } from "@/lib/agents/batch";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { VALID_ARTICLE_TYPES, VALID_AUDIENCES } from "@/lib/agents/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ jobs: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!VALID_ARTICLE_TYPES.includes(body.articleType)) {
      return NextResponse.json({ error: "Geçersiz makale türü." }, { status: 400 });
    }
    if (!VALID_AUDIENCES.includes(body.audience)) {
      return NextResponse.json({ error: "Geçersiz hedef kitle." }, { status: 400 });
    }
    const targetType = body.targetType;
    if (!["department", "campus", "none"].includes(targetType)) {
      return NextResponse.json({ error: "Geçersiz hedef türü." }, { status: 400 });
    }
    const targetIds: string[] = Array.isArray(body.targetIds) ? body.targetIds : [];
    if (targetType !== "none" && targetIds.length === 0) {
      return NextResponse.json({ error: "En az bir hedef seçmelisiniz." }, { status: 400 });
    }

    const job = await startBatchJob({
      articleType: body.articleType,
      audience: body.audience,
      targetType,
      targetIds,
      extraInstructions: body.extraInstructions || undefined
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
