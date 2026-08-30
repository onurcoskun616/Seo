export interface QualityCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface QualityScore {
  overall: number;
  readability: number;
  readabilityLabel: string;
  keywordDensityPercent: number;
  wordCount: number;
  checks: QualityCheck[];
}

const TURKISH_VOWELS = "aeıioöuüAEIİOÖUÜ";

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_>`#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSyllables(word: string): number {
  let count = 0;
  for (const ch of word) {
    if (TURKISH_VOWELS.includes(ch)) count++;
  }
  return Math.max(count, 1);
}

function readabilityLabel(score: number): string {
  if (score >= 90) return "Çok kolay";
  if (score >= 70) return "Kolay";
  if (score >= 50) return "Orta";
  if (score >= 30) return "Zor";
  return "Çok zor";
}

/**
 * Türkçe metinler için Ateşman (1997) okunabilirlik formülü:
 * 198.825 - 40.175 × (ortalama hece/kelime) - 2.610 × (ortalama kelime/cümle)
 * Yüksek puan = daha kolay okunur.
 */
function calculateReadability(plainText: string): { score: number; wordCount: number } {
  const sentences = plainText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = plainText.split(/\s+/).filter((w) => w.length > 0);

  if (words.length === 0 || sentences.length === 0) {
    return { score: 0, wordCount: words.length };
  }

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const avgSyllablesPerWord = totalSyllables / words.length;
  const avgWordsPerSentence = words.length / sentences.length;

  const raw = 198.825 - 40.175 * avgSyllablesPerWord - 2.61 * avgWordsPerSentence;
  return { score: Math.max(0, Math.min(100, Math.round(raw))), wordCount: words.length };
}

function calculateKeywordDensity(plainText: string, keyword: string): number {
  if (!keyword.trim()) return 0;
  const words = plainText.toLowerCase().split(/\s+/).filter(Boolean);
  const keywordWords = keyword.toLowerCase().trim().split(/\s+/);
  if (!words.length || !keywordWords.length) return 0;

  let matches = 0;
  for (let i = 0; i <= words.length - keywordWords.length; i++) {
    let isMatch = true;
    for (let j = 0; j < keywordWords.length; j++) {
      if (words[i + j] !== keywordWords[j]) {
        isMatch = false;
        break;
      }
    }
    if (isMatch) matches++;
  }
  return Math.round((matches / words.length) * 10000) / 100;
}

export function scoreArticle(params: {
  title: string;
  metaDescription: string;
  contentMarkdown: string;
  primaryKeyword?: string;
  faqCount: number;
}): QualityScore {
  const plainText = stripMarkdown(params.contentMarkdown);
  const { score: readability, wordCount } = calculateReadability(plainText);
  const keywordDensityPercent = calculateKeywordDensity(plainText, params.primaryKeyword || "");
  const hasRelatedLinks = /##\s*İlgili Yazılar/i.test(params.contentMarkdown);
  const h2Count = (params.contentMarkdown.match(/^##\s+/gm) || []).length;

  const checks: QualityCheck[] = [
    {
      label: "Başlık uzunluğu",
      ok: params.title.length >= 40 && params.title.length <= 65,
      detail: `${params.title.length} karakter (ideal: 40-65)`
    },
    {
      label: "Meta açıklama uzunluğu",
      ok: params.metaDescription.length >= 120 && params.metaDescription.length <= 165,
      detail: `${params.metaDescription.length} karakter (ideal: 120-165)`
    },
    {
      label: "İçerik uzunluğu",
      ok: wordCount >= 500,
      detail: `${wordCount} kelime (ideal: 500+)`
    },
    {
      label: "Alt başlık (H2) sayısı",
      ok: h2Count >= 3,
      detail: `${h2Count} adet H2 başlık (ideal: 3+)`
    },
    {
      label: "SSS (FAQ) bölümü",
      ok: params.faqCount >= 3,
      detail: `${params.faqCount} soru-cevap (ideal: 3+)`
    },
    {
      label: "Anahtar kelime yoğunluğu",
      ok: keywordDensityPercent >= 0.4 && keywordDensityPercent <= 3,
      detail: `%${keywordDensityPercent} (ideal: %0.4-3)`
    },
    {
      label: "İç link (İlgili Yazılar)",
      ok: hasRelatedLinks,
      detail: hasRelatedLinks ? "Var" : "Yok (henüz yayınlanmış başka makale olmayabilir)"
    }
  ];

  const passRate = (checks.filter((c) => c.ok).length / checks.length) * 100;
  const keywordScoreComponent =
    keywordDensityPercent >= 0.4 && keywordDensityPercent <= 3
      ? 100
      : Math.max(0, 100 - Math.abs(keywordDensityPercent - 1.5) * 30);

  const overall = Math.round((readability + passRate + keywordScoreComponent) / 3);

  return {
    overall,
    readability,
    readabilityLabel: readabilityLabel(readability),
    keywordDensityPercent,
    wordCount,
    checks
  };
}
