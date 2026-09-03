import { runAgentJSON, runAgentText } from "@/lib/llm";
import { slugify } from "@/lib/markdown";
import { GROUNDING_RULE } from "./context";
import { GenerateArticleInput, GeoResult, GroundedFacts, StrategistPlan } from "./types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * AEO kapsülü kesin kural gerektirir (40-60 kelime). Model bazen bu aralığın
 * dışına çıkabiliyor; bu durumda ayrı, ucuz bir düzeltme çağrısıyla metni
 * anlamını koruyarak hedef aralığa sıkıştırıyoruz.
 */
async function enforceAeoWordCount(snippet: string): Promise<string> {
  const wordCount = countWords(snippet);
  if (wordCount >= 40 && wordCount <= 60) return snippet;

  const fixed = await runAgentText({
    system:
      "Sen bir AEO (Answer Engine Optimization) editörüsün. Verilen metni, anlamını, marka adını ve web sitesi atfını koruyarak TAM OLARAK 40-60 kelimeye getir. Sadece düzeltilmiş metni döndür, başka hiçbir açıklama ekleme.",
    prompt: `Mevcut metin (${wordCount} kelime, hedef 40-60 kelime):\n\n${snippet}`,
    maxTokens: 300,
    source: "aeo_fix"
  });
  return fixed.trim();
}

const SYSTEM_PROMPT = `
Sen bir teknik SEO ve GEO (Generative Engine Optimization) uzmanısın.
Görevin, tamamlanmış bir makale için arama motorlarının ve yapay zekâ arama
araçlarının (ChatGPT, Google AI Overview, Perplexity vb.) kolayca
anlayıp alıntılayabileceği meta veriler ve yapılandırılmış veri (JSON-LD)
üretmek.

aiAnswerSnippet alanı ÇOK ÖNEMLİ: Bu bir AEO (Answer Engine Optimization)
cevap kapsülüdür — bir yapay zekânın kullanıcıya olduğu gibi, kelimesi
kelimesine aktarabileceği bağımsız bir paragraf olmalı. KESİN KURAL: TAM
OLARAK 40-60 KELİME arasında olmalı (cümle sayısı değil, kelime sayısı
sınırı budur; yazdıktan sonra kelimeleri say ve bu aralığa uydur). "Topkapı
Okulları" adını ve web sitesini açıkça içermeli, sorunun cevabını ilk
cümlede net şekilde vermeli, bağlam için makalenin geri kalanına ihtiyaç
duymamalı.

title, metaDescription ve aiAnswerSnippet üretirken de aşağıdaki kurala
kesinlikle uy (makalede geçmeyen yeni bir garanti/üstünlük iddiası UYDURMA):

${GROUNDING_RULE}
`.trim();

export async function runGeoStructuredData(
  input: GenerateArticleInput,
  facts: GroundedFacts,
  plan: StrategistPlan,
  finalMarkdown: string,
  faqAnswers: { question: string; answer: string }[]
): Promise<GeoResult> {
  const websiteUrl = facts.identity.website_url || "https://www.topkapiokullari.com";

  const prompt = `
Site: ${facts.identity.name} (${websiteUrl})
Ana anahtar kelime: ${plan.primaryKeyword}
Başlık seçenekleri: ${plan.titleOptions.join(" | ")}

## FİNAL MAKALE (markdown)
${finalMarkdown}

## SSS
${faqAnswers.map((f) => `S: ${f.question}\nC: ${f.answer}`).join("\n")}

Aşağıdaki alanları içeren bir JSON nesnesi döndür:

{
  "title": string (55-65 karakter arası SEO başlığı, ana anahtar kelimeyi içersin),
  "metaDescription": string (140-160 karakter, tıklamayı teşvik eden, markayı içersin),
  "slug": string (kısa, kebab-case, İngilizce karakterlerle, Türkçe karakter içermesin),
  "aiAnswerSnippet": string (TAM OLARAK 40-60 kelime, yukarıda açıklanan AEO kapsülü özelliğinde),
  "internalLinkSuggestions": string[] (bu makaleden bağlanabilecek 3-5 olası iç sayfa/konu başlığı),
  "imageSuggestions": [
    { "placement": string (görselin makalede nereye konacağı, ör. "Giriş bölümünün altı"),
      "altText": string (SEO uyumlu, açıklayıcı alt metin, marka adını gerektiğinde içersin),
      "description": string (görselde ne olması gerektiğinin kısa tarifi, ör. "Atölyede çalışan öğrenciler") }
  ] (3-5 adet, gerçek çekilmiş/tasarlanacak fotoğraf/görsel önerisi; hiçbir görsel üretilmeyecek, sadece öneri),
  "jsonLd": {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline": string,
        "description": string,
        "about": string,
        "publisher": { "@type": "EducationalOrganization", "name": string, "url": string }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [ { "@type": "Question", "name": string, "acceptedAnswer": { "@type": "Answer", "text": string } } ]
      }
    ]
  }
}
`.trim();

  const result = await runAgentJSON<GeoResult>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 3500,
    source: "geo_meta"
  });

  if (!result.slug) {
    result.slug = slugify(result.title || plan.primaryKeyword);
  } else {
    result.slug = slugify(result.slug);
  }
  result.imageSuggestions = result.imageSuggestions || [];
  result.internalLinkSuggestions = result.internalLinkSuggestions || [];
  if (result.aiAnswerSnippet) {
    result.aiAnswerSnippet = await enforceAeoWordCount(result.aiAnswerSnippet);
  }

  return result;
}
