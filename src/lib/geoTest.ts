import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { logApiUsage } from "@/lib/usage";

export type GeoProvider = "openai" | "gemini";

export interface GeoCheckResult {
  provider: GeoProvider;
  responseText: string;
  mentioned: boolean;
  mentionedWithLink: boolean;
  error?: string;
}

export function isOpenAiGeoConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isGeminiGeoConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function detectMention(text: string): { mentioned: boolean; mentionedWithLink: boolean } {
  const siteUrl = (process.env.SITE_URL || "https://www.topkapiokullari.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const brandName = (process.env.SITE_NAME || "Topkapı Okulları").toLocaleLowerCase("tr");
  const lower = text.toLocaleLowerCase("tr");

  const mentioned = lower.includes(brandName) || lower.includes(siteUrl.toLowerCase());
  const mentionedWithLink = lower.includes(siteUrl.toLowerCase());

  return { mentioned, mentionedWithLink };
}

export async function runOpenAiGeoCheck(prompt: string): Promise<GeoCheckResult> {
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.1",
      tools: [{ type: "web_search" }],
      input: prompt
    });
    const text = response.output_text || "";
    if (response.usage) {
      void logApiUsage({
        source: "geo_test",
        provider: "openai",
        model: process.env.OPENAI_MODEL || "gpt-5.1",
        promptTokens: response.usage.input_tokens || 0,
        completionTokens: response.usage.output_tokens || 0
      });
    }
    const { mentioned, mentionedWithLink } = detectMention(text);
    return { provider: "openai", responseText: text, mentioned, mentionedWithLink };
  } catch (err) {
    return {
      provider: "openai",
      responseText: "",
      mentioned: false,
      mentionedWithLink: false,
      error: err instanceof Error ? err.message : "Bilinmeyen hata"
    };
  }
}

export async function runGeminiGeoCheck(prompt: string): Promise<GeoCheckResult> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "";
    if (response.usageMetadata) {
      void logApiUsage({
        source: "geo_test",
        provider: "gemini",
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        promptTokens: response.usageMetadata.promptTokenCount || 0,
        completionTokens: response.usageMetadata.candidatesTokenCount || 0
      });
    }
    const { mentioned, mentionedWithLink } = detectMention(text);
    return { provider: "gemini", responseText: text, mentioned, mentionedWithLink };
  } catch (err) {
    return {
      provider: "gemini",
      responseText: "",
      mentioned: false,
      mentionedWithLink: false,
      error: err instanceof Error ? err.message : "Bilinmeyen hata"
    };
  }
}

export async function runGeoCheck(provider: GeoProvider, prompt: string): Promise<GeoCheckResult> {
  return provider === "openai" ? runOpenAiGeoCheck(prompt) : runGeminiGeoCheck(prompt);
}
