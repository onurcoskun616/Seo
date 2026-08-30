import { runAgentText } from "@/lib/llm";
import { AUDIENCE_LABELS } from "@/lib/types";
import { buildGroundingText, describeRequest, GROUNDING_RULE } from "./context";
import { GenerateArticleInput, GroundedFacts, StrategistPlan } from "./types";

const SYSTEM_PROMPT = `
Sen mesleki ve teknik eğitim konusunda uzman bir içerik yazarısın. Topkapı
Okulları için, verilen SEO stratejisini ve onaylı okul verisini kullanarak
akıcı, güven veren ve bilgilendirici bir Türkçe makale taslağı yazıyorsun.

Yazım kuralları:
- Hedef kitleye uygun, sıcak ama bilgilendirici bir ton kullan (veliye
  hitap ediyorsan güven verici ve pratik; öğrenciye hitap ediyorsan motive
  edici ve net ol).
- Markdown formatı kullan: "# " ana başlık, "## " bölüm başlıkları.
- Somut/spesifik iddiaları SADECE onaylı veriden al. ${GROUNDING_RULE}
- Metnin içinde "Topkapı Okulları" marka adı en az 3 kez, doğal bir şekilde
  geçmeli.
- Kısa paragraflar, madde işaretli listeler ve tarayıcı dostu alt başlıklar
  kullan.
- Girişte, makalenin cevapladığı ana soruyu ilk 2-3 cümlede net şekilde
  yanıtla (yapay zekâ arama motorları bunu alıntılar).
`.trim();

export async function runContentExpert(
  input: GenerateArticleInput,
  facts: GroundedFacts,
  plan: StrategistPlan
): Promise<string> {
  const prompt = `
${describeRequest(input)}
Hedef kitle etiketi: ${AUDIENCE_LABELS[input.audience]}

${buildGroundingText(facts)}

## İÇERİK STRATEJİSİ
Ana anahtar kelime: ${plan.primaryKeyword}
Arama niyeti: ${plan.searchIntent}
Öne çıkarılacak temel gerçekler: ${plan.keyFactsToHighlight.join(" | ")}

İskelet:
${plan.outline.map((o) => `## ${o.heading}\n${o.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")}

Bu iskeleti temel alarak, 900-1400 kelimelik tam bir makale taslağı yaz.
Başlıkta ve alt başlıklarda ana anahtar kelimeyi doğal şekilde kullan.
Sadece makale metnini (markdown) döndür, başka açıklama ekleme.
`.trim();

  return runAgentText({ system: SYSTEM_PROMPT, prompt, maxTokens: 4000 });
}
