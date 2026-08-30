import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { startBatchJob } from "@/lib/agents/batch";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 3;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Haftalık zamanlanmış görev: Bilgi Bankası'nda olup henüz hiç makalesi
 * (taslak dahil) olmayan bölümler/kampüsler varsa, bunlar için otomatik
 * taslak üretir (maliyeti kontrol altında tutmak için tek seferde en fazla
 * MAX_PER_RUN adet). Zaten kapsanan içerik varsa hiçbir şey yapmaz.
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServer();

    const [{ data: departments }, { data: campuses }, { data: articles }] = await Promise.all([
      supabase.from("departments").select("id, name"),
      supabase.from("campuses").select("id, name"),
      supabase.from("articles").select("target_department_id, target_campus_id")
    ]);

    const coveredDeptIds = new Set((articles || []).map((a) => a.target_department_id).filter(Boolean));
    const coveredCampusIds = new Set((articles || []).map((a) => a.target_campus_id).filter(Boolean));

    const uncoveredDepartments = (departments || []).filter((d) => !coveredDeptIds.has(d.id));
    const uncoveredCampuses = (campuses || []).filter((c) => !coveredCampusIds.has(c.id));

    const jobs: { type: string; targetIds: string[]; jobId: string }[] = [];

    if (uncoveredDepartments.length) {
      const ids = uncoveredDepartments.slice(0, MAX_PER_RUN).map((d) => d.id);
      const job = await startBatchJob({
        articleType: "department_overview",
        audience: "ogrenci_9_10",
        targetType: "department",
        targetIds: ids
      });
      jobs.push({ type: "department_overview", targetIds: ids, jobId: job.id });
    } else if (uncoveredCampuses.length) {
      const ids = uncoveredCampuses.slice(0, MAX_PER_RUN).map((c) => c.id);
      const job = await startBatchJob({
        articleType: "campus_overview",
        audience: "veli",
        targetType: "campus",
        targetIds: ids
      });
      jobs.push({ type: "campus_overview", targetIds: ids, jobId: job.id });
    }

    return NextResponse.json({
      ok: true,
      startedJobs: jobs,
      message: jobs.length
        ? "Kapsanmayan hedefler için taslak üretimi başlatıldı."
        : "Tüm bölümler/kampüsler zaten en az bir makaleye sahip; yapılacak bir şey yok."
    });
  } catch (err) {
    return errorResponse(err);
  }
}
