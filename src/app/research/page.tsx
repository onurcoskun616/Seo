"use client";

import { useState } from "react";

interface ResearchResult {
  likelyQuestions: string[];
  longTailKeywords: string[];
  contentAngleIdeas: string[];
}

export default function ResearchPage() {
  const [topic, setTopic] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, context: context || undefined })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Hata");
      const data = await res.json();
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setLoading(false);
    }
  }

  function copyAll(items: string[]) {
    navigator.clipboard.writeText(items.map((i) => `- ${i}`).join("\n"));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Konu / Soru Araştırma</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bir konu için öğrenci/velilerin muhtemel arama sorularını ve içerik fikirlerini
          keşfedin. <strong>Önemli:</strong> bu sonuçlar gerçek zamanlı arama hacmi verisine
          değil, yapay zekânın genel bilgisine dayanan tahminlerdir — kesin istatistik olarak
          kullanmayın, fikir/başlangıç noktası olarak değerlendirin.
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Konu</label>
          <input
            className="input"
            placeholder="Örn: CNC Teknolojisi bölümü mezuniyet sonrası imkanlar"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ek bağlam (opsiyonel)</label>
          <textarea
            className="input min-h-[60px]"
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" onClick={run} disabled={!topic || loading}>
          {loading ? "Araştırılıyor..." : "Araştır"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <ResultCard title="Olası Sorular" items={result.likelyQuestions} onCopy={copyAll} />
          <ResultCard title="Uzun Kuyruk Anahtar Kelimeler" items={result.longTailKeywords} onCopy={copyAll} />
          <ResultCard title="İçerik / Başlık Fikirleri" items={result.contentAngleIdeas} onCopy={copyAll} />
        </div>
      )}
    </div>
  );
}

function ResultCard({
  title,
  items,
  onCopy
}: {
  title: string;
  items: string[];
  onCopy: (items: string[]) => void;
}) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <button className="text-xs text-brand-600 hover:underline" onClick={() => onCopy(items)}>
          Kopyala
        </button>
      </div>
      <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
