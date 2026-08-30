import { getSupabaseServer } from "@/lib/supabaseServer";
import { Article, ArticleType } from "@/lib/types";
import { runArticlePipeline } from "./pipeline";
import { GenerateArticleInput } from "./types";

/**
 * "Öğrenci Başarıları" gibi tamamen veri bankasına bağlı türler için, veri
 * yoksa üretimi engeller (uydurma içerik riskini API katmanında keser).
 * Sorun varsa kullanıcıya gösterilecek hata metnini döndürür, yoksa null.
 */
export async function checkGenerationBlocked(articleType: ArticleType): Promise<string | null> {
  if (articleType !== "student_achievements") return null;
  const supabase = getSupabaseServer();
  const { count, error } = await supabase
    .from("achievements")
    .select("*", { count: "exact", head: true });
  if (error) throw error;
  if (!count) {
    return "Bilgi bankasında henüz öğrenci başarısı/projesi kaydı yok. Bu makale türünü uydurma bilgiyle doldurmamak için önce Bilgi Bankası > Başarılar sekmesinden en az bir kayıt ekleyin.";
  }
  return null;
}

/**
 * Ajan hattını çalıştırır, üretilen makaleyi articles tablosuna kaydeder ve
 * kaydedilen satırı döndürür. Tekli üretim (generate/route.ts) ve toplu
 * üretim (generate-batch) tarafından paylaşılır.
 */
export async function createArticleRecord(input: GenerateArticleInput): Promise<Article> {
  const result = await runArticlePipeline(input);
  const supabase = getSupabaseServer();

  let slug = result.slug;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: clash } = await supabase.from("articles").select("id").eq("slug", slug).limit(1);
    if (!clash || clash.length === 0) break;
    slug = `${result.slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { data, error } = await supabase
    .from("articles")
    .insert({
      article_type: input.articleType,
      target_department_id: input.departmentId,
      target_campus_id: input.campusId,
      audience: input.audience,
      title: result.title,
      slug,
      meta_description: result.metaDescription,
      content_markdown: result.contentMarkdown,
      content_html: result.contentHtml,
      faq_json: result.faqJson,
      json_ld: result.jsonLd,
      ai_answer_snippet: result.aiAnswerSnippet,
      image_suggestions: result.imageSuggestions,
      status: "draft",
      agent_trace: result.agentTrace,
      extra_instructions: input.extraInstructions ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return data as Article;
}
