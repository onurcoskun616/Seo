"use client";

import { useEffect, useState } from "react";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  Achievement,
  Campus,
  Department,
  SchoolIdentity
} from "@/lib/types";

type Tab = "identity" | "campuses" | "departments" | "achievements";

export default function KbPage() {
  const [tab, setTab] = useState<Tab>("identity");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bilgi Bankası</h1>
        <p className="mt-1 text-sm text-gray-500">
          Burada girdiğiniz bilgiler, makale üreten yapay zekâ ajanlarının kullanabileceği{" "}
          <strong>tek onaylı gerçek kaynağıdır</strong>. Ajanlar bu verilerin dışına çıkıp
          okula özgü bilgi uydurmaz.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            ["identity", "Okul Kimliği"],
            ["campuses", "Kampüsler"],
            ["departments", "Bölümler / Alanlar"],
            ["achievements", "Başarılar"]
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === value
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "identity" && <IdentityForm />}
      {tab === "campuses" && <CampusesManager />}
      {tab === "departments" && <DepartmentsManager />}
      {tab === "achievements" && <AchievementsManager />}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  textarea
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {textarea ? (
        <textarea className="input min-h-[90px]" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function ListField({
  label,
  value,
  onChange,
  help
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  help?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {help && <p className="mb-1 text-xs text-gray-400">{help}</p>}
      <textarea
        className="input min-h-[100px]"
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((v) => v.trim()).filter(Boolean))}
        placeholder={"Her satıra bir madde yazın"}
      />
    </div>
  );
}

function IdentityForm() {
  const [data, setData] = useState<Partial<SchoolIdentity>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/kb/identity")
      .then((r) => r.json())
      .then((d) => setData(d.identity || {}))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/kb/identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const d = await res.json();
      setData(d.identity);
      setMessage("Kaydedildi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Okul Adı" value={data.name || ""} onChange={(v) => setData({ ...data, name: v })} />
        <TextField
          label="Okul Türü"
          value={data.school_type || ""}
          onChange={(v) => setData({ ...data, school_type: v })}
        />
      </div>
      <TextField
        label="Kısa Tanım (1-2 cümle)"
        value={data.short_description || ""}
        onChange={(v) => setData({ ...data, short_description: v })}
        textarea
      />
      <TextField label="Misyon" value={data.mission || ""} onChange={(v) => setData({ ...data, mission: v })} textarea />
      <TextField label="Tarihçe" value={data.history || ""} onChange={(v) => setData({ ...data, history: v })} textarea />
      <TextField
        label="Akreditasyon / Resmi Onaylar"
        value={data.accreditation || ""}
        onChange={(v) => setData({ ...data, accreditation: v })}
        textarea
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Web Sitesi"
          value={data.website_url || ""}
          onChange={(v) => setData({ ...data, website_url: v })}
        />
        <TextField
          label="Telefon"
          value={data.contact_phone || ""}
          onChange={(v) => setData({ ...data, contact_phone: v })}
        />
      </div>
      <TextField
        label="E-posta"
        value={data.contact_email || ""}
        onChange={(v) => setData({ ...data, contact_email: v })}
      />

      <div className="flex items-center gap-3 pt-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {message && <span className="text-sm text-gray-500">{message}</span>}
      </div>
    </div>
  );
}

function emptyCampus(): Partial<Campus> {
  return { name: "", district: "", address: "", facilities: [], contact_phone: "", description: "" };
}

