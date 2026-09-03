import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("geo_visibility_results")
      .select("run_id, mentioned, error, checked_at")
      .not("run_id", "is", null)
      .order("checked_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    const byRun = new Map<string, { checkedAt: string; total: number; mentioned: number }>();
    for (const row of data || []) {
      if (!row.run_id) continue;
      const entry = byRun.get(row.run_id) || { checkedAt: row.checked_at, total: 0, mentioned: 0 };
      if (!row.error) {
        entry.total++;
        if (row.mentioned) entry.mentioned++;
      }
      if (row.checked_at > entry.checkedAt) entry.checkedAt = row.checked_at;
      byRun.set(row.run_id, entry);
    }

    const runs = Array.from(byRun.entries())
      .map(([runId, v]) => ({
        runId,
        checkedAt: v.checkedAt,
        total: v.total,
        mentionedCount: v.mentioned,
        shareOfVoicePercent: v.total ? Math.round((v.mentioned / v.total) * 1000) / 10 : 0
      }))
      .sort((a, b) => (a.checkedAt < b.checkedAt ? 1 : -1))
      .slice(0, 20);

    return NextResponse.json({ runs });
  } catch (err) {
    return errorResponse(err);
  }
}
