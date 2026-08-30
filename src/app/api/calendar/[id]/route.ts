import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of [
      "title",
      "planned_date",
      "article_type",
      "audience",
      "target_department_id",
      "target_campus_id",
      "assigned_to",
      "notes",
      "status"
    ]) {
      if (key in body) payload[key] = body[key];
    }
    const { data, error } = await supabase
      .from("editorial_calendar")
      .update(payload)
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("editorial_calendar").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
