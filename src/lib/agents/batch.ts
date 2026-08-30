import { getSupabaseServer } from "@/lib/supabaseServer";
import { ArticleType, Audience, GenerationJob } from "@/lib/types";
import { checkGenerationBlocked, createArticleRecord } from "./createArticle";
import { GenerateArticleInput } from "./types";

export interface StartBatchInput {
  articleType: ArticleType;
  audience: Audience;
  targetType: GenerationJob["target_type"];
  targetIds: string[];
  extraInstructions?: string;
}

export async function startBatchJob(input: StartBatchInput): Promise<GenerationJob> {
  const blockedReason = await checkGenerationBlocked(input.articleType);
  if (blockedReason) throw new Error(blockedReason);

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      article_type: input.articleType,
      audience: input.audience,
      target_type: input.targetType,
      target_ids: input.targetIds,
      total: input.targetIds.length || 1,
      status: "pending"
    })
    .select()
    .single();

  if (error) throw error;
  const job = data as GenerationJob;

  // Arka planda çalıştır; HTTP isteğine bu tamamlanmadan yanıt döneceğiz.
  // Render'da her zaman açık (non-serverless) bir Node süreci olduğu için
  // yanıt döndükten sonra da bu promise çalışmaya devam eder.
  void processBatchJob(job.id, input).catch((err) => {
    console.error("Toplu üretim işi beklenmeyen şekilde durdu:", err);
  });

  return job;
}

async function processBatchJob(jobId: string, input: StartBatchInput): Promise<void> {
  const supabase = getSupabaseServer();
  await supabase.from("generation_jobs").update({ status: "running" }).eq("id", jobId);

  const createdIds: string[] = [];
  const failed: { targetId: string; error: string }[] = [];

  const targets = input.targetIds.length ? input.targetIds : [""]; // "none" hedefi için tek seferlik

  for (const targetId of targets) {
    try {
      const genInput: GenerateArticleInput = {
        articleType: input.articleType,
        audience: input.audience,
        departmentId: input.targetType === "department" ? targetId : null,
        campusId: input.targetType === "campus" ? targetId : null,
        extraInstructions: input.extraInstructions
      };
      const article = await createArticleRecord(genInput);
      createdIds.push(article.id);
    } catch (err) {
      failed.push({ targetId, error: err instanceof Error ? err.message : "Bilinmeyen hata" });
    }

    // Her adımdan sonra ilerlemeyi kaydet ki UI canlı takip edebilsin.
    await supabase
      .from("generation_jobs")
      .update({
        created_article_ids: createdIds,
        failed_targets: failed,
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);
  }

  await supabase
    .from("generation_jobs")
    .update({
      status: failed.length && !createdIds.length ? "error" : "done",
      error: failed.length ? `${failed.length} hedef başarısız oldu.` : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", jobId);
}
