import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("publish_configs")
      .select("id, name, endpoint_url, http_method, auth_header_name, field_mapping, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ configs: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("publish_configs")
      .insert({
        name: body.name,
        endpoint_url: body.endpoint_url,
        http_method: body.http_method || "POST",
        auth_header_name: body.auth_header_name || null,
        auth_header_value: body.auth_header_value || null,
        field_mapping: body.field_mapping || {}
      })
      .select("id, name, endpoint_url, http_method, auth_header_name, field_mapping, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ config: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
