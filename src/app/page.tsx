import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

async function getStats() {
  const supabase = getSupabaseServer();
  const [{ count: articleCount }, { count: draftCount }, { count: publishedCount }, { count: deptCount }, { count: campusCount }] =
    await Promise.all([
      supabase.from("articles").select("*", { count: "exact", head: true }),
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("articles").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("departments").select("*", { count: "exact", head: true }),
      supabase.from("campuses").select("*", { count: "exact", head: true })
    ]);

  return {
    articleCount: articleCount ?? 0,
    draftCount: draftCount ?? 0,
    publishedCount: publishedCount ?? 0,
    deptCount: deptCount ?? 0,
    campusCount: campusCount ?? 0
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Toplam Makale" value={stats.articleCount} />
          <StatCard label="Taslak" value={stats.draftCount} />
          <StatCard label="Yayınlanan" value={stats.publishedCount} />
          <StatCard label="Bölüm/Alan" value={stats.deptCount} />
          <StatCard label="Kampüs" value={stats.campusCount} />
        </div>
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
          href="/articles"
          title="3. İnceleyin ve Yayınlayın"
          description="Makaleyi düzenleyin, SEO/JSON-LD önizlemesini kontrol edin, dışa aktarın veya doğrudan yayınlayın."
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
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
