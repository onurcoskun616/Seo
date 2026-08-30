import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { requireRole } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.from("notification_settings").select("*").limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ settings: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  const check = await requireRole(req, ["admin"]);
  if ("error" in check) return check.error;
  try {
    const body = await req.json();
    const supabase = getSupabaseServer();

    const { data: existing } = await supabase.from("notification_settings").select("id").limit(1);

    const payload = {
      slack_webhook_url: body.slack_webhook_url || null,
      notify_on_review: Boolean(body.notify_on_review),
      notify_on_publish_failure: Boolean(body.notify_on_publish_failure),
      notify_on_batch_complete: Boolean(body.notify_on_batch_complete),
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing?.[0]?.id) {
      result = await supabase
        .from("notification_settings")
        .update(payload)
        .eq("id", existing[0].id)
        .select()
        .single();
    } else {
      result = await supabase.from("notification_settings").insert(payload).select().single();
    }
    if (result.error) throw result.error;
    return NextResponse.json({ settings: result.data });
  } catch (err) {
    return errorResponse(err);
  }
}
