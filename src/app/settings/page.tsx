"use client";

import { useEffect, useState } from "react";
import { PublishConfig } from "@/lib/types";

interface Status {
  anthropicConfigured: boolean;
  supabaseConfigured: boolean;
  model: string;
  siteUrl: string;
}

function emptyConfig() {
  return {
    name: "",
    endpoint_url: "",
    http_method: "POST",
    auth_header_name: "",
    auth_header_value: "",
    field_mapping: {} as Record<string, string>
  };
}

export default function SettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [configs, setConfigs] = useState<PublishConfig[]>([]);
  const [editing, setEditing] = useState<ReturnType<typeof emptyConfig> | null>(null);
  const [fieldMappingRaw, setFieldMappingRaw] = useState("{}");

  function refresh() {
    return fetch("/api/publish-configs")
      .then((r) => r.json())
      .then((d) => setConfigs(d.configs || []));
  }

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus);
    refresh();
  }, []);

  async function save() {
    if (!editing) return;
    let mapping = {};
    try {
      mapping = JSON.parse(fieldMappingRaw || "{}");
    } catch {
      alert("Alan eşleme JSON'ı geçersiz.");
      return;
    }
    const res = await fetch("/api/publish-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editing, field_mapping: mapping })
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Silinsin mi?")) return;
    await fetch(`/api/publish-configs/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-gray-500">Sistem durumu ve yayın hedefleri.</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">Sistem Durumu</h2>
        {!status ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : (
          <ul className="space-y-2 text-sm">
            <li>
              Anthropic (Claude) API:{" "}
              <StatusBadge ok={status.anthropicConfigured} okLabel="Yapılandırılmış" badLabel="Eksik (ANTHROPIC_API_KEY)" />
            </li>
            <li>
              Supabase Veritabanı:{" "}
              <StatusBadge ok={status.supabaseConfigured} okLabel="Bağlı" badLabel="Eksik (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" />
            </li>
            <li>Kullanılan model: <code>{status.model}</code></li>
            <li>Site URL: <code>{status.siteUrl}</code></li>
            <li>
              <a href="/api/llms-txt" target="_blank" className="text-brand-600 hover:underline">
                llms.txt önizlemesini görüntüle →
              </a>
            </li>
          </ul>
        )}
      </div>

      <div className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Yayın Hedefleri (Webhook / REST)</h2>
          <button
            className="btn-secondary"
            onClick={() => {
              setEditing(emptyConfig());
              setFieldMappingRaw("{}");
            }}
          >
            + Yeni Hedef
          </button>
        </div>
        <p className="mb-4 text-xs text-gray-500">
          topkapiokullari.com özel bir altyapıda çalışıyorsa, o sistemin makale ekleme API'sini
          buraya (URL + gerekli auth header'ı) tanımlayarak makale detay sayfasındaki "Yayınla"
          butonuyla doğrudan gönderim yapabilirsiniz. Alan eşleme, hedef API'nizin beklediği JSON
          alan adlarını bizim alanlarımıza (title, content_html, content_markdown,
          meta_description, slug, json_ld) eşler.
        </p>

        {editing && (
          <div className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4">
            <input
              className="input"
              placeholder="Ad (örn. Topkapı CMS)"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="https://www.topkapiokullari.com/api/articles"
              value={editing.endpoint_url}
              onChange={(e) => setEditing({ ...editing, endpoint_url: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                placeholder="HTTP Metodu (POST)"
                value={editing.http_method}
                onChange={(e) => setEditing({ ...editing, http_method: e.target.value })}
              />
              <input
                className="input"
                placeholder="Auth Header Adı (örn. Authorization)"
                value={editing.auth_header_name}
                onChange={(e) => setEditing({ ...editing, auth_header_name: e.target.value })}
              />
            </div>
            <input
              className="input"
              placeholder="Auth Header Değeri (örn. Bearer xxxxx)"
              type="password"
              value={editing.auth_header_value}
              onChange={(e) => setEditing({ ...editing, auth_header_value: e.target.value })}
            />
            <div>
              <label className="label">
                Alan Eşleme (JSON) — örn: {"{"}"post_title":"title","post_content":"content_html"{"}"}
              </label>
              <textarea
                className="input min-h-[80px] font-mono text-xs"
                value={fieldMappingRaw}
                onChange={(e) => setFieldMappingRaw(e.target.value)}
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

        <div className="space-y-2">
          {configs.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
              <div>
                <p className="font-medium text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-500">
                  {c.http_method} {c.endpoint_url}
                </p>
              </div>
              <button className="text-red-600 hover:underline" onClick={() => remove(c.id)}>
                Sil
              </button>
            </div>
          ))}
          {configs.length === 0 && !editing && (
            <p className="text-sm text-gray-500">Henüz yayın hedefi tanımlanmadı.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, okLabel, badLabel }: { ok: boolean; okLabel: string; badLabel: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      {ok ? okLabel : badLabel}
    </span>
  );
}
