import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("campuses").select("*").order("name");
    if (error) throw error;
    return NextResponse.json({ campuses: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("campuses")
      .insert({
        name: body.name,
        district: body.district ?? null,
        address: body.address ?? null,
        facilities: body.facilities ?? [],
        contact_phone: body.contact_phone ?? null,
        description: body.description ?? null
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ campus: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
