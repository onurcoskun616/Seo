import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("cost_rates").select("*").order("provider");
    if (error) throw error;
    return NextResponse.json({ rates: data ?? [] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const body = await req.json();
    if (!body.provider || !body.model) {
      return NextResponse.json({ error: "Sağlayıcı ve model gerekli." }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("cost_rates")
      .upsert(
        {
          provider: body.provider,
          model: body.model,
          input_price_per_million: Number(body.input_price_per_million) || 0,
          output_price_per_million: Number(body.output_price_per_million) || 0,
          updated_at: new Date().toISOString()
        },
        { onConflict: "provider,model" }
      )
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ rate: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
