import { getSupabaseServer } from "@/lib/supabaseServer";
import { markdownToHtml } from "@/lib/markdown";
import { Achievement, Campus, Department, ImageSuggestion, SchoolIdentity } from "@/lib/types";
import { runSeoStrategist } from "./seoStrategist";
import { runContentExpert } from "./contentExpert";
import { runEditorFactCheck } from "./editorFactCheck";
import { runGeoStructuredData } from "./geoStructuredData";
import { AgentTrace, GenerateArticleInput, GroundedFacts } from "./types";

export interface PipelineResult {
  title: string;
  slug: string;
  metaDescription: string;
  contentMarkdown: string;
  contentHtml: string;
  faqJson: { question: string; answer: string }[];
  jsonLd: Record<string, unknown>;
  aiAnswerSnippet: string;
  imageSuggestions: ImageSuggestion[];
  agentTrace: AgentTrace;
}

/**
 * İç link (GEO/SEO) otomasyonu: yayınlanmış makaleler arasından aynı
 * bölüm/kampüsü konu alanları, yoksa aynı türdeki diğer makaleleri bulup
 * makalenin sonuna gerçek bağlantılarla bir "İlgili Yazılar" bölümü ekler.
 * Rakip/harici site değil, kendi yayınlanmış içeriğimize link verir.
 */
async function buildRelatedArticlesSection(
  input: GenerateArticleInput,
  siteUrl: string
): Promise<string> {
  const supabase = getSupabaseServer();
  const { data } = await supabase
    .from("articles")
    .select("title, slug, target_department_id, target_campus_id, article_type")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);

  const all = data || [];
  if (!all.length) return "";

  let matches = all.filter(
    (a) =>
      (input.departmentId && a.target_department_id === input.departmentId) ||
      (input.campusId && a.target_campus_id === input.campusId)
  );
  if (matches.length < 3) {
    const sameType = all.filter(
      (a) => a.article_type === input.articleType && !matches.includes(a)
    );
    matches = [...matches, ...sameType].slice(0, 3);
  } else {
    matches = matches.slice(0, 3);
  }

  if (!matches.length) return "";

  const links = matches
    .map((a) => `- [${a.title}](${siteUrl.replace(/\/$/, "")}/${a.slug})`)
    .join("\n");
  return `\n\n## İlgili Yazılar\n\n${links}`;
}

async function loadGroundedFacts(input: GenerateArticleInput): Promise<GroundedFacts> {
  const supabase = getSupabaseServer();

  const [
    { data: identityRows, error: identityErr },
    { data: departments, error: deptErr },
    { data: campuses, error: campErr },
    { data: achievements, error: achErr }
  ] = await Promise.all([
    supabase.from("school_identity").select("*").limit(1),
    supabase.from("departments").select("*").order("name"),
    supabase.from("campuses").select("*").order("name"),
    supabase
      .from("achievements")
      .select("*")
      .order("achievement_date", { ascending: false })
      .limit(40)
  ]);

  if (identityErr) throw identityErr;
  if (deptErr) throw deptErr;
  if (campErr) throw campErr;
  if (achErr) throw achErr;

  const identity = (identityRows?.[0] as SchoolIdentity) || {
    id: "",
    name: "Topkapı Okulları",
    school_type: "Mesleki ve Teknik Anadolu Lisesi",
    short_description: null,
    mission: null,
    history: null,
    accreditation: null,
    website_url: "https://www.topkapiokullari.com",
    contact_phone: null,
    contact_email: null,
    social_links: {}
  };

  const allDepartments = (departments as Department[]) || [];
  const allCampuses = (campuses as Campus[]) || [];
  const allAchievements = (achievements as Achievement[]) || [];

  return {
    identity,
    targetDepartment: input.departmentId
      ? allDepartments.find((d) => d.id === input.departmentId) || null
      : null,
    targetCampus: input.campusId ? allCampuses.find((c) => c.id === input.campusId) || null : null,
    allDepartments,
    allCampuses,
    achievements: allAchievements
  };
}

export async function runArticlePipeline(input: GenerateArticleInput): Promise<PipelineResult> {
  const facts = await loadGroundedFacts(input);

  const strategistPlan = await runSeoStrategist(input, facts);
  const contentDraft = await runContentExpert(input, facts, strategistPlan);
  const editorResult = await runEditorFactCheck(facts, strategistPlan, contentDraft);

  const siteUrl = facts.identity.website_url || "https://www.topkapiokullari.com";
  const relatedSection = await buildRelatedArticlesSection(input, siteUrl);
  const finalMarkdown = editorResult.contentMarkdown + relatedSection;

  const geoResult = await runGeoStructuredData(
    input,
    facts,
    strategistPlan,
    finalMarkdown,
    editorResult.faqAnswers
  );

  return {
    title: geoResult.title || strategistPlan.titleOptions[0] || strategistPlan.primaryKeyword,
    slug: geoResult.slug,
    metaDescription: geoResult.metaDescription,
    contentMarkdown: finalMarkdown,
    contentHtml: markdownToHtml(finalMarkdown),
    faqJson: editorResult.faqAnswers,
    jsonLd: geoResult.jsonLd,
    aiAnswerSnippet: geoResult.aiAnswerSnippet,
    imageSuggestions: geoResult.imageSuggestions,
    agentTrace: { strategistPlan, contentDraft, editorResult, geoResult }
  };
}
