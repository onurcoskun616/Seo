import { getSupabaseServer } from "@/lib/supabaseServer";

export interface CostRate {
  provider: string;
  model: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

/** Bir API çağrısının token kullanımını kaydeder. Asla ana akışı bozmaz. */
export async function logApiUsage(params: {
  source: string;
  provider: "openai" | "gemini";
  model: string;
  promptTokens: number;
  completionTokens: number;
  articleId?: string | null;
}): Promise<void> {
  try {
    const supabase = getSupabaseServer();
    await supabase.from("api_usage_logs").insert({
      source: params.source,
      provider: params.provider,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.promptTokens + params.completionTokens,
      article_id: params.articleId || null
    });
  } catch (err) {
    console.error("API kullanım kaydı başarısız:", err);
  }
}

export async function getCostRates(): Promise<Map<string, CostRate>> {
  const supabase = getSupabaseServer();
  const { data } = await supabase.from("cost_rates").select("*");
  const map = new Map<string, CostRate>();
  for (const r of (data as CostRate[]) || []) {
    map.set(`${r.provider}:${r.model}`, r);
  }
  return map;
}

export function estimateCost(
  rate: CostRate | undefined,
  promptTokens: number,
  completionTokens: number
): number | null {
  if (!rate) return null;
  return (
    (promptTokens / 1_000_000) * rate.input_price_per_million +
    (completionTokens / 1_000_000) * rate.output_price_per_million
  );
}
