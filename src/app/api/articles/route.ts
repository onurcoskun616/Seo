import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("articles")
      .select(
        "id, article_type, target_department_id, target_campus_id, audience, title, slug, status, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ articles: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
