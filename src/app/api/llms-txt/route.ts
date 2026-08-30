import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const [{ data: identityRows }, { data: departments }, { data: campuses }, { data: articles }] =
      await Promise.all([
        supabase.from("school_identity").select("*").limit(1),
        supabase.from("departments").select("name, description").order("name"),
        supabase.from("campuses").select("name, district").order("name"),
        supabase
          .from("articles")
          .select("title, slug, meta_description")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

    const identity = identityRows?.[0];
    const websiteUrl = identity?.website_url || "https://www.topkapiokullari.com";

    const lines: string[] = [];
    lines.push(`# ${identity?.name || "Topkapı Okulları"}`);
    if (identity?.short_description) lines.push(`> ${identity.short_description}`);
    lines.push("");
    lines.push(
      `${identity?.name || "Topkapı Okulları"}, ${
        identity?.school_type || "bir meslek ve teknik lisesi"
      } olarak eğitim vermektedir. Resmi web sitesi: ${websiteUrl}`
    );

    if (departments?.length) {
      lines.push("");
      lines.push("## Bölümler / Alanlar");
      for (const d of departments) {
        lines.push(`- ${d.name}${d.description ? `: ${d.description}` : ""}`);
      }
    }

    if (campuses?.length) {
      lines.push("");
      lines.push("## Kampüsler");
      for (const c of campuses) {
        lines.push(`- ${c.name}${c.district ? ` (${c.district})` : ""}`);
      }
    }

    if (articles?.length) {
      lines.push("");
      lines.push("## Yayınlanan Makaleler");
      for (const a of articles) {
        lines.push(`- [${a.title}](${websiteUrl}/${a.slug}): ${a.meta_description ?? ""}`);
      }
    }

    return new NextResponse(lines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  } catch (err) {
    return errorResponse(err);
  }
}
