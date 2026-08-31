import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("geo_test_prompts")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return NextResponse.json({ prompts: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.prompt) {
      return NextResponse.json({ error: "Soru metni gerekli." }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("geo_test_prompts")
      .insert({ prompt: body.prompt, active: true })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ prompt: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
