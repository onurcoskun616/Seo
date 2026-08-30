"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ARTICLE_TYPE_LABELS, ArticleType, AUDIENCE_LABELS, Audience } from "@/lib/types";

interface ArticleRow {
  id: string;
  article_type: ArticleType;
  audience: Audience;
  title: string | null;
  slug: string | null;
  status: "draft" | "approved" | "published";
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  approved: "Onaylandı",
  published: "Yayınlandı"
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  approved: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-800"
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((d) => setArticles(d.articles || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Makaleler</h1>
          <p className="mt-1 text-sm text-gray-500">Üretilen tüm SEO/GEO makaleleri.</p>
        </div>
        <Link href="/articles/new" className="btn-primary">
          + Yeni Makale
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}

      {!loading && articles.length === 0 && (
        <div className="card p-8 text-center text-sm text-gray-500">
          Henüz makale üretilmedi.{" "}
          <Link href="/articles/new" className="text-brand-600 hover:underline">
            İlk makalenizi oluşturun
          </Link>
          .
        </div>
      )}

      <div className="space-y-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/articles/${a.id}`}
            className="card flex items-center justify-between p-4 hover:shadow-md"
          >
            <div>
              <h3 className="font-medium text-gray-900">{a.title || "(başlıksız)"}</h3>
              <p className="text-xs text-gray-500">
                {ARTICLE_TYPE_LABELS[a.article_type]} · {AUDIENCE_LABELS[a.audience]} ·{" "}
                {new Date(a.created_at).toLocaleDateString("tr-TR")}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
              {STATUS_LABELS[a.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
