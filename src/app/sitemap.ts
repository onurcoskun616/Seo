import { MetadataRoute } from "next";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

/**
 * Next.js'in yerleşik sitemap kuralı: bu dosya otomatik olarak /sitemap.xml
 * uç noktasını üretir. www.topkapiokullari.com makaleleri kendi sunmuyor;
 * SITE_URL altında yayınlandığı varsayılarak URL üretilir.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.SITE_URL || "https://www.topkapiokullari.com").replace(/\/$/, "");

  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("articles")
      .select("slug, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    return (data || [])
      .filter((a) => a.slug)
      .map((a) => ({
        url: `${siteUrl}/${a.slug}`,
        lastModified: new Date(a.updated_at)
      }));
  } catch {
    return [];
  }
}
