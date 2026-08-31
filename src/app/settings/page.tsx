"use client";

import { useEffect, useState } from "react";
import { PublishConfig } from "@/lib/types";
import { ROLE_LABELS_CLIENT } from "@/lib/roleLabels";

interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Status {
  openaiConfigured: boolean;
  supabaseConfigured: boolean;
  gscConfigured: boolean;
  geminiConfigured: boolean;
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
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);

  function refresh() {
    return fetch("/api/publish-configs")
      .then((r) => r.json())
      .then((d) => setConfigs(d.configs || []));
  }

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user));
    refresh();
  }, []);

  function useWordpressPreset() {
    if (!editing || !status) return;
    setEditing({
      ...editing,
      name: editing.name || "WordPress",
      endpoint_url: `${status.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`,
      http_method: "POST",
      auth_header_name: "Authorization",
      auth_header_value: "Basic BASE64(kullanici_adi:uygulama_sifresi)"
    });
    setFieldMappingRaw(
      JSON.stringify({ title: "title", content: "content_html", excerpt: "meta_description", slug: "slug" }, null, 2)
    );
  }

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
              OpenAI API:{" "}
              <StatusBadge ok={status.openaiConfigured} okLabel="Yapılandırılmış" badLabel="Eksik (OPENAI_API_KEY)" />
            </li>
            <li>
              Supabase Veritabanı:{" "}
              <StatusBadge ok={status.supabaseConfigured} okLabel="Bağlı" badLabel="Eksik (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)" />
            </li>
            <li>
              Google Search Console:{" "}
              <StatusBadge
                ok={status.gscConfigured}
                okLabel="Bağlı"
                badLabel="Yapılandırılmamış (opsiyonel)"
              />
            </li>
            <li>
              Gemini (GEO testi):{" "}
              <StatusBadge
                ok={status.geminiConfigured}
                okLabel="Yapılandırılmış"
                badLabel="Yapılandırılmamış (opsiyonel, GEMINI_API_KEY)"
              />
            </li>
            <li>Kullanılan model: <code>{status.model}</code></li>
            <li>Site URL: <code>{status.siteUrl}</code></li>
            <li>
              <a href="/api/llms-txt" target="_blank" className="text-brand-600 hover:underline">
                llms.txt önizlemesini görüntüle →
              </a>
            </li>
            <li>
              <a href="/sitemap.xml" target="_blank" className="text-brand-600 hover:underline">
                sitemap.xml önizlemesini görüntüle →
              </a>
            </li>
          </ul>
        )}
        {status && !status.gscConfigured && (
          <p className="mt-3 text-xs text-gray-400">
            GSC kurulumu: bir Google Cloud servis hesabı oluşturun, Search Console API'yi
            etkinleştirin, servis hesabı e-postasını Search Console mülkünüze "Tam" yetkiyle
            ekleyin; ardından <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
            <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> ve <code>GSC_SITE_URL</code> ortam
            değişkenlerini Render'da tanımlayın.
          </p>
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
            <button type="button" className="text-xs text-brand-600 hover:underline" onClick={useWordpressPreset}>
              WordPress şablonunu doldur (REST API + Application Password)
            </button>
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

      {currentUser?.role === "admin" && <NotificationsManager />}
      {currentUser?.role === "admin" && <UsersManager />}
    </div>
  );
}

function NotificationsManager() {
  const [webhook, setWebhook] = useState("");
  const [notifyReview, setNotifyReview] = useState(true);
  const [notifyPublishFailure, setNotifyPublishFailure] = useState(true);
  const [notifyBatch, setNotifyBatch] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/notifications")
      .then((r) => r.json())
      .then((d) => {
        const s = d.settings;
        if (s) {
          setWebhook(s.slack_webhook_url || "");
          setNotifyReview(s.notify_on_review);
          setNotifyPublishFailure(s.notify_on_publish_failure);
          setNotifyBatch(s.notify_on_batch_complete);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slack_webhook_url: webhook,
          notify_on_review: notifyReview,
          notify_on_publish_failure: notifyPublishFailure,
          notify_on_batch_complete: notifyBatch
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setMessage("Kaydedildi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Hata.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setMessage(null);
    const res = await fetch("/api/settings/notifications/test", { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? "Test bildirimi gönderildi, Slack kanalınızı kontrol edin." : data.error || "Hata");
  }

  if (loading) return null;

  return (
    <div className="card space-y-4 p-6">
      <h2 className="text-sm font-semibold text-gray-800">Bildirimler (Slack)</h2>
      <p className="text-xs text-gray-500">
        Slack'te bir "Incoming Webhook" oluşturup URL'sini buraya yapıştırın. Ücretsizdir ve
        Slack workspace ayarlarından (Apps → Incoming Webhooks) birkaç dakikada kurulur.
      </p>
      <div>
        <label className="label">Slack Webhook URL</label>
        <input
          className="input"
          placeholder="https://hooks.slack.com/services/..."
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
        />
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={notifyReview} onChange={(e) => setNotifyReview(e.target.checked)} />
          Bir makale incelemeye gönderildiğinde bildir
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={notifyPublishFailure}
            onChange={(e) => setNotifyPublishFailure(e.target.checked)}
          />
          Yayınlama başarısız olduğunda bildir
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={notifyBatch} onChange={(e) => setNotifyBatch(e.target.checked)} />
          Toplu üretim işi tamamlandığında bildir
        </label>
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button className="btn-secondary" onClick={sendTest} disabled={!webhook}>
          Test Gönder
        </button>
      </div>
    </div>
  );
}

function emptyUser() {
  return { name: "", email: "", password: "", role: "editor" };
}

function UsersManager() {
  const [users, setUsers] = useState<PanelUser[]>([]);
  const [editing, setEditing] = useState<ReturnType<typeof emptyUser> | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return fetch("/api/users")
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function save() {
    if (!editing) return;
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing)
    });
    if (!res.ok) {
      setError((await res.json()).error || "Hata");
      return;
    }
    setEditing(null);
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">Kullanıcılar</h2>
        <button className="btn-secondary" onClick={() => setEditing(emptyUser())}>
          + Yeni Kullanıcı
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        <strong>Editör</strong> taslak oluşturup düzenleyebilir. <strong>İnceleyen/Onaylayan</strong>{" "}
        ve <strong>Yönetici</strong> ayrıca makaleleri onaylayıp yayınlayabilir. Yönetici ek olarak
        kullanıcı yönetebilir.
      </p>

      {editing && (
        <div className="mb-4 space-y-3 rounded-lg border border-gray-200 p-4">
          <input
            className="input"
            placeholder="Ad Soyad"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="E-posta"
            type="email"
            value={editing.email}
            onChange={(e) => setEditing({ ...editing, email: e.target.value })}
          />
          <input
            className="input"
            placeholder="Şifre (en az 8 karakter)"
            type="password"
            value={editing.password}
            onChange={(e) => setEditing({ ...editing, password: e.target.value })}
          />
          <select
            className="input"
            value={editing.role}
            onChange={(e) => setEditing({ ...editing, role: e.target.value })}
          >
            {Object.entries(ROLE_LABELS_CLIENT).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
            <div>
              <p className="font-medium text-gray-800">
                {u.name} <span className="text-xs text-gray-400">({u.email})</span>
              </p>
              <p className="text-xs text-gray-500">{ROLE_LABELS_CLIENT[u.role] || u.role}</p>
            </div>
            <button className="text-red-600 hover:underline" onClick={() => remove(u.id)}>
              Sil
            </button>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-500">Henüz kullanıcı eklenmedi.</p>}
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
