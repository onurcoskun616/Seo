"use client";

import { useEffect, useState } from "react";
import { GscRow } from "@/lib/gsc";

interface QueryResponse {
  range: { start: string; end: string };
  queries: GscRow[];
  pages: GscRow[];
  error?: string;
}

export default function PerformancePage() {
  const [data, setData] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(28);

  function load() {
    setLoading(true);
    setError(null);
    fetch(`/api/gsc/query?days=${days}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Veri alınamadı.");
        setData(d);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Hata"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Performans (Google Search Console)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hangi makalelerin/anahtar kelimelerin gerçek arama trafiği getirdiğini gösterir.
          </p>
        </div>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Son 7 gün</option>
          <option value={28}>Son 28 gün</option>
          <option value={90}>Son 90 gün</option>
        </select>
      </div>

      {loading && <p className="text-sm text-gray-500">Yükleniyor...</p>}

      {error && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
          <p className="mt-2 text-xs">
            Kurulum için: bir Google Cloud servis hesabı oluşturun, Search Console API'yi
            etkinleştirin, servis hesabı e-postasını Search Console mülkünüze "Tam" yetkiyle
            ekleyin; ardından <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
            <code>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</code> ve <code>GSC_SITE_URL</code> ortam
            değişkenlerini Render'da tanımlayın.
          </p>
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">En Çok Aranan Sorgular</h2>
            <Table rows={data.queries} labelHeader="Sorgu" />
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">En Çok Trafik Alan Sayfalar</h2>
            <Table rows={data.pages} labelHeader="Sayfa" />
          </div>
        </div>
      )}
    </div>
  );
}

function Table({ rows, labelHeader }: { rows: GscRow[]; labelHeader: string }) {
  if (!rows.length) return <p className="text-sm text-gray-500">Bu dönem için veri yok.</p>;
  return (
    <div className="overflow-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th className="pb-2">{labelHeader}</th>
            <th className="pb-2 text-right">Tıklama</th>
            <th className="pb-2 text-right">Gösterim</th>
            <th className="pb-2 text-right">CTR</th>
            <th className="pb-2 text-right">Ort. Sıra</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100">
              <td className="max-w-xs truncate py-2" title={r.keys[0]}>
                {r.keys[0]}
              </td>
              <td className="py-2 text-right">{r.clicks}</td>
              <td className="py-2 text-right">{r.impressions}</td>
              <td className="py-2 text-right">{(r.ctr * 100).toFixed(1)}%</td>
              <td className="py-2 text-right">{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
