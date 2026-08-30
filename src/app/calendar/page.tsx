"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ARTICLE_TYPE_LABELS,
  ArticleType,
  AUDIENCE_LABELS,
  Audience,
  Campus,
  Department,
  EditorialCalendarItem
} from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  planned: "Planlandı",
  in_progress: "Üretiliyor...",
  done: "Tamamlandı"
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800"
};

function emptyItem() {
  return {
    title: "",
    planned_date: new Date().toISOString().slice(0, 10),
    article_type: "department_overview" as ArticleType,
    audience: "ogrenci_9_10" as Audience,
    target_department_id: "",
    target_campus_id: "",
    assigned_to: "",
    notes: ""
  };
}

export default function CalendarPage() {
  const [items, setItems] = useState<EditorialCalendarItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [editing, setEditing] = useState<ReturnType<typeof emptyItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return fetch("/api/calendar")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }

  useEffect(() => {
    Promise.all([
      refresh(),
      fetch("/api/kb/departments").then((r) => r.json()),
      fetch("/api/kb/campuses").then((r) => r.json())
    ])
      .then(([, d, c]) => {
        setDepartments(d.departments || []);
        setCampuses(c.campuses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!editing) return;
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editing,
        target_department_id: editing.target_department_id || null,
        target_campus_id: editing.target_campus_id || null
      })
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu takvim girişini silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    refresh();
  }

  async function generate(id: string) {
    setGeneratingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/${id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Üretim başarısız.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setGeneratingId(null);
    }
  }

  const needsDepartment = editing?.article_type === "department_overview";
  const needsCampus = editing?.article_type === "campus_overview";

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  const grouped = items.reduce<Record<string, EditorialCalendarItem[]>>((acc, item) => {
    const month = item.planned_date.slice(0, 7);
    (acc[month] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Editöryal Takvim</h1>
          <p className="mt-1 text-sm text-gray-500">
            Yazılacak makaleleri önceden planlayın, kime atandığını not edin, tarihi geldiğinde
            tek tıkla üretin.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(emptyItem())}>
          + Planlı Makale Ekle
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {editing && (
        <div className="card space-y-4 p-6">
          <input
            className="input"
            placeholder="Başlık / konu (ör. CNC Teknolojisi bölüm tanıtımı)"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Planlanan Tarih</label>
              <input
                type="date"
                className="input"
                value={editing.planned_date}
                onChange={(e) => setEditing({ ...editing, planned_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Atanan Kişi (opsiyonel)</label>
              <input
                className="input"
                value={editing.assigned_to}
                onChange={(e) => setEditing({ ...editing, assigned_to: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Makale Türü</label>
              <select
                className="input"
                value={editing.article_type}
                onChange={(e) => setEditing({ ...editing, article_type: e.target.value as ArticleType })}
              >
                {Object.entries(ARTICLE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Hedef Kitle</label>
              <select
                className="input"
                value={editing.audience}
                onChange={(e) => setEditing({ ...editing, audience: e.target.value as Audience })}
              >
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {needsDepartment && (
            <div>
              <label className="label">Hedef Bölüm/Alan</label>
              <select
                className="input"
                value={editing.target_department_id}
                onChange={(e) => setEditing({ ...editing, target_department_id: e.target.value })}
              >
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
              <select
                className="input"
                value={editing.target_campus_id}
                onChange={(e) => setEditing({ ...editing, target_campus_id: e.target.value })}
              >
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
            <label className="label">Not (opsiyonel, üretim sırasında ek talimat olarak kullanılır)</label>
            <textarea
              className="input min-h-[60px]"
              value={editing.notes}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save}>
              Kaydet
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-gray-500">Henüz planlanan makale yok.</p>
      )}

      {Object.entries(grouped).map(([month, monthItems]) => (
        <div key={month} className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500">
            {new Date(`${month}-01`).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
          </h2>
          {monthItems.map((item) => (
            <div key={item.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(item.planned_date).toLocaleDateString("tr-TR")} ·{" "}
                  {ARTICLE_TYPE_LABELS[item.article_type]}
                  {item.assigned_to ? ` · ${item.assigned_to}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                  {STATUS_LABELS[item.status]}
                </span>
                {item.status === "done" && item.linked_article_id ? (
                  <Link href={`/articles/${item.linked_article_id}`} className="text-xs text-brand-600 hover:underline">
                    Makaleyi Gör
                  </Link>
                ) : (
                  <button
                    className="text-xs text-brand-600 hover:underline disabled:text-gray-300"
                    onClick={() => generate(item.id)}
                    disabled={generatingId === item.id}
                  >
                    {generatingId === item.id ? "Üretiliyor..." : "Makale Oluştur"}
                  </button>
                )}
                <button className="text-xs text-red-600 hover:underline" onClick={() => remove(item.id)}>
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
