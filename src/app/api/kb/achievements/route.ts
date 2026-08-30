import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .order("achievement_date", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ achievements: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("achievements")
      .insert({
        title: body.title,
        category: body.category || "diger",
        description: body.description ?? null,
        achievement_date: body.achievement_date || null,
        department_id: body.department_id || null,
        campus_id: body.campus_id || null,
        source_url: body.source_url || null
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ achievement: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
