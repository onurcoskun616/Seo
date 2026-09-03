import { runAgentText } from "@/lib/llm";
import { buildGroundingText, GROUNDING_RULE } from "./context";
import { parseBulletList, parseQAList, parseSections } from "./sections";
import { EditorResult, GroundedFacts, StrategistPlan } from "./types";

const SYSTEM_PROMPT = `
Sen bir editör ve doğrulama (fact-check) uzmanısın. Görevin, sana verilen
makale taslağını onaylı okul verisiyle karşılaştırıp düzeltmek.

Yapman gerekenler:
1. Taslakta, onaylı veride karşılığı olmayan somut bir iddia (rakam, isim,
   tarih, "en iyi", "en büyük" gibi kesin üstünlük iddiaları) varsa bunu
   ya kaldır ya da genel/doğru bir ifadeyle yumuşat. ${GROUNDING_RULE}
2. Metni akıcılaştır, tekrarları azalt, kısa paragraflar ve tarayıcı dostu
   alt başlıklar kullan.
3. Metnin içinde "Topkapı Okulları" adı ve web sitesine doğal bir markdown
   bağlantısı ([Topkapı Okulları](WEBSITE_URL) gibi) en az 2 kez, zorlama
   hissettirmeden geçsin.
4. Verilen SSS sorularını, onaylı veriye dayanarak kısa ve net cevaplarla
   yanıtla. Onaylı veri yetersizse cevabı genel ama dürüst tut.
5. Sonunda, kaldırdığın veya şüpheli bulduğun iddiaları bir uyarı listesi
   olarak bildir (editöre/insana gösterilecek, makalede YER ALMAYACAK).

Yanıtını TAM OLARAK şu üç bölüm başlığıyla, aşağıdaki formatta ver (başka
hiçbir şey ekleme):

## MAKALE
(tam, düzeltilmiş markdown makale metni)

## SSS
S: (soru 1)
C: (cevap 1)
S: (soru 2)
C: (cevap 2)
...

## UYARILAR
- (varsa kaldırılan/şüpheli iddia 1)
- (varsa kaldırılan/şüpheli iddia 2)
(hiç sorun yoksa "- Yok" yaz)
`.trim();

export async function runEditorFactCheck(
  facts: GroundedFacts,
  plan: StrategistPlan,
  draftMarkdown: string
): Promise<EditorResult> {
  const websiteUrl = facts.identity.website_url || "https://www.topkapiokullari.com";
  const prompt = `
${buildGroundingText(facts)}

## SİTE URL
${websiteUrl}

## YANITLANACAK SSS SORULARI
${plan.faqQuestions.map((q) => `- ${q}`).join("\n")}

## DÜZENLENECEK TASLAK
${draftMarkdown}
`.trim();

  const raw = await runAgentText({ system: SYSTEM_PROMPT, prompt, maxTokens: 4500, source: "editor" });
  const sections = parseSections(raw, ["MAKALE", "SSS", "UYARILAR"]);

  return {
    contentMarkdown: sections["MAKALE"] || draftMarkdown,
    faqAnswers: parseQAList(sections["SSS"]),
    flaggedIssues: parseBulletList(sections["UYARILAR"]).filter(
      (i) => i.toLowerCase() !== "yok"
    )
  };
}
