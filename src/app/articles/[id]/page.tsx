"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ARTICLE_TYPE_LABELS,
  Article,
  AUDIENCE_LABELS,
  PublishConfig
} from "@/lib/types";

type Tab = "content" | "seo" | "trace" | "publish";

export default function ArticleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [tab, setTab] = useState<Tab>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    return fetch(`/api/articles/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        setArticle(d.article);
        setMarkdown(d.article?.content_markdown || "");
        setTitle(d.article?.title || "");
        setMetaDescription(d.article?.meta_description || "");
      });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function save(status?: string) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/articles/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_markdown: markdown,
          title,
          meta_description: metaDescription,
          ...(status ? { status } : {})
        })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
      setMessage("Kaydedildi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Hata.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Bu makaleyi silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/articles/${params.id}`, { method: "DELETE" });
    router.push("/articles");
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setMessage(`${label} panoya kopyalandı.`);
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  if (!article) return <p className="text-sm text-gray-500">Makale bulunamadı.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title || "(başlıksız)"}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {ARTICLE_TYPE_LABELS[article.article_type]} · {AUDIENCE_LABELS[article.audience]} · Durum:{" "}
            <strong>{article.status}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => save("approved")} disabled={saving}>
            Onayla
          </button>
          <button className="btn-danger" onClick={remove}>
            Sil
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            ["content", "İçerik"],
            ["seo", "SEO / JSON-LD"],
            ["trace", "Ajan Süreci"],
            ["publish", "Yayınla / Dışa Aktar"]
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === value ? "border-brand-500 text-brand-700" : "border-transparent text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <p className="text-sm text-brand-700">{message}</p>}

      {tab === "content" && (
        <div className="card space-y-4 p-6">
          <div>
            <label className="label">Başlık</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Meta Açıklama</label>
            <textarea
              className="input min-h-[60px]"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">İçerik (Markdown)</label>
            <textarea
              className="input min-h-[500px] font-mono text-xs"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => save()} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}

      {tab === "seo" && (
        <div className="card space-y-4 p-6">
          <div>
            <p className="label">AI Cevap Özeti (yapay zekâ arama motorları için)</p>
            <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
              {article.ai_answer_snippet}
            </p>
          </div>
          <div>
            <p className="label">Slug</p>
            <code className="text-sm">{article.slug}</code>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="label">JSON-LD Yapılandırılmış Veri</p>
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => copy(JSON.stringify(article.json_ld, null, 2), "JSON-LD")}
              >
                Kopyala
              </button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
              {JSON.stringify(article.json_ld, null, 2)}
            </pre>
          </div>
          <div>
            <p className="label">SSS (FAQ)</p>
            <div className="space-y-2">
              {(article.faq_json || []).map((f, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p className="font-medium text-gray-800">{f.question}</p>
                  <p className="text-gray-600">{f.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "trace" && (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-gray-500">
            Şeffaflık için, her ajanın ürettiği ara çıktılar burada saklanır.
          </p>
          <pre className="max-h-[600px] overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(article.agent_trace, null, 2)}
          </pre>
        </div>
      )}

      {tab === "publish" && <PublishPanel articleId={article.id} onDone={load} />}
    </div>
  );
}

function PublishPanel({ articleId, onDone }: { articleId: string; onDone: () => void }) {
  const [configs, setConfigs] = useState<PublishConfig[]>([]);
  const [selected, setSelected] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/publish-configs")
      .then((r) => r.json())
      .then((d) => setConfigs(d.configs || []));
  }, []);

  async function publish() {
    if (!selected) return;
    setPublishing(true);
    setResult(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishConfigId: selected })
      });
      const data = await res.json();
      setResult(
        data.status === "success"
          ? "Başarıyla yayınlandı."
          : `Yayınlama başarısız (durum: ${data.statusCode ?? "-"}): ${data.responseSnippet ?? data.error}`
      );
      onDone();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Doğrudan Yayınla</h3>
        {configs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Henüz bir yayın hedefi (webhook/REST uç noktası) tanımlanmadı.{" "}
            <a href="/settings" className="text-brand-600 hover:underline">
              Ayarlar
            </a>{" "}
            sayfasından ekleyebilirsiniz.
          </p>
        ) : (
          <div className="flex gap-3">
            <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Yayın hedefi seçin</option>
              {configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={publish} disabled={!selected || publishing}>
              {publishing ? "Gönderiliyor..." : "Yayınla"}
            </button>
          </div>
        )}
        {result && <p className="mt-2 text-sm text-gray-600">{result}</p>}
      </div>

      <hr className="border-gray-100" />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-800">Manuel Dışa Aktarım</h3>
        <p className="text-sm text-gray-500">
          Mevcut CMS'inize kendiniz yapıştırmak isterseniz, aşağıdan içeriği veya HTML çıktısını
          panoya kopyalayıp kullanabilirsiniz.
        </p>
        <ExportButtons articleId={articleId} />
      </div>
    </div>
  );
}

function ExportButtons({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<Article | null>(null);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then((r) => r.json())
      .then((d) => setArticle(d.article));
  }, [articleId]);

  if (!article) return null;

  function copy(text: string) {
    navigator.clipboard.writeText(text || "");
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button className="btn-secondary" onClick={() => copy(article.content_markdown || "")}>
        Markdown'ı Kopyala
      </button>
      <button className="btn-secondary" onClick={() => copy(article.content_html || "")}>
        HTML'i Kopyala
      </button>
      <button className="btn-secondary" onClick={() => copy(JSON.stringify(article.json_ld, null, 2))}>
        JSON-LD'yi Kopyala
      </button>
    </div>
  );
}
