import { Achievement, ArticleType, Audience, Campus, Department, SchoolIdentity } from "@/lib/types";

export interface GroundedFacts {
  identity: SchoolIdentity;
  targetDepartment: Department | null;
  targetCampus: Campus | null;
  allDepartments: Department[];
  allCampuses: Campus[];
  achievements: Achievement[];
}

export interface GenerateArticleInput {
  articleType: ArticleType;
  audience: Audience;
  departmentId?: string | null;
  campusId?: string | null;
  extraInstructions?: string;
}

export interface StrategistPlan {
  primaryKeyword: string;
  secondaryKeywords: string[];
  titleOptions: string[];
  searchIntent: string;
  outline: { heading: string; bullets: string[] }[];
  faqQuestions: string[];
  keyFactsToHighlight: string[];
}

export interface EditorResult {
  contentMarkdown: string;
  faqAnswers: { question: string; answer: string }[];
  flaggedIssues: string[];
}

export interface ImageSuggestion {
  placement: string;
  altText: string;
  description: string;
}

export interface GeoResult {
  title: string;
  metaDescription: string;
  slug: string;
  jsonLd: Record<string, unknown>;
  aiAnswerSnippet: string;
  internalLinkSuggestions: string[];
  imageSuggestions: ImageSuggestion[];
}

export interface AgentTrace {
  strategistPlan: StrategistPlan;
  contentDraft: string;
  editorResult: EditorResult;
  geoResult: GeoResult;
}