function CampusesManager() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [editing, setEditing] = useState<Partial<Campus> | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return fetch("/api/kb/campuses")
      .then((r) => r.json())
      .then((d) => setCampuses(d.campuses || []));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? "/api/kb/campuses" : `/api/kb/campuses/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu kampüsü silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/kb/campuses/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing(emptyCampus())}>
          + Yeni Kampüs
        </button>
      </div>

      {editing && (
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Kampüs Adı" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <TextField
              label="Semt / İlçe"
              value={editing.district || ""}
              onChange={(v) => setEditing({ ...editing, district: v })}
            />
          </div>
          <TextField label="Adres" value={editing.address || ""} onChange={(v) => setEditing({ ...editing, address: v })} />
          <TextField
            label="Telefon"
            value={editing.contact_phone || ""}
            onChange={(v) => setEditing({ ...editing, contact_phone: v })}
          />
          <ListField
            label="Olanaklar / Tesisler"
            value={editing.facilities || []}
            onChange={(v) => setEditing({ ...editing, facilities: v })}
            help="Örn: Atölyeler, laboratuvarlar, spor salonu, yurt vb. Her satıra bir tane."
          />
          <TextField
            label="Açıklama"
            value={editing.description || ""}
            onChange={(v) => setEditing({ ...editing, description: v })}
            textarea
          />
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save}>
              Kaydet
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {campuses.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{c.name}</h3>
              <div className="flex gap-2 text-xs">
                <button className="text-brand-600 hover:underline" onClick={() => setEditing(c)}>
                  Düzenle
                </button>
                <button className="text-red-600 hover:underline" onClick={() => remove(c.id)}>
                  Sil
                </button>
              </div>
            </div>
            {c.district && <p className="text-sm text-gray-500">{c.district}</p>}
            {c.description && <p className="mt-2 text-sm text-gray-600">{c.description}</p>}
            {c.facilities?.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-gray-500">
                {c.facilities.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {campuses.length === 0 && (
          <p className="text-sm text-gray-500">Henüz kampüs eklenmedi.</p>
        )}
      </div>
    </div>
  );
}

function emptyDepartment(): Partial<Department> {
  return {
    name: "",
    campus_ids: [],
    description: "",
    curriculum_highlights: [],
    career_paths: [],
    university_paths: [],
    sample_employers: [],
    success_stories: ""
  };
}

function DepartmentsManager() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [editing, setEditing] = useState<Partial<Department> | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return Promise.all([
      fetch("/api/kb/departments").then((r) => r.json()),
      fetch("/api/kb/campuses").then((r) => r.json())
    ]).then(([d, c]) => {
      setDepartments(d.departments || []);
      setCampuses(c.campuses || []);
    });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? "/api/kb/departments" : `/api/kb/departments/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu bölümü/alanı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/kb/departments/${id}`, { method: "DELETE" });
    refresh();
  }

  function toggleCampus(id: string) {
    if (!editing) return;
    const set = new Set(editing.campus_ids || []);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setEditing({ ...editing, campus_ids: Array.from(set) });
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing(emptyDepartment())}>
          + Yeni Bölüm / Alan
        </button>
      </div>

      {editing && (
        <div className="card space-y-4 p-6">
          <TextField label="Bölüm / Alan Adı" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />

          <div>
            <label className="label">Bu bölümün bulunduğu kampüsler</label>
            <div className="flex flex-wrap gap-2">
              {campuses.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleCampus(c.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    editing.campus_ids?.includes(c.id)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {c.name}
                </button>
              ))}
              {campuses.length === 0 && (
                <span className="text-xs text-gray-400">Önce Kampüsler sekmesinden kampüs ekleyin.</span>
              )}
            </div>
          </div>

          <TextField
            label="Açıklama (bölümde neler öğretilir, öne çıkan özellikler)"
            value={editing.description || ""}
            onChange={(v) => setEditing({ ...editing, description: v })}
            textarea
          />
          <ListField
            label="Müfredat Öne Çıkanları"
            value={editing.curriculum_highlights || []}
            onChange={(v) => setEditing({ ...editing, curriculum_highlights: v })}
          />
          <ListField
            label="Mezuniyet Sonrası Kariyer İmkanları"
            value={editing.career_paths || []}
            onChange={(v) => setEditing({ ...editing, career_paths: v })}
            help="Örn: CNC operatörü, yazılım geliştirici, muhasebe elemanı vb."
          />
          <ListField
            label="Üniversite / Bölüm Eşleşme İmkanları"
            value={editing.university_paths || []}
            onChange={(v) => setEditing({ ...editing, university_paths: v })}
            help="Örn: Bilgisayar Mühendisliği (ön lisans/lisans), ilgili YKS puan türleri vb."
          />
          <ListField
            label="Örnek İşveren / Sektör"
            value={editing.sample_employers || []}
            onChange={(v) => setEditing({ ...editing, sample_employers: v })}
          />
          <TextField
            label="Başarı Hikayeleri (varsa)"
            value={editing.success_stories || ""}
            onChange={(v) => setEditing({ ...editing, success_stories: v })}
            textarea
          />

          <div className="flex gap-3">
            <button className="btn-primary" onClick={save}>
              Kaydet
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {departments.map((d) => (
          <div key={d.id} className="card p-5">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{d.name}</h3>
              <div className="flex gap-2 text-xs">
                <button className="text-brand-600 hover:underline" onClick={() => setEditing(d)}>
                  Düzenle
                </button>
                <button className="text-red-600 hover:underline" onClick={() => remove(d.id)}>
                  Sil
                </button>
              </div>
            </div>
            {d.description && <p className="mt-2 text-sm text-gray-600">{d.description}</p>}
            {d.career_paths?.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                <strong>Kariyer:</strong> {d.career_paths.join(", ")}
              </p>
            )}
          </div>
        ))}
        {departments.length === 0 && (
          <p className="text-sm text-gray-500">Henüz bölüm/alan eklenmedi.</p>
        )}
      </div>
    </div>
  );
}

function emptyAchievement(): Partial<Achievement> {
  return {
    title: "",
    category: "diger",
    description: "",
    achievement_date: "",
    department_id: null,
    campus_id: null,
    source_url: ""
  };
}

function AchievementsManager() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [editing, setEditing] = useState<Partial<Achievement> | null>(null);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return Promise.all([
      fetch("/api/kb/achievements").then((r) => r.json()),
      fetch("/api/kb/departments").then((r) => r.json()),
      fetch("/api/kb/campuses").then((r) => r.json())
    ]).then(([a, d, c]) => {
      setAchievements(a.achievements || []);
      setDepartments(d.departments || []);
      setCampuses(c.campuses || []);
    });
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!editing) return;
    const isNew = !editing.id;
    const url = isNew ? "/api/kb/achievements" : `/api/kb/achievements/${editing.id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/kb/achievements/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        "Öğrenci Başarıları / Projeler / Sportif Başarılar" makale türü SADECE buradaki
        kayıtlara dayanarak yazılır — böylece yapay zekâ hiçbir yarışma/ödül uydurmaz.
      </p>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing(emptyAchievement())}>
          + Yeni Başarı / Proje
        </button>
      </div>

      {editing && (
        <div className="card space-y-4 p-6">
          <TextField label="Başlık" value={editing.title || ""} onChange={(v) => setEditing({ ...editing, title: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Kategori</label>
              <select
                className="input"
                value={editing.category || "diger"}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value as Achievement["category"] })
                }
              >
                {Object.entries(ACHIEVEMENT_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tarih</label>
              <input
                type="date"
                className="input"
                value={editing.achievement_date || ""}
                onChange={(e) => setEditing({ ...editing, achievement_date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">İlgili Bölüm/Alan (opsiyonel)</label>
              <select
                className="input"
                value={editing.department_id || ""}
                onChange={(e) => setEditing({ ...editing, department_id: e.target.value || null })}
              >
                <option value="">Yok</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">İlgili Kampüs (opsiyonel)</label>
              <select
                className="input"
                value={editing.campus_id || ""}
                onChange={(e) => setEditing({ ...editing, campus_id: e.target.value || null })}
              >
                <option value="">Yok</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <TextField
            label="Açıklama"
            value={editing.description || ""}
            onChange={(v) => setEditing({ ...editing, description: v })}
            textarea
          />
          <TextField
            label="Kaynak Linki (opsiyonel, haber/duyuru vb.)"
            value={editing.source_url || ""}
            onChange={(v) => setEditing({ ...editing, source_url: v })}
          />
          <div className="flex gap-3">
            <button className="btn-primary" onClick={save}>
              Kaydet
            </button>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Vazgeç
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {achievements.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="text-xs text-gray-500">
                  {ACHIEVEMENT_CATEGORY_LABELS[a.category]}
                  {a.achievement_date ? ` · ${a.achievement_date}` : ""}
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <button className="text-brand-600 hover:underline" onClick={() => setEditing(a)}>
                  Düzenle
                </button>
                <button className="text-red-600 hover:underline" onClick={() => remove(a.id)}>
                  Sil
                </button>
              </div>
            </div>
            {a.description && <p className="mt-2 text-sm text-gray-600">{a.description}</p>}
          </div>
        ))}
        {achievements.length === 0 && (
          <p className="text-sm text-gray-500">Henüz başarı/proje eklenmedi.</p>
        )}
      </div>
    </div>
  );
}
