import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { markdownToHtml } from "@/lib/markdown";
import { getSessionFromRequest } from "@/lib/auth";
import { scoreArticle } from "@/lib/quality";
import { notifyReviewRequested } from "@/lib/notify";

export const dynamic = "force-dynamic";

const REVIEWER_ONLY_STATUSES = new Set(["approved", "published"]);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("articles").select("*").eq("id", params.id).single();
    if (error) throw error;
    return NextResponse.json({ article: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const body = await req.json();

    if (
      typeof body.status === "string" &&
      REVIEWER_ONLY_STATUSES.has(body.status) &&
      session.role !== "admin" &&
      session.role !== "reviewer"
    ) {
      return NextResponse.json(
        { error: "Bu makaleyi onaylamak/yayınlamak için 'Yönetici' veya 'İnceleyen' rolü gerekir." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseServer();

    const contentChanging =
      typeof body.title === "string" ||
      typeof body.meta_description === "string" ||
      typeof body.content_markdown === "string";

    const { data: current } = await supabase
      .from("articles")
      .select("title, meta_description, content_markdown, status, faq_json, agent_trace")
      .eq("id", params.id)
      .single();

    if (contentChanging && current) {
      await supabase.from("article_revisions").insert({
        article_id: params.id,
        title: current.title,
        meta_description: current.meta_description,
        content_markdown: current.content_markdown,
        status: current.status,
        edited_by: session.name
      });
    }

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === "string") payload.title = body.title;
    if (typeof body.meta_description === "string") payload.meta_description = body.meta_description;
    if (typeof body.status === "string") payload.status = body.status;
    if (typeof body.content_markdown === "string") {
      payload.content_markdown = body.content_markdown;
      payload.content_html = markdownToHtml(body.content_markdown);
    }

    if (contentChanging && current) {
      const agentTrace = current.agent_trace as { strategistPlan?: { primaryKeyword?: string } } | null;
      payload.quality_score = scoreArticle({
        title: (payload.title as string) ?? current.title ?? "",
        metaDescription: (payload.meta_description as string) ?? current.meta_description ?? "",
        contentMarkdown: (payload.content_markdown as string) ?? current.content_markdown ?? "",
        primaryKeyword: agentTrace?.strategistPlan?.primaryKeyword,
        faqCount: Array.isArray(current.faq_json) ? current.faq_json.length : 0
      });
    }

    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    if (body.status === "in_review" && current?.status !== "in_review") {
      void notifyReviewRequested(req, data);
    }

    return NextResponse.json({ article: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("articles").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
