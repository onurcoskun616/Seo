import { randomUUID } from "crypto";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { GeoProvider, isGeminiGeoConfigured, isOpenAiGeoConfigured, runGeoCheck } from "@/lib/geoTest";

export interface GeoRunResultRow {
  id: string;
  run_id: string;
  prompt_id: string;
  provider: GeoProvider;
  mentioned: boolean;
  mentioned_with_link: boolean;
  error: string | null;
  checked_at: string;
}

export interface GeoRunSummary {
  runId: string;
  total: number;
  mentionedCount: number;
  shareOfVoicePercent: number;
  results: GeoRunResultRow[];
}

/**
 * Aktif tüm test sorularını, yapılandırılmış tüm sağlayıcılara (OpenAI/
 * Gemini) sırayla sorar, sonuçları geo_visibility_results'a aynı run_id ile
 * kaydeder. Hem manuel "Şimdi Test Et" butonu hem de haftalık Pazartesi
 * Brifingi tarafından kullanılır.
 */
export async function runGeoTestSuite(): Promise<GeoRunSummary> {
  const providers: GeoProvider[] = [];
  if (isOpenAiGeoConfigured()) providers.push("openai");
  if (isGeminiGeoConfigured()) providers.push("gemini");

  if (!providers.length) {
    throw new Error("Hiçbir sağlayıcı yapılandırılmamış (OPENAI_API_KEY / GEMINI_API_KEY).");
  }

  const supabase = getSupabaseServer();
  const { data: prompts, error: promptsErr } = await supabase
    .from("geo_test_prompts")
    .select("*")
    .eq("active", true);
  if (promptsErr) throw promptsErr;
  if (!prompts?.length) {
    throw new Error("Aktif test sorusu yok.");
  }

  const runId = randomUUID();
  const results: GeoRunResultRow[] = [];

  for (const prompt of prompts) {
    for (const provider of providers) {
      const check = await runGeoCheck(provider, prompt.prompt);
      const { data: saved, error: saveErr } = await supabase
        .from("geo_visibility_results")
        .insert({
          run_id: runId,
          prompt_id: prompt.id,
          provider,
          response_text: check.responseText,
          mentioned: check.mentioned,
          mentioned_with_link: check.mentionedWithLink,
          error: check.error || null
        })
        .select()
        .single();
      if (saveErr) throw saveErr;
      results.push(saved as GeoRunResultRow);
    }
  }

  const validResults = results.filter((r) => !r.error);
  const mentionedCount = validResults.filter((r) => r.mentioned).length;
  const shareOfVoicePercent = validResults.length
    ? Math.round((mentionedCount / validResults.length) * 1000) / 10
    : 0;

  return { runId, total: validResults.length, mentionedCount, shareOfVoicePercent, results };
}
