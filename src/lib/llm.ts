import OpenAI from "openai";
import { logApiUsage } from "@/lib/usage";

let cached: OpenAI | null = null;

function getClient(): OpenAI {
  if (cached) return cached;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY tanımlı değil. Makale üretimi için bu anahtar zorunludur."
    );
  }
  cached = new OpenAI({ apiKey });
  return cached;
}

const MODEL = process.env.OPENAI_MODEL || "gpt-5.1";

/** Bir ajanı çalıştırır ve düz metin (markdown) çıktı döndürür. */
export async function runAgentText(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  source?: string;
}): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: params.maxTokens ?? 4000,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.prompt }
    ]
  });

  if (response.usage) {
    void logApiUsage({
      source: params.source || "diger",
      provider: "openai",
      model: MODEL,
      promptTokens: response.usage.prompt_tokens || 0,
      completionTokens: response.usage.completion_tokens || 0
    });
  }

  return (response.choices[0]?.message?.content || "").trim();
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const arrStart = raw.indexOf("[");
  const firstIdx =
    start === -1 ? arrStart : arrStart === -1 ? start : Math.min(start, arrStart);
  if (firstIdx === -1) return raw.trim();
  return raw.slice(firstIdx).trim();
}

/**
 * Bir ajanı çalıştırır ve yanıtı JSON olarak parse eder.
 * Model talimata uymayıp ekstra metin eklerse bir kez daha dener.
 */
export async function runAgentJSON<T>(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
  source?: string;
}): Promise<T> {
  const jsonInstruction =
    "\n\nÇOK ÖNEMLİ: Yanıtını SADECE geçerli JSON olarak ver. Açıklama, markdown kod bloğu işareti veya başka hiçbir metin ekleme.";

  const raw = await runAgentText({
    system: params.system,
    prompt: params.prompt + jsonInstruction,
    maxTokens: params.maxTokens,
    source: params.source
  });

  try {
    return JSON.parse(extractJsonBlock(raw)) as T;
  } catch {
    const retry = await runAgentText({
      system: params.system,
      prompt:
        `Önceki yanıtın geçerli JSON değildi. Aşağıdaki metni SADECE geçerli JSON'a dönüştür, ` +
        `başka hiçbir şey yazma:\n\n${raw}`,
      maxTokens: params.maxTokens,
      source: params.source ? `${params.source}_retry` : "diger_retry"
    });
    return JSON.parse(extractJsonBlock(retry)) as T;
  }
}
