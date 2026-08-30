import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { markdownToHtml } from "@/lib/markdown";

export const dynamic = "force-dynamic";

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
    const body = await req.json();
    const supabase = getSupabaseServer();

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === "string") payload.title = body.title;
    if (typeof body.meta_description === "string") payload.meta_description = body.meta_description;
    if (typeof body.status === "string") payload.status = body.status;
    if (typeof body.content_markdown === "string") {
      payload.content_markdown = body.content_markdown;
      payload.content_html = markdownToHtml(body.content_markdown);
    }

    const { data, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
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
