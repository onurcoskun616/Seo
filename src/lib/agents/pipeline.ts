import { getSupabaseServer } from "@/lib/supabaseServer";
import { markdownToHtml } from "@/lib/markdown";
import { Campus, Department, SchoolIdentity } from "@/lib/types";
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
  agentTrace: AgentTrace;
}

async function loadGroundedFacts(input: GenerateArticleInput): Promise<GroundedFacts> {
  const supabase = getSupabaseServer();

  const [{ data: identityRows, error: identityErr }, { data: departments, error: deptErr }, { data: campuses, error: campErr }] =
    await Promise.all([
      supabase.from("school_identity").select("*").limit(1),
      supabase.from("departments").select("*").order("name"),
      supabase.from("campuses").select("*").order("name")
    ]);

  if (identityErr) throw identityErr;
  if (deptErr) throw deptErr;
  if (campErr) throw campErr;

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

  return {
    identity,
    targetDepartment: input.departmentId
      ? allDepartments.find((d) => d.id === input.departmentId) || null
      : null,
    targetCampus: input.campusId ? allCampuses.find((c) => c.id === input.campusId) || null : null,
    allDepartments,
    allCampuses
  };
}

export async function runArticlePipeline(input: GenerateArticleInput): Promise<PipelineResult> {
  const facts = await loadGroundedFacts(input);

  const strategistPlan = await runSeoStrategist(input, facts);
  const contentDraft = await runContentExpert(input, facts, strategistPlan);
  const editorResult = await runEditorFactCheck(facts, strategistPlan, contentDraft);
  const geoResult = await runGeoStructuredData(
    input,
    facts,
    strategistPlan,
    editorResult.contentMarkdown,
    editorResult.faqAnswers
  );

  return {
    title: geoResult.title || strategistPlan.titleOptions[0] || strategistPlan.primaryKeyword,
    slug: geoResult.slug,
    metaDescription: geoResult.metaDescription,
    contentMarkdown: editorResult.contentMarkdown,
    contentHtml: markdownToHtml(editorResult.contentMarkdown),
    faqJson: editorResult.faqAnswers,
    jsonLd: geoResult.jsonLd,
    aiAnswerSnippet: geoResult.aiAnswerSnippet,
    agentTrace: { strategistPlan, contentDraft, editorResult, geoResult }
  };
}
