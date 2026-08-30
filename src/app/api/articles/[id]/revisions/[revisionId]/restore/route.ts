import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { markdownToHtml } from "@/lib/markdown";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; revisionId: string } }
) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const [{ data: revision, error: revErr }, { data: current, error: curErr }] = await Promise.all([
      supabase.from("article_revisions").select("*").eq("id", params.revisionId).single(),
      supabase.from("articles").select("*").eq("id", params.id).single()
    ]);
    if (revErr) throw revErr;
    if (curErr) throw curErr;
    if (!revision || revision.article_id !== params.id) {
      return NextResponse.json({ error: "Geçmiş kaydı bulunamadı." }, { status: 404 });
    }

    // Geri yüklemeden önce mevcut hâli de geçmişe kaydet (böylece geri
    // yükleme de geri alınabilir).
    await supabase.from("article_revisions").insert({
      article_id: params.id,
      title: current.title,
      meta_description: current.meta_description,
      content_markdown: current.content_markdown,
      status: current.status,
      edited_by: session.name
    });

    const { data, error } = await supabase
      .from("articles")
      .update({
        title: revision.title,
        meta_description: revision.meta_description,
        content_markdown: revision.content_markdown,
        content_html: markdownToHtml(revision.content_markdown || ""),
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ article: data });
  } catch (err) {
    return errorResponse(err);
  }
}
