import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

const DEFAULT_MAPPING: Record<string, string> = {
  title: "title",
  content: "content_html",
  content_markdown: "content_markdown",
  excerpt: "meta_description",
  slug: "slug",
  json_ld: "json_ld"
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole(req, ["admin", "reviewer"]);
  if ("error" in check) return check.error;
  try {
    const body = await req.json().catch(() => ({}));
    const publishConfigId = body.publishConfigId;
    if (!publishConfigId) {
      return NextResponse.json({ error: "publishConfigId gerekli." }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const [{ data: article, error: articleErr }, { data: config, error: configErr }] = await Promise.all([
      supabase.from("articles").select("*").eq("id", params.id).single(),
      supabase.from("publish_configs").select("*").eq("id", publishConfigId).single()
    ]);

    if (articleErr) throw articleErr;
    if (configErr) throw configErr;
    if (!article || !config) {
      return NextResponse.json({ error: "Makale veya yayın ayarı bulunamadı." }, { status: 404 });
    }

    const mapping: Record<string, string> =
      config.field_mapping && Object.keys(config.field_mapping).length
        ? config.field_mapping
        : DEFAULT_MAPPING;

    const payload: Record<string, unknown> = {};
    const articleRecord = article as Record<string, unknown>;
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      payload[targetField] = articleRecord[sourceField];
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.auth_header_name && config.auth_header_value) {
      headers[config.auth_header_name] = config.auth_header_value;
    }

    let status = "failed";
    let statusCode: number | null = null;
    let responseSnippet = "";

    try {
      const res = await fetch(config.endpoint_url, {
        method: config.http_method || "POST",
        headers,
        body: JSON.stringify(payload)
      });
      statusCode = res.status;
      const text = await res.text();
      responseSnippet = text.slice(0, 500);
      status = res.ok ? "success" : "failed";
    } catch (fetchErr) {
      responseSnippet = fetchErr instanceof Error ? fetchErr.message : "Bilinmeyen ağ hatası";
    }

    await supabase.from("publish_logs").insert({
      article_id: params.id,
      publish_config_id: publishConfigId,
      status,
      status_code: statusCode,
      response_snippet: responseSnippet
    });

    if (status === "success") {
      await supabase.from("articles").update({ status: "published" }).eq("id", params.id);
    }

    return NextResponse.json({ status, statusCode, responseSnippet });
  } catch (err) {
    return errorResponse(err);
  }
}
