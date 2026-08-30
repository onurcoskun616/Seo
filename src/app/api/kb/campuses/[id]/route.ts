import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("campuses")
      .update({
        name: body.name,
        district: body.district ?? null,
        address: body.address ?? null,
        facilities: body.facilities ?? [],
        contact_phone: body.contact_phone ?? null,
        description: body.description ?? null,
        updated_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ campus: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("campuses").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
