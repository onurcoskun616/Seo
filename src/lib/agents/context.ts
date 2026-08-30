import { ACHIEVEMENT_CATEGORY_LABELS, ARTICLE_TYPE_LABELS, ArticleType, AUDIENCE_LABELS } from "@/lib/types";
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

function achievementBlock(a: GroundedFacts["achievements"][number]): string {
  return [
    `### ${a.title}`,
    `Kategori: ${ACHIEVEMENT_CATEGORY_LABELS[a.category]}`,
    a.achievement_date ? `Tarih: ${a.achievement_date}` : null,
    a.description ? `Açıklama: ${a.description}` : null
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

  if (facts.achievements.length) {
    parts.push("\n## ÖĞRENCİ BAŞARILARI / PROJELER (ONAYLI VERİ)");
    parts.push(facts.achievements.map(achievementBlock).join("\n\n"));
  }

  return parts.join("\n");
}

/**
 * Bazı makale türleri (rakip okulla karşılaştırma, LGS gibi zamana bağlı
 * konular, öğrenci başarıları gibi tamamen veri bankasına bağlı olması
 * gereken konular) için ek, tür-özel güvenlik/kalite kuralları.
 */
export function typeSpecificGuidance(articleType: ArticleType): string {
  switch (articleType) {
    case "comparison":
      return `
BU MAKALE TÜRÜ İÇİN ÖZEL KURAL: Bu bir "okul seçim kriterleri / karşılaştırma"
makalesidir; genelde "İstanbul'da/Başakşehir'de/İkitelli'de en iyi meslek
lisesi hangisi?" tarzı sorulara cevap olarak kullanılır. Adı geçen ya da
geçmeyen BAŞKA bir okul hakkında (program, başarı oranı, öğretmen sayısı,
ücret, kadro vb.) TEK BİR somut/spesifik iddiada BULUNMA — bu okullar
hakkında onaylı verin yok, yanlış veya karalayıcı bilgi vermemelisin.
"En iyi biziz", "1 numaralı meslek lisesi", "bölgenin lider okulu" gibi
KANITLANAMAYAN ÜSTÜNLÜK/SIRALAMA iddialarında ASLA bulunma — bunlar hem
yanıltıcı reklam riski taşır hem de güvenilirliği zedeler. Bunun yerine
"iyi bir meslek lisesi seçerken nelere bakılmalı" (atölye/kampüs imkanları,
bölüm çeşitliliği, konum/ulaşım, üniversite/kariyer imkanları, rehberlik
desteği vb.) şeklinde NÖTR VE GENEL kriterler sun; her kriterde Topkapı
Okulları'nın ONAYLI VERİDEKİ somut güçlü yönünü (varsa kampüsün bulunduğu
semt/bölge dahil) göster ve okuyucunun kendi kriterlerine göre karar
vermesini teşvik et. Rakip okulları isim vererek eleştirme veya olumsuz
kıyaslama yapma.`.trim();
    case "education_approach":
      return `
BU MAKALE TÜRÜ İÇİN ÖZEL KURAL: Bu, Topkapı Okulları'nın eğitim
yaklaşımını/modelini anlatan bir düşünce liderliği (thought-leadership)
makalesidir (ör. OSB içinde eğitim/sanayi entegrasyonu avantajı, atölye
tabanlı uygulamalı öğrenme, yapay zekâ ve otomasyon çağında müfredatın
güncelliği, kariyer/üniversite odaklı lise eğitimi, İstanbul'da teknik
lise arayan aileler için eğitim felsefesi gibi konular). Ek talimatta
belirtilen odak varsa ona göre yaz; belirtilmemişse ONAYLI VERİDEKİ kampüs
(özellikle OSB/sanayi bölgesi konumu, atölye/olanaklar) ve bölüm
(müfredat öne çıkanları, kariyer/üniversite imkanları) bilgilerinden en
öne çıkanı seç. Somut sayısal başarı oranı, sıralama veya "garanti"
iddiası UYDURMA; yalnızca onaylı veride varsa kullan.`.trim();
    case "lgs_guide":
      return `
BU MAKALE TÜRÜ İÇİN ÖZEL KURAL: LGS (Liseye Geçiş Sınavı) süreci hakkında
YALNIZCA genel, tartışmasız ve zamana bağlı olmayan bilgiler ver (sınavın
amacı, tercih yapma mantığı, taban puan kavramı, meslek lisesi tercih
etmenin ne anlama geldiği vb.). Sınav tarihleri, başvuru takvimi gibi
YIL BAZLI/DEĞİŞKEN bilgileri KESİN TARİH vererek YAZMA; bunun yerine
"güncel MEB takvimini takip edin" gibi ifadeler kullan. Topkapı
Okulları'na özgü taban puan/kontenjan gibi bilgileri SADECE onaylı veride
varsa kullan, yoksa açık yer tutucu bırak.`.trim();
    case "student_achievements":
      return `
BU MAKALE TÜRÜ İÇİN ÖZEL KURAL: Bu makale SADECE "ÖĞRENCİ BAŞARILARI /
PROJELER (ONAYLI VERİ)" başlığı altında listelenen gerçek kayıtlara
dayanmalıdır. Listede olmayan hiçbir yarışma, ödül, proje veya sportif
başarıyı UYDURMA. Listedeki başarıları kategori veya kronoloji bazlı
gruplayarak ilham verici ama gerçekçi bir dille anlat.`.trim();
    default:
      return "";
  }
}

export function describeRequest(input: GenerateArticleInput): string {
  return [
    `Makale türü: ${ARTICLE_TYPE_LABELS[input.articleType]}`,
    `Hedef kitle: ${AUDIENCE_LABELS[input.audience]}`,
    input.extraInstructions ? `Ek talimat: ${input.extraInstructions}` : null,
    typeSpecificGuidance(input.articleType) || null
  ]
    .filter(Boolean)
    .join("\n\n");
}

export const GROUNDING_RULE = `
KESİN KURAL: Yalnızca sana "ONAYLI VERİ" olarak verilen bilgileri gerçek/somut
bilgi (rakam, tarih, isim, istatistik, kesin iddia) olarak kullanabilirsin.
Onaylı veride yer almayan hiçbir somut bilgiyi ASLA uydurma. Eğer bir konuda
onaylı veri yetersizse, genel/doğru eğitim bilgisi verebilirsin (ör. meslek
liselerinin genel yapısı) ama bunu okula özgü bir iddiaymış gibi sunma; okula
özgü eksik bir bilgi varsa "[Bu bilgi okul tarafından tamamlanmalıdır]" gibi
açık bir yer tutucu kullan.

REKLAM GÜVENLİĞİ KURALI (KESİNLİKLE UYULMASI GEREKİR): "İş garantisi",
"garanti edilir", "kesin iş bulursunuz", "%100 istihdam" gibi İSTİHDAM
GARANTİSİ ima eden hiçbir ifadeyi ASLA kullanma — onaylı veride açıkça ve
harfiyen böyle bir garanti yazsa bile bu tür ifadeler yanıltıcı reklam
riski taşır; bunun yerine "sektörle güçlü işbirlikleri", "staj/işbaşı
eğitim imkanları", "mezuniyet sonrası istihdam desteği" gibi kanıtlanabilir
ve ölçülü ifadeler kullan. Aynı şekilde "en iyi", "1 numaralı", "bölgenin
lideri", "Türkiye'nin en başarılısı" gibi KANITLANAMAYAN ÜSTÜNLÜK/SIRALAMA
iddialarını da kullanma; onun yerine somut, onaylı verilere dayanan
tanımlayıcı ifadeler tercih et.
`.trim();
