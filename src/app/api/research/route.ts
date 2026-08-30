import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiUtil";
import { runAgentJSON } from "@/lib/llm";

export const dynamic = "force-dynamic";

interface ResearchResult {
  likelyQuestions: string[];
  longTailKeywords: string[];
  contentAngleIdeas: string[];
}

const SYSTEM_PROMPT = `
Sen bir eğitim sektörü SEO/GEO araştırmacısısın. Görevin, verilen bir konu
için 9./10. sınıf öğrencilerinin ve velilerinin Google'da ve yapay zekâ
sohbet araçlarında (ChatGPT, Gemini vb.) muhtemelen soracağı soruları ve
arama ifadelerini TAHMİN ETMEK. Bu tahminlerin gerçek/canlı arama hacmi
verisine dayanmadığını, senin genel bilgine dayanan MAKUL TAHMİNLER
olduğunu unutma — kesin istatistik gibi sunma.
`.trim();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = (body.topic || "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Konu gerekli." }, { status: 400 });
    }

    const prompt = `
Konu: ${topic}
${body.context ? `Ek bağlam: ${body.context}` : ""}

Bu konuyla ilgili aşağıdaki alanları içeren bir JSON nesnesi döndür:
{
  "likelyQuestions": string[] (8-12 adet, kullanıcıların doğal dilde soracağı olası sorular),
  "longTailKeywords": string[] (8-12 adet, uzun kuyruk arama ifadesi),
  "contentAngleIdeas": string[] (4-6 adet, bu sorulara cevap verecek makale/başlık fikri)
}
`.trim();

    const result = await runAgentJSON<ResearchResult>({ system: SYSTEM_PROMPT, prompt, maxTokens: 2000 });
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse(err);
  }
}
