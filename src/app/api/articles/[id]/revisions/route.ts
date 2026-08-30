import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("article_revisions")
      .select("*")
      .eq("article_id", params.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ revisions: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
