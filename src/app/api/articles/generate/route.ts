import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { runArticlePipeline } from "@/lib/agents/pipeline";
import { GenerateArticleInput } from "@/lib/agents/types";
import { ArticleType, Audience } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: ArticleType[] = [
  "school_identity",
  "department_overview",
  "campus_overview",
  "parent_guide",
  "vocational_school_explainer",
  "comparison"
];
const VALID_AUDIENCES: Audience[] = ["ogrenci_9_10", "veli", "genel"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!VALID_TYPES.includes(body.articleType)) {
      return NextResponse.json({ error: "Geçersiz makale türü." }, { status: 400 });
    }
    if (!VALID_AUDIENCES.includes(body.audience)) {
      return NextResponse.json({ error: "Geçersiz hedef kitle." }, { status: 400 });
    }

    const input: GenerateArticleInput = {
      articleType: body.articleType,
      audience: body.audience,
      departmentId: body.departmentId || null,
      campusId: body.campusId || null,
      extraInstructions: body.extraInstructions || undefined
    };

    const result = await runArticlePipeline(input);

    const supabase = getSupabaseServer();

    let slug = result.slug;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await supabase.from("articles").select("id").eq("slug", slug).limit(1);
      if (!clash || clash.length === 0) break;
      slug = `${result.slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    const { data, error } = await supabase
      .from("articles")
      .insert({
        article_type: input.articleType,
        target_department_id: input.departmentId,
        target_campus_id: input.campusId,
        audience: input.audience,
        title: result.title,
        slug,
        meta_description: result.metaDescription,
        content_markdown: result.contentMarkdown,
        content_html: result.contentHtml,
        faq_json: result.faqJson,
        json_ld: result.jsonLd,
        ai_answer_snippet: result.aiAnswerSnippet,
        status: "draft",
        agent_trace: result.agentTrace,
        extra_instructions: input.extraInstructions ?? null
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ article: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
