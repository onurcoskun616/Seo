import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { checkGenerationBlocked, createArticleRecord } from "@/lib/agents/createArticle";
import { GenerateArticleInput } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { data: item, error: itemErr } = await supabase
      .from("editorial_calendar")
      .select("*")
      .eq("id", params.id)
      .single();
    if (itemErr) throw itemErr;
    if (!item) {
      return NextResponse.json({ error: "Takvim girişi bulunamadı." }, { status: 404 });
    }

    const blockedReason = await checkGenerationBlocked(item.article_type);
    if (blockedReason) {
      return NextResponse.json({ error: blockedReason }, { status: 400 });
    }

    await supabase.from("editorial_calendar").update({ status: "in_progress" }).eq("id", params.id);

    const input: GenerateArticleInput = {
      articleType: item.article_type,
      audience: item.audience,
      departmentId: item.target_department_id,
      campusId: item.target_campus_id,
      extraInstructions: item.notes || undefined
    };

    const article = await createArticleRecord(input);

    await supabase
      .from("editorial_calendar")
      .update({ status: "done", linked_article_id: article.id, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    return NextResponse.json({ article });
  } catch (err) {
    await getSupabaseServer()
      .from("editorial_calendar")
      .update({ status: "planned" })
      .eq("id", params.id);
    return errorResponse(err);
  }
}
