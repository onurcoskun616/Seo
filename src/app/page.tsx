import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { estimateCost, getCostRates } from "@/lib/usage";

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = getSupabaseServer();

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    { count: articleCount },
    { count: draftCount },
    { count: publishedCount },
    { count: inReviewCount },
    { count: deptCount },
    { count: campusCount },
    { data: qualityRows },
    { data: geoRows },
    { count: duePlannedCount },
    { data: usageRows }
  ] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "in_review"),
    supabase.from("departments").select("*", { count: "exact", head: true }),
    supabase.from("campuses").select("*", { count: "exact", head: true }),
    supabase.from("articles").select("quality_score").not("quality_score", "is", null),
    supabase
      .from("geo_visibility_results")
      .select("run_id, mentioned, error, checked_at")
      .not("run_id", "is", null)
      .order("checked_at", { ascending: false })
      .limit(50),
    supabase
      .from("editorial_calendar")
      .select("*", { count: "exact", head: true })
      .eq("status", "planned")
      .lte("planned_date", new Date().toISOString().slice(0, 10)),
    supabase
      .from("api_usage_logs")
      .select("provider, model, prompt_tokens, completion_tokens")
      .gte("created_at", monthAgo.toISOString())
      .limit(5000)
  ]);

  const avgQuality = qualityRows?.length
    ? Math.round(
        qualityRows.reduce((sum, r) => sum + ((r.quality_score as { overall?: number })?.overall || 0), 0) /
          qualityRows.length
      )
    : null;

  let latestRunShareOfVoice: number | null = null;
  if (geoRows?.length) {
    const latestRunId = geoRows[0].run_id;
    const rows = geoRows.filter((r) => r.run_id === latestRunId && !r.error);
    if (rows.length) {
      latestRunShareOfVoice =
        Math.round((rows.filter((r) => r.mentioned).length / rows.length) * 1000) / 10;
    }
  }

  let monthlyCost: number | null = null;
  if (usageRows?.length) {
    const rates = await getCostRates();
    let total = 0;
    let any = false;
    for (const row of usageRows) {
      const cost = estimateCost(rates.get(`${row.provider}:${row.model}`), row.prompt_tokens, row.completion_tokens);
      if (cost !== null) {
        total += cost;
        any = true;
      }
    }
    monthlyCost = any ? total : null;
  }

  return {
    articleCount: articleCount ?? 0,
    draftCount: draftCount ?? 0,
    publishedCount: publishedCount ?? 0,
    inReviewCount: inReviewCount ?? 0,
    deptCount: deptCount ?? 0,
    campusCount: campusCount ?? 0,
    avgQuality,
    latestRunShareOfVoice,
    duePlannedCount: duePlannedCount ?? 0,
    monthlyCost
  };
}

export default async function DashboardPage() {
  let stats;
  let dbError: string | null = null;
  try {
    stats = await getStats();
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Veritabanına bağlanılamadı.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Panel</h1>
        <p className="mt-1 text-sm text-gray-500">
          Topkapı Okulları için AI destekli SEO/GEO makale üretim sistemine hoş geldiniz.
        </p>
      </div>

      {dbError && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Veritabanı bağlantısı kurulamadı: {dbError}. <code>SUPABASE_URL</code> ve{" "}
          <code>SUPABASE_SERVICE_ROLE_KEY</code> ortam değişkenlerini ve migration'ın
          uygulandığını kontrol edin.
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Toplam Makale" value={stats.articleCount} />
            <StatCard label="Taslak" value={stats.draftCount} />
            <StatCard label="İncelemede" value={stats.inReviewCount} />
            <StatCard label="Yayınlanan" value={stats.publishedCount} />
            <StatCard label="Bölüm/Kampüs" value={`${stats.deptCount}/${stats.campusCount}`} />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-600">GEO / Kalite Durumu</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Link href="/geo-visibility">
                <StatCard
                  label="Görünürlük Payı (son ölçüm)"
                  value={stats.latestRunShareOfVoice != null ? `%${stats.latestRunShareOfVoice}` : "—"}
                  highlight
                />
              </Link>
              <Link href="/articles">
                <StatCard
                  label="Ortalama Kalite Skoru"
                  value={stats.avgQuality != null ? `${stats.avgQuality}/100` : "—"}
                  highlight
                />
              </Link>
              <Link href="/calendar">
                <StatCard
                  label="Takvimde Vadesi Gelen"
                  value={stats.duePlannedCount}
                  highlight={stats.duePlannedCount > 0}
                />
              </Link>
              <Link href="/costs">
                <StatCard
                  label="Bu Ay Tahmini Maliyet"
                  value={stats.monthlyCost != null ? `$${stats.monthlyCost.toFixed(2)}` : "—"}
                  highlight
                />
              </Link>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <ActionCard
          href="/kb"
          title="1. Bilgi Bankasını Doldurun"
          description="Okul kimliği, kampüsler ve bölümler/alanlar hakkında onaylı bilgileri girin. Tüm makaleler bu verilere dayanır."
        />
        <ActionCard
          href="/articles/new"
          title="2. Yeni Makale Oluşturun"
          description="4 uzman ajan (SEO stratejisti, içerik uzmanı, editör, GEO uzmanı) sırayla çalışarak makaleyi üretir."
        />
        <ActionCard
          href="/geo-visibility"
          title="3. Ölçün ve Teşhis Edin"
          description="Yapay zekâ motorlarının sizi önerip önermediğini ölçün, nedenini teşhis edin, eksik konuları takvime ekleyin."
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`card p-4 transition-shadow hover:shadow-md ${highlight ? "border-brand-200" : ""}`}>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function ActionCard({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="card block p-5 transition-shadow hover:shadow-md">
      <h3 className="mb-2 text-sm font-semibold text-brand-700">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
