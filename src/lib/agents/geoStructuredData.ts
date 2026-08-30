import { runAgentJSON } from "@/lib/anthropic";
import { slugify } from "@/lib/markdown";
import { GenerateArticleInput, GeoResult, GroundedFacts, StrategistPlan } from "./types";

const SYSTEM_PROMPT = `
Sen bir teknik SEO ve GEO (Generative Engine Optimization) uzmanısın.
Görevin, tamamlanmış bir makale için arama motorlarının ve yapay zekâ arama
araçlarının (ChatGPT, Google AI Overview, Perplexity vb.) kolayca
anlayıp alıntılayabileceği meta veriler ve yapılandırılmış veri (JSON-LD)
üretmek.

aiAnswerSnippet alanı ÇOK ÖNEMLİ: Bir yapay zekânın kullanıcıya doğrudan
okuyup aktarabileceği, 2-3 cümlelik, "Topkapı Okulları" adını ve web
sitesini açıkça içeren, kendi başına anlamlı bir özet cevap olmalı.
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
  "aiAnswerSnippet": string (2-3 cümle, yukarıda açıklanan özellikte),
  "internalLinkSuggestions": string[] (bu makaleden bağlanabilecek 3-5 olası iç sayfa/konu başlığı),
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

  const result = await runAgentJSON<GeoResult>({ system: SYSTEM_PROMPT, prompt, maxTokens: 3500 });

  if (!result.slug) {
    result.slug = slugify(result.title || plan.primaryKeyword);
  } else {
    result.slug = slugify(result.slug);
  }

  return result;
}
