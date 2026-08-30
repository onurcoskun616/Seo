import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("school_identity").select("*").limit(1);
    if (error) throw error;
    return NextResponse.json({ identity: data?.[0] ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();

    const { data: existing, error: fetchErr } = await supabase
      .from("school_identity")
      .select("id")
      .limit(1);
    if (fetchErr) throw fetchErr;

    const payload = {
      name: body.name,
      school_type: body.school_type,
      short_description: body.short_description,
      mission: body.mission,
      history: body.history,
      accreditation: body.accreditation,
      website_url: body.website_url,
      contact_phone: body.contact_phone,
      contact_email: body.contact_email,
      social_links: body.social_links ?? {},
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing?.[0]?.id) {
      result = await supabase
        .from("school_identity")
        .update(payload)
        .eq("id", existing[0].id)
        .select()
        .single();
    } else {
      result = await supabase.from("school_identity").insert(payload).select().single();
    }

    if (result.error) throw result.error;
    return NextResponse.json({ identity: result.data });
  } catch (err) {
    return errorResponse(err);
  }
}
