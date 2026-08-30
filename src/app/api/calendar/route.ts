import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("editorial_calendar")
      .select("*")
      .order("planned_date", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.planned_date || !body.article_type) {
      return NextResponse.json({ error: "Başlık, tarih ve makale türü gerekli." }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("editorial_calendar")
      .insert({
        title: body.title,
        planned_date: body.planned_date,
        article_type: body.article_type,
        audience: body.audience || "genel",
        target_department_id: body.target_department_id || null,
        target_campus_id: body.target_campus_id || null,
        assigned_to: body.assigned_to || null,
        notes: body.notes || null,
        status: "planned"
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
