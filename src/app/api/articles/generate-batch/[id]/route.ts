import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("id", params.id)
      .single();
    if (error) throw error;
    return NextResponse.json({ job: data });
  } catch (err) {
    return errorResponse(err);
  }
}
