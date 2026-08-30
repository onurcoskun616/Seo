import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { Article, GenerationJob } from "@/lib/types";

interface NotificationSettings {
  slack_webhook_url: string | null;
  notify_on_review: boolean;
  notify_on_publish_failure: boolean;
  notify_on_batch_complete: boolean;
}

async function getSettings(): Promise<NotificationSettings | null> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from("notification_settings").select("*").limit(1).maybeSingle();
  return data as NotificationSettings | null;
}

/** Slack Incoming Webhook'a mesaj gönderir. Hata olursa sadece loglar, asla ana akışı bozmaz. */
export async function sendSlackMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const settings = await getSettings();
  if (!settings?.slack_webhook_url) return { ok: false, error: "Slack webhook URL tanımlı değil." };
  try {
    const res = await fetch(settings.slack_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!res.ok) return { ok: false, error: `Slack ${res.status} döndürdü.` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Bilinmeyen ağ hatası" };
  }
}

function panelUrl(req: NextRequest | null, path: string): string {
  const base = req?.nextUrl?.origin || process.env.APP_BASE_URL || "";
  return `${base}${path}`;
}

export async function notifyReviewRequested(req: NextRequest, article: Article): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings && !settings.notify_on_review) return;
    await sendSlackMessage(
      `📝 *İncelemeye gönderildi:* ${article.title || "(başlıksız)"}\n${panelUrl(req, `/articles/${article.id}`)}`
    );
  } catch (err) {
    console.error("Bildirim gönderilemedi (review):", err);
  }
}

export async function notifyPublishFailure(
  req: NextRequest,
  articleTitle: string,
  articleId: string,
  errorDetail: string
): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings && !settings.notify_on_publish_failure) return;
    await sendSlackMessage(
      `🚨 *Yayınlama başarısız:* ${articleTitle}\nHata: ${errorDetail}\n${panelUrl(req, `/articles/${articleId}`)}`
    );
  } catch (err) {
    console.error("Bildirim gönderilemedi (publish failure):", err);
  }
}

export async function notifyBatchComplete(job: GenerationJob): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings && !settings.notify_on_batch_complete) return;
    const successCount = job.created_article_ids.length;
    const failCount = job.failed_targets.length;
    await sendSlackMessage(
      `✅ *Toplu üretim tamamlandı:* ${successCount} makale oluşturuldu${
        failCount ? `, ${failCount} hedef başarısız oldu` : ""
      }.\n${panelUrl(null, "/articles")}`
    );
  } catch (err) {
    console.error("Bildirim gönderilemedi (batch complete):", err);
  }
}
