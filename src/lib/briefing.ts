import { getSupabaseServer } from "@/lib/supabaseServer";
import { runGeoTestSuite } from "@/lib/geoTestRun";
import { runDiagnostics, DiagnosticsReport } from "@/lib/diagnostics";
import { sendSlackMessage } from "@/lib/notify";

export interface BriefingRecord {
  id: string;
  run_id: string | null;
  share_of_voice_percent: number | null;
  previous_share_of_voice_percent: number | null;
  diagnostics_summary: DiagnosticsReport | null;
  message_text: string | null;
  slack_sent: boolean;
  created_at: string;
}

const STATUS_ICON: Record<string, string> = { ok: "✅", warn: "⚠️", fail: "❌", unknown: "❔" };

function buildMessage(params: {
  shareOfVoice: number;
  previousShareOfVoice: number | null;
  diagnostics: DiagnosticsReport;
  publishedThisWeek: number;
  duePlanned: number;
}): string {
  const trend =
    params.previousShareOfVoice === null
      ? ""
      : params.shareOfVoice > params.previousShareOfVoice
        ? ` (▲ geçen ölçümden +${Math.round((params.shareOfVoice - params.previousShareOfVoice) * 10) / 10} puan)`
        : params.shareOfVoice < params.previousShareOfVoice
          ? ` (▼ geçen ölçümden ${Math.round((params.shareOfVoice - params.previousShareOfVoice) * 10) / 10} puan)`
          : " (değişim yok)";

  const diagLines = params.diagnostics.checks
    .map((c) => `${STATUS_ICON[c.status]} ${c.label}: ${c.detail}`)
    .join("\n");

  return `📅 *Pazartesi GEO Brifingi — Topkapı Okulları*

*Görünürlük Payı:* %${params.shareOfVoice}${trend}

*Teşhis:*
${diagLines}

*Bu hafta:* ${params.publishedThisWeek} makale yayınlandı, ${params.duePlanned} planlı makalenin tarihi geldi/geçti.

Detaylar için panele bakın.`;
}

/**
 * Tam GEO döngüsü: yeniden ölçüm (GEO testi) + teşhis + trend + Slack özeti.
 * Hem manuel "Brifing Oluştur" butonu hem de haftalık otomasyon (GitHub
 * Actions -> /api/cron/monday-briefing) tarafından kullanılır.
 */
export async function composeAndSendBriefing(): Promise<BriefingRecord> {
  const supabase = getSupabaseServer();

  const [geoRun, diagnostics] = await Promise.all([runGeoTestSuite(), runDiagnostics()]);

  const { data: previous } = await supabase
    .from("weekly_briefings")
    .select("share_of_voice_percent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: publishedThisWeek } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true })
    .eq("status", "published")
    .gte("updated_at", weekAgo.toISOString());

  const today = new Date().toISOString().slice(0, 10);
  const { count: duePlanned } = await supabase
    .from("editorial_calendar")
    .select("*", { count: "exact", head: true })
    .eq("status", "planned")
    .lte("planned_date", today);

  const messageText = buildMessage({
    shareOfVoice: geoRun.shareOfVoicePercent,
    previousShareOfVoice: previous?.share_of_voice_percent ?? null,
    diagnostics,
    publishedThisWeek: publishedThisWeek ?? 0,
    duePlanned: duePlanned ?? 0
  });

  const slackResult = await sendSlackMessage(messageText);

  const { data: saved, error } = await supabase
    .from("weekly_briefings")
    .insert({
      run_id: geoRun.runId,
      share_of_voice_percent: geoRun.shareOfVoicePercent,
      previous_share_of_voice_percent: previous?.share_of_voice_percent ?? null,
      diagnostics_summary: diagnostics,
      message_text: messageText,
      slack_sent: slackResult.ok
    })
    .select()
    .single();
  if (error) throw error;

  return saved as BriefingRecord;
}
