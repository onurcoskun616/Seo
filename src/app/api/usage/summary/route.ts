import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { errorResponse } from "@/lib/apiUtil";
import { estimateCost, getCostRates } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const days = Number(req.nextUrl.searchParams.get("days") || 30);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const supabase = getSupabaseServer();
    const [{ data: logs, error }, rates] = await Promise.all([
      supabase
        .from("api_usage_logs")
        .select("source, provider, model, prompt_tokens, completion_tokens, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000),
      getCostRates()
    ]);
    if (error) throw error;

    const bySourceMap = new Map<string, { tokens: number; cost: number; hasCost: boolean }>();
    const byModelMap = new Map<
      string,
      { provider: string; model: string; promptTokens: number; completionTokens: number; cost: number; hasCost: boolean }
    >();
    const byDayMap = new Map<string, { tokens: number; cost: number; hasCost: boolean }>();

    let totalTokens = 0;
    let totalCost = 0;
    let anyCost = false;

    for (const log of logs || []) {
      const rate = rates.get(`${log.provider}:${log.model}`);
      const cost = estimateCost(rate, log.prompt_tokens, log.completion_tokens);
      const tokens = log.prompt_tokens + log.completion_tokens;
      totalTokens += tokens;
      if (cost !== null) {
        totalCost += cost;
        anyCost = true;
      }

      const s = bySourceMap.get(log.source) || { tokens: 0, cost: 0, hasCost: false };
      s.tokens += tokens;
      if (cost !== null) {
        s.cost += cost;
        s.hasCost = true;
      }
      bySourceMap.set(log.source, s);

      const modelKey = `${log.provider}:${log.model}`;
      const m = byModelMap.get(modelKey) || {
        provider: log.provider,
        model: log.model,
        promptTokens: 0,
        completionTokens: 0,
        cost: 0,
        hasCost: false
      };
      m.promptTokens += log.prompt_tokens;
      m.completionTokens += log.completion_tokens;
      if (cost !== null) {
        m.cost += cost;
        m.hasCost = true;
      }
      byModelMap.set(modelKey, m);

      const day = log.created_at.slice(0, 10);
      const d = byDayMap.get(day) || { tokens: 0, cost: 0, hasCost: false };
      d.tokens += tokens;
      if (cost !== null) {
        d.cost += cost;
        d.hasCost = true;
      }
      byDayMap.set(day, d);
    }

    return NextResponse.json({
      days,
      totalTokens,
      totalCost: anyCost ? totalCost : null,
      hasAnyRates: rates.size > 0,
      bySource: Array.from(bySourceMap.entries()).map(([source, v]) => ({
        source,
        tokens: v.tokens,
        cost: v.hasCost ? v.cost : null
      })),
      byModel: Array.from(byModelMap.values()).map((v) => ({
        ...v,
        cost: v.hasCost ? v.cost : null
      })),
      byDay: Array.from(byDayMap.entries())
        .map(([date, v]) => ({ date, tokens: v.tokens, cost: v.hasCost ? v.cost : null }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))
    });
  } catch (err) {
    return errorResponse(err);
  }
}
