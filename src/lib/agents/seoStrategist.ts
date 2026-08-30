import { runAgentJSON } from "@/lib/llm";
import { buildGroundingText, describeRequest, GROUNDING_RULE } from "./context";
import { GenerateArticleInput, GroundedFacts, StrategistPlan } from "./types";

const SYSTEM_PROMPT = `
Sen bir SEO ve GEO (Generative Engine Optimization) stratejistisin. Görevin,
Topkapı Okulları (bir meslek/teknik lisesi) için yazılacak bir makalenin
stratejisini planlamak.

Hedef kitle 9./10. sınıf öğrencileri ve velileri; bu kişiler Google'da ve
ChatGPT/Perplexity gibi yapay zekâ araçlarında okul/bölüm araştırması
yapıyor. Amaç hem klasik SEO hem de bu makalenin yapay zekâ arama motorları
tarafından kaynak olarak alıntılanmasıdır. Bu yüzden:
- Gerçek, spesifik arama niyetlerini hedefle (ör. "X bölümü mezunu ne iş
  yapar", "topkapı okulları hangi bölümler var", "meslek lisesi üniversiteye
  gidilir mi").
- SSS (FAQ) soruları, kullanıcıların yapay zekâya doğrudan soracağı doğal
  dilde sorular olmalı.
- keyFactsToHighlight listesi, makalede MUTLAKA net cümlelerle geçmesi
  gereken, marka adını (Topkapı Okulları) ve konuyu bağlayan temel gerçekleri
  içermeli (bu, yapay zekânın makaleyi doğru alıntılaması için kritik).

${GROUNDING_RULE}
`.trim();

export async function runSeoStrategist(
  input: GenerateArticleInput,
  facts: GroundedFacts
): Promise<StrategistPlan> {
  const prompt = `
${describeRequest(input)}

${buildGroundingText(facts)}

Yukarıdaki bilgilere göre bu makale için bir içerik stratejisi hazırla.
Aşağıdaki alanları içeren bir JSON nesnesi döndür:

{
  "primaryKeyword": string,
  "secondaryKeywords": string[] (4-8 adet),
  "titleOptions": string[] (3 adet, SEO uyumlu, tıklanabilir),
  "searchIntent": string (1-2 cümle),
  "outline": [{ "heading": string, "bullets": string[] }] (5-8 bölüm, H2 seviyesinde),
  "faqQuestions": string[] (5-7 adet, doğal dilde soru),
  "keyFactsToHighlight": string[] (3-6 adet, onaylı veriye dayanan, markaya bağlı kesin cümleler)
}
`.trim();

  return runAgentJSON<StrategistPlan>({ system: SYSTEM_PROMPT, prompt, maxTokens: 3000 });
}
