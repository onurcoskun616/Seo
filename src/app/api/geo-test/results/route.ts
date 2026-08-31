import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("geo_visibility_results")
      .select("*")
      .order("checked_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return NextResponse.json({ results: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}
