import { getSupabaseServer } from "@/lib/supabaseServer";

const AI_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot", "CCBot"];

export interface DiagnosticCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  detail: string;
}

export interface DiagnosticsReport {
  siteUrl: string;
  checkedAt: string;
  checks: DiagnosticCheck[];
}

async function safeFetchText(url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "TopkapiGeoDiagnostics/1.0" } });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * robots.txt içinde, "User-agent: <bot>" bloğunun altında "Disallow: /"
 * (ya da genel bir "Disallow: /" tüm site için) olup olmadığına bakar.
 * Basit bir yaklaşık ayrıştırıcıdır, tam bir robots.txt motoru değildir.
 */
function checkBotAllowed(robotsTxt: string, bot: string): "allowed" | "blocked" | "not_mentioned" {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  let inBlock = false;
  let matched = false;
  for (const line of lines) {
    const uaMatch = line.match(/^user-agent:\s*(.+)$/i);
    if (uaMatch) {
      inBlock = uaMatch[1].trim().toLowerCase() === bot.toLowerCase();
      if (inBlock) matched = true;
      continue;
    }
    if (inBlock) {
      const disallowMatch = line.match(/^disallow:\s*(.*)$/i);
      if (disallowMatch) {
        const path = disallowMatch[1].trim();
        if (path === "/" || path === "") return path === "/" ? "blocked" : "allowed";
      }
    }
  }
  return matched ? "allowed" : "not_mentioned";
}

async function checkRobotsTxt(siteUrl: string): Promise<DiagnosticCheck> {
  const { ok, status, text } = await safeFetchText(`${siteUrl}/robots.txt`);
  if (!ok) {
    return {
      id: "robots_txt",
      label: "robots.txt erişilebilirliği",
      status: "unknown",
      detail: `${siteUrl}/robots.txt alınamadı (HTTP ${status || "ağ hatası"}). Site erişilemiyor olabilir.`
    };
  }

  const blocked = AI_BOTS.filter((bot) => checkBotAllowed(text, bot) === "blocked");
  const notMentioned = AI_BOTS.filter((bot) => checkBotAllowed(text, bot) === "not_mentioned");

  if (blocked.length) {
    return {
      id: "robots_txt",
      label: "AI botlarına robots.txt izni",
      status: "fail",
      detail: `Şu botlar robots.txt'te engelleniyor: ${blocked.join(", ")}. Bu botlar engelliyken yapay zekâ motorları sitenizi okuyup öneremez.`
    };
  }

  return {
    id: "robots_txt",
    label: "AI botlarına robots.txt izni",
    status: "ok",
    detail:
      notMentioned.length === AI_BOTS.length
        ? "robots.txt hiçbir AI botunu özel olarak engellemiyor (varsayılan olarak izinli kabul edilir)."
        : `Kontrol edilen botlar (${AI_BOTS.join(", ")}) engellenmemiş görünüyor.`
  };
}

async function checkLlmsTxt(siteUrl: string): Promise<DiagnosticCheck> {
  const { ok, status } = await safeFetchText(`${siteUrl}/llms.txt`);
  return {
    id: "llms_txt",
    label: "llms.txt sitede yayında mı",
    status: ok ? "ok" : "fail",
    detail: ok
      ? `${siteUrl}/llms.txt erişilebilir durumda.`
      : `${siteUrl}/llms.txt bulunamadı (HTTP ${status || "ağ hatası"}). Panelden ürettiğimiz llms.txt içeriğini (/api/llms-txt) sitenizin köküne eklemeniz gerekiyor.`
  };
}

async function checkPublishedArticlesSchema(siteUrl: string): Promise<DiagnosticCheck> {
  const supabase = getSupabaseServer();
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, title")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(8);

  if (!articles?.length) {
    return {
      id: "published_schema",
      label: "Yayınlanan makalelerde yapılandırılmış veri (JSON-LD)",
      status: "unknown",
      detail: "Henüz 'yayınlandı' durumunda işaretlenmiş makale yok."
    };
  }

  let withSchema = 0;
  let unreachable = 0;
  for (const article of articles) {
    const { ok, text } = await safeFetchText(`${siteUrl}/${article.slug}`, 6000);
    if (!ok) {
      unreachable++;
      continue;
    }
    if (text.includes("application/ld+json")) withSchema++;
  }

  const checkedCount = articles.length;
  if (unreachable === checkedCount) {
    return {
      id: "published_schema",
      label: "Yayınlanan makalelerde yapılandırılmış veri (JSON-LD)",
      status: "unknown",
      detail: `Kontrol edilen ${checkedCount} makale sayfasına da ulaşılamadı — slug'ların gerçek sitedeki adresle eşleştiğinden emin olun.`
    };
  }

  const ratio = withSchema / (checkedCount - unreachable);
  return {
    id: "published_schema",
    label: "Yayınlanan makalelerde yapılandırılmış veri (JSON-LD)",
    status: ratio >= 0.8 ? "ok" : ratio > 0 ? "warn" : "fail",
    detail: `Kontrol edilen ${checkedCount - unreachable} sayfadan ${withSchema} tanesinde JSON-LD şeması bulundu. Panelde her makale için ürettiğimiz JSON-LD'yi (SEO/JSON-LD sekmesi) sayfanın <head>'ine eklediğinizden emin olun.`
  };
}

export async function runDiagnostics(): Promise<DiagnosticsReport> {
  const siteUrl = (process.env.SITE_URL || "https://www.topkapiokullari.com").replace(/\/$/, "");

  const [robots, llms, schema] = await Promise.all([
    checkRobotsTxt(siteUrl),
    checkLlmsTxt(siteUrl),
    checkPublishedArticlesSchema(siteUrl)
  ]);

  return {
    siteUrl,
    checkedAt: new Date().toISOString(),
    checks: [robots, llms, schema]
  };
}
