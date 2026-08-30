export interface SchoolIdentity {
  id: string;
  name: string;
  school_type: string | null;
  short_description: string | null;
  mission: string | null;
  history: string | null;
  accreditation: string | null;
  website_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  social_links: Record<string, string>;
}

export interface Campus {
  id: string;
  name: string;
  district: string | null;
  address: string | null;
  facilities: string[];
  contact_phone: string | null;
  description: string | null;
}

export interface Department {
  id: string;
  name: string;
  slug: string | null;
  campus_ids: string[];
  description: string | null;
  curriculum_highlights: string[];
  career_paths: string[];
  university_paths: string[];
  sample_employers: string[];
  success_stories: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  category: "sportif" | "proje" | "akademik" | "yarisma" | "diger";
  description: string | null;
  achievement_date: string | null;
  department_id: string | null;
  campus_id: string | null;
  source_url: string | null;
}

export const ACHIEVEMENT_CATEGORY_LABELS: Record<Achievement["category"], string> = {
  sportif: "Sportif Başarı",
  proje: "Proje",
  akademik: "Akademik Başarı",
  yarisma: "Yarışma",
  diger: "Diğer"
};

export type ArticleType =
  | "school_identity"
  | "department_overview"
  | "campus_overview"
  | "parent_guide"
  | "vocational_school_explainer"
  | "comparison"
  | "lgs_guide"
  | "student_achievements"
  | "education_approach";

export type Audience = "ogrenci_9_10" | "veli" | "genel";

export interface Article {
  id: string;
  article_type: ArticleType;
  target_department_id: string | null;
  target_campus_id: string | null;
  audience: Audience;
  title: string | null;
  slug: string | null;
  meta_description: string | null;
  content_markdown: string | null;
  content_html: string | null;
  faq_json: { question: string; answer: string }[] | null;
  json_ld: Record<string, unknown> | null;
  ai_answer_snippet: string | null;
  status: "draft" | "approved" | "published";
  agent_trace: Record<string, unknown> | null;
  extra_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishConfig {
  id: string;
  name: string;
  endpoint_url: string;
  http_method: string;
  auth_header_name: string | null;
  auth_header_value: string | null;
  field_mapping: Record<string, string>;
}

export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  school_identity: "Okul Kimliği / Genel Tanıtım",
  department_overview: "Bölüm / Alan Tanıtımı",
  campus_overview: "Kampüs Tanıtımı",
  parent_guide: "Veli Rehberi (Okul Seçimi)",
  vocational_school_explainer: "Meslek Lisesi Nedir? (Genel Bilgilendirme)",
  comparison: "Karşılaştırma / Okul Seçim Kriterleri",
  lgs_guide: "LGS Süreci ve Okul Seçimi Rehberi",
  student_achievements: "Öğrenci Başarıları / Projeler / Sportif Başarılar",
  education_approach:
    "Eğitim Yaklaşımı / Yenilikçi Model (OSB Entegrasyonu, Sanayi İşbirliği, Kariyer Odaklı Eğitim vb.)"
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  ogrenci_9_10: "9. / 10. Sınıf Öğrencisi",
  veli: "Veli",
  genel: "Genel Ziyaretçi"
};
