/**
 * Uzun markdown içeriği JSON içine gömmek yerine, ajanlardan
 * "## BAŞLIK" ile ayrılmış düz metin bölümleri istiyoruz. Bu, tırnak/kod
 * bloğu kaçış sorunlarını ortadan kaldırır ve daha güvenilirdir.
 */
export function parseSections(raw: string, headings: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const pattern = headings.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`^##\\s*(${pattern})\\s*$`, "gim");

  const matches: { heading: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    matches.push({ heading: m[1].toUpperCase(), index: m.index + m[0].length });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? findHeadingStart(raw, matches[i + 1]) : raw.length;
    result[matches[i].heading] = raw.slice(start, end).trim();
  }

  return result;
}

function findHeadingStart(raw: string, next: { heading: string; index: number }): number {
  // "index" bir sonraki başlığın İÇERİĞİNİN başlangıcı; başlık satırının
  // kendisini de dışarıda bırakmak için satır başına geri sar.
  const before = raw.slice(0, next.index);
  const lastHeadingLineStart = before.lastIndexOf("\n##");
  return lastHeadingLineStart === -1 ? 0 : lastHeadingLineStart;
}

export function parseBulletList(section: string | undefined): string[] {
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"))
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

export function parseQAList(section: string | undefined): { question: string; answer: string }[] {
  if (!section) return [];
  const lines = section.split("\n").map((l) => l.trim());
  const qa: { question: string; answer: string }[] = [];
  let currentQ: string | null = null;
  let currentA: string[] = [];

  const flush = () => {
    if (currentQ) {
      qa.push({ question: currentQ, answer: currentA.join(" ").trim() });
    }
    currentQ = null;
    currentA = [];
  };

  for (const line of lines) {
    if (/^S(oru)?\s*:/i.test(line) || /^Q\s*:/i.test(line)) {
      flush();
      currentQ = line.replace(/^S(oru)?\s*:/i, "").replace(/^Q\s*:/i, "").trim();
    } else if (/^C(evap)?\s*:/i.test(line) || /^A\s*:/i.test(line)) {
      currentA.push(line.replace(/^C(evap)?\s*:/i, "").replace(/^A\s*:/i, "").trim());
    } else if (line && currentQ) {
      currentA.push(line);
    }
  }
  flush();
  return qa;
}
