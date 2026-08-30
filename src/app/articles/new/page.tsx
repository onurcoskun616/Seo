"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ARTICLE_TYPE_LABELS,
  ArticleType,
  AUDIENCE_LABELS,
  Audience,
  Campus,
  Department
} from "@/lib/types";

const STEPS = [
  "SEO Stratejisti anahtar kelimeleri ve içerik planını hazırlıyor...",
  "Mesleki Eğitim İçerik Uzmanı taslağı yazıyor...",
  "Editör & Doğrulama Uzmanı bilgi bankasıyla karşılaştırıp düzeltiyor...",
  "GEO / Yapılandırılmış Veri Uzmanı SEO meta ve JSON-LD üretiyor..."
];

export default function NewArticlePage() {
  const router = useRouter();
  const [articleType, setArticleType] = useState<ArticleType>("department_overview");
  const [audience, setAudience] = useState<Audience>("ogrenci_9_10");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [campusId, setCampusId] = useState<string>("");
  const [extraInstructions, setExtraInstructions] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingKb, setLoadingKb] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/kb/departments").then((r) => r.json()),
      fetch("/api/kb/campuses").then((r) => r.json())
    ])
      .then(([d, c]) => {
        setDepartments(d.departments || []);
        setCampuses(c.campuses || []);
      })
      .finally(() => setLoadingKb(false));
  }, []);

  const needsDepartment = articleType === "department_overview";
  const needsCampus = articleType === "campus_overview";

  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setStepIndex((i) => (i < STEPS.length - 1 ? i + 1 : i));
    }, 12000);
    return () => clearInterval(interval);
  }, [generating]);

  async function generate() {
    setError(null);
    setGenerating(true);
    setStepIndex(0);
    try {
      const res = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleType,
          audience,
          departmentId: needsDepartment ? departmentId || null : null,
          campusId: needsCampus ? campusId || null : null,
          extraInstructions: extraInstructions || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Makale üretilemedi.");
      }
      const data = await res.json();
      router.push(`/articles/${data.article.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
      setGenerating(false);
    }
  }

  if (loadingKb) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  const kbEmpty = departments.length === 0 && campuses.length === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Yeni Makale Oluştur</h1>
        <p className="mt-1 text-sm text-gray-500">
          4 uzman ajan sırayla çalışarak SEO ve GEO (yapay zekâ görünürlüğü) odaklı bir makale
          üretecek.
        </p>
      </div>

      {kbEmpty && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Bilgi bankasında henüz kampüs/bölüm yok. Daha isabetli makaleler için önce{" "}
          <a href="/kb" className="underline">
            Bilgi Bankası
          </a>{" "}
          sayfasından veri girin. Yine de "Okul Kimliği" veya "Meslek Lisesi Nedir?" gibi genel
          türlerle devam edebilirsiniz.
        </div>
      )}

      {!generating && (
        <div className="card space-y-5 p-6">
          <div>
            <label className="label">Makale Türü</label>
            <select
              className="input"
              value={articleType}
              onChange={(e) => setArticleType(e.target.value as ArticleType)}
            >
              {Object.entries(ARTICLE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {needsDepartment && (
            <div>
              <label className="label">Hedef Bölüm / Alan</label>
              <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">Seçiniz</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsCampus && (
            <div>
              <label className="label">Hedef Kampüs</label>
              <select className="input" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                <option value="">Seçiniz</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Hedef Kitle</label>
            <select className="input" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
              {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Ek Talimat (opsiyonel)</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Örn: 'Sınav puanı yüksek olmayan öğrencilere de umut verici bir ton kullan' gibi ek yönlendirmeler yazabilirsiniz."
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            className="btn-primary w-full"
            onClick={generate}
            disabled={(needsDepartment && !departmentId) || (needsCampus && !campusId)}
          >
            Makaleyi Oluştur
          </button>
        </div>
      )}

      {generating && (
        <div className="card space-y-4 p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-sm font-medium text-gray-800">{STEPS[stepIndex]}</p>
          <p className="text-xs text-gray-400">
            Bu işlem, ajan sayısı nedeniyle bir dakikadan fazla sürebilir. Lütfen sayfayı
            kapatmayın.
          </p>
        </div>
      )}
    </div>
  );
}
