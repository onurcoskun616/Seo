import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    if (check.session.sub === params.id) {
      return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("panel_users").delete().eq("id", params.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
