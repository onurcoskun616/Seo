import { ARTICLE_TYPE_LABELS, AUDIENCE_LABELS } from "@/lib/types";
import { GenerateArticleInput, GroundedFacts } from "./types";

function departmentBlock(d: GroundedFacts["allDepartments"][number]): string {
  return [
    `### ${d.name}`,
    d.description ? `Açıklama: ${d.description}` : null,
    d.curriculum_highlights?.length
      ? `Müfredat öne çıkanları: ${d.curriculum_highlights.join("; ")}`
      : null,
    d.career_paths?.length ? `Mezuniyet sonrası kariyer imkanları: ${d.career_paths.join("; ")}` : null,
    d.university_paths?.length
      ? `Üniversite / bölüm eşleşme imkanları: ${d.university_paths.join("; ")}`
      : null,
    d.sample_employers?.length ? `Örnek işveren/sektör: ${d.sample_employers.join("; ")}` : null,
    d.success_stories ? `Başarı hikayeleri: ${d.success_stories}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

function campusBlock(c: GroundedFacts["allCampuses"][number]): string {
  return [
    `### ${c.name}`,
    c.district ? `Semt/İlçe: ${c.district}` : null,
    c.address ? `Adres: ${c.address}` : null,
    c.facilities?.length ? `Olanaklar: ${c.facilities.join("; ")}` : null,
    c.description ? `Açıklama: ${c.description}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Bilgi bankasındaki ONAYLI verileri, ajanların kullanacağı tek doğru kaynak
 * (grounding) olarak metne çevirir. Ajanlara bu metnin dışına çıkmamaları,
 * burada olmayan hiçbir somut bilgiyi (rakam, isim, tarih) uydurmamaları
 * kesin olarak söylenir.
 */
export function buildGroundingText(facts: GroundedFacts): string {
  const { identity } = facts;
  const parts: string[] = [];

  parts.push("## OKUL KİMLİĞİ (ONAYLI VERİ)");
  parts.push(
    [
      `Ad: ${identity.name}`,
      identity.school_type ? `Tür: ${identity.school_type}` : null,
      identity.short_description ? `Kısa tanım: ${identity.short_description}` : null,
      identity.mission ? `Misyon: ${identity.mission}` : null,
      identity.history ? `Tarihçe: ${identity.history}` : null,
      identity.accreditation ? `Akreditasyon/Onay: ${identity.accreditation}` : null,
      `Web sitesi: ${identity.website_url}`,
      identity.contact_phone ? `Telefon: ${identity.contact_phone}` : null,
      identity.contact_email ? `E-posta: ${identity.contact_email}` : null
    ]
      .filter(Boolean)
      .join("\n")
  );

  if (facts.targetDepartment) {
    parts.push("\n## HEDEF BÖLÜM/ALAN (ONAYLI VERİ)");
    parts.push(departmentBlock(facts.targetDepartment));
  }

  if (facts.targetCampus) {
    parts.push("\n## HEDEF KAMPÜS (ONAYLI VERİ)");
    parts.push(campusBlock(facts.targetCampus));
  }

  if (!facts.targetDepartment && facts.allDepartments.length) {
    parts.push("\n## TÜM BÖLÜMLER/ALANLAR (ONAYLI VERİ, ÖZET)");
    parts.push(facts.allDepartments.map(departmentBlock).join("\n\n"));
  }

  if (!facts.targetCampus && facts.allCampuses.length) {
    parts.push("\n## TÜM KAMPÜSLER (ONAYLI VERİ, ÖZET)");
    parts.push(facts.allCampuses.map(campusBlock).join("\n\n"));
  }

  return parts.join("\n");
}

export function describeRequest(input: GenerateArticleInput): string {
  return [
    `Makale türü: ${ARTICLE_TYPE_LABELS[input.articleType]}`,
    `Hedef kitle: ${AUDIENCE_LABELS[input.audience]}`,
    input.extraInstructions ? `Ek talimat: ${input.extraInstructions}` : null
  ]
    .filter(Boolean)
    .join("\n");
}

export const GROUNDING_RULE = `
KESİN KURAL: Yalnızca sana "ONAYLI VERİ" olarak verilen bilgileri gerçek/somut
bilgi (rakam, tarih, isim, istatistik, kesin iddia) olarak kullanabilirsin.
Onaylı veride yer almayan hiçbir somut bilgiyi ASLA uydurma. Eğer bir konuda
onaylı veri yetersizse, genel/doğru eğitim bilgisi verebilirsin (ör. meslek
liselerinin genel yapısı) ama bunu okula özgü bir iddiaymış gibi sunma; okula
özgü eksik bir bilgi varsa "[Bu bilgi okul tarafından tamamlanmalıdır]" gibi
açık bir yer tutucu kullan.
`.trim();
