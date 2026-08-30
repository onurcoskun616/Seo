"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AUDIENCE_LABELS, Audience, Campus, Department, GenerationJob } from "@/lib/types";

type Mode = "department" | "campus";

export default function BatchArticlesPage() {
  const [mode, setMode] = useState<Mode>("department");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [audience, setAudience] = useState<Audience>("ogrenci_9_10");
  const [extraInstructions, setExtraInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/kb/departments").then((r) => r.json()),
      fetch("/api/kb/campuses").then((r) => r.json())
    ])
      .then(([d, c]) => {
        setDepartments(d.departments || []);
        setCampuses(c.campuses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const items = mode === "department" ? departments : campuses;
    setSelected(new Set(items.map((i) => i.id)));
  }, [mode, departments, campuses]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function start() {
    setError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/articles/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleType: mode === "department" ? "department_overview" : "campus_overview",
          audience,
          targetType: mode,
          targetIds: Array.from(selected),
          extraInstructions: extraInstructions || undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "İş başlatılamadı.");
      }
      const data = await res.json();
      setJob(data.job);
      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/articles/generate-batch/${data.job.id}`);
        const d = await r.json();
        setJob(d.job);
        if (d.job.status === "done" || d.job.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  const items = mode === "department" ? departments : campuses;
  const nameOf = (id: string) => items.find((i) => i.id === id)?.name || id;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Toplu Makale Üretimi</h1>
        <p className="mt-1 text-sm text-gray-500">
          Seçtiğiniz tüm bölümler veya kampüsler için sırayla, arka planda makale üretir. Bu
          sayfadan ayrılsanız bile üretim devam eder; sonuçları Makaleler sayfasından
          görebilirsiniz.
        </p>
      </div>

      {!job && (
        <div className="card space-y-5 p-6">
          <div>
            <label className="label">Ne için toplu üretim yapılsın?</label>
            <div className="flex gap-2">
              <button
                className={`btn ${mode === "department" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("department")}
              >
                Tüm Bölümler/Alanlar
              </button>
              <button
                className={`btn ${mode === "campus" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMode("campus")}
              >
                Tüm Kampüsler
              </button>
            </div>
          </div>

          <div>
            <label className="label">
              Üretilecek hedefler ({selected.size}/{items.length} seçili)
            </label>
            <div className="max-h-56 space-y-1 overflow-auto rounded-lg border border-gray-200 p-3">
              {items.map((i) => (
                <label key={i.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(i.id)}
                    onChange={() => toggle(i.id)}
                  />
                  {i.name}
                </label>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-gray-500">
                  Bilgi bankasında hiç {mode === "department" ? "bölüm" : "kampüs"} yok.
                </p>
              )}
            </div>
          </div>

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
            <label className="label">Ek Talimat (opsiyonel, tüm makalelere uygulanır)</label>
            <textarea
              className="input min-h-[70px]"
              value={extraInstructions}
              onChange={(e) => setExtraInstructions(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary w-full" onClick={start} disabled={starting || selected.size === 0}>
            {starting ? "Başlatılıyor..." : `${selected.size} makale üretimini başlat`}
          </button>
        </div>
      )}

      {job && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              İş Durumu: {STATUS_LABELS[job.status]}
            </h3>
            <span className="text-xs text-gray-500">
              {job.created_article_ids.length + job.failed_targets.length}/{job.total}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-brand-500 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  ((job.created_article_ids.length + job.failed_targets.length) / (job.total || 1)) * 100
                )}%`
              }}
            />
          </div>

          <div className="space-y-2">
            {job.target_ids.map((id, index) => {
              const processedCount = job.created_article_ids.length + job.failed_targets.length;
              const failedEntry = job.failed_targets.find((f) => f.targetId === id);
              const isProcessed = index < processedCount;
              return (
                <div key={id} className="flex items-center justify-between text-sm">
                  <span>{nameOf(id)}</span>
                  {failedEntry ? (
                    <span className="text-red-600">Hata: {failedEntry.error}</span>
                  ) : isProcessed ? (
                    <span className="text-green-600">İşlendi</span>
                  ) : (
                    <span className="text-gray-400">Bekliyor...</span>
                  )}
                </div>
              );
            })}
          </div>

          {(job.status === "done" || job.status === "error") && (
            <div className="flex gap-3 pt-2">
              <Link href="/articles" className="btn-primary">
                Makaleleri Görüntüle
              </Link>
              <button
                className="btn-secondary"
                onClick={() => {
                  setJob(null);
                  setError(null);
                }}
              >
                Yeni Toplu Üretim
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_LABELS: Record<GenerationJob["status"], string> = {
  pending: "Bekliyor",
  running: "Çalışıyor",
  done: "Tamamlandı",
  error: "Hata"
};
