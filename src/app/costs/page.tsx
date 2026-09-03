"use client";

import { useEffect, useState } from "react";

interface UsageSummary {
  days: number;
  totalTokens: number;
  totalCost: number | null;
  hasAnyRates: boolean;
  bySource: { source: string; tokens: number; cost: number | null }[];
  byModel: {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    cost: number | null;
  }[];
  byDay: { date: string; tokens: number; cost: number | null }[];
}

interface CostRate {
  id: string;
  provider: string;
  model: string;
  input_price_per_million: number;
  output_price_per_million: number;
}

const SOURCE_LABELS: Record<string, string> = {
  strategist: "SEO Stratejisti",
  content_expert: "İçerik Uzmanı",
  editor: "Editör & Doğrulama",
  geo_meta: "GEO/Yapılandırılmış Veri",
  aeo_fix: "AEO Düzeltme",
  geo_test: "GEO Görünürlük Testi",
  research: "Konu Araştırma",
  diger: "Diğer"
};

function fmtUsd(n: number | null): string {
  if (n === null) return "—";
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

export default function CostsPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [rates, setRates] = useState<CostRate[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);

  const [newRate, setNewRate] = useState({
    provider: "openai",
    model: "",
    input_price_per_million: "",
    output_price_per_million: ""
  });

  function refresh() {
    return Promise.all([
      fetch(`/api/usage/summary?days=${days}`).then((r) => r.json()),
      fetch("/api/cost-rates").then((r) => r.json())
    ]).then(([s, r]) => {
      setSummary(s);
      setRates(r.rates || []);
    });
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.user));
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  async function saveRate() {
    if (!newRate.model) return;
    const res = await fetch("/api/cost-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRate)
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setNewRate({ provider: "openai", model: "", input_price_per_million: "", output_price_per_million: "" });
    refresh();
  }

  async function removeRate(id: string) {
    if (!confirm("Bu fiyat oranı silinsin mi?")) return;
    await fetch(`/api/cost-rates/${id}`, { method: "DELETE" });
    refresh();
  }

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Maliyet Takibi</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            OpenAI ve Gemini API çağrılarının token kullanımı. Gerçek $ maliyeti görmek için
            aşağıya kendi fiyat oranlarınızı girin (fiyatlar sık değiştiği için burada varsayılan
            bir değer yok).
          </p>
        </div>
        <select className="input w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Son 7 gün</option>
          <option value={30}>Son 30 gün</option>
          <option value={90}>Son 90 gün</option>
        </select>
      </div>

      {summary && !summary.hasAnyRates && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Henüz fiyat oranı tanımlanmadı — aşağıda token kullanımını görebilirsiniz ama $ maliyeti
          hesaplanamıyor. Aşağıdan model başına fiyat ekleyin.
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-2xl font-semibold text-gray-900">{summary.totalTokens.toLocaleString("tr-TR")}</p>
            <p className="text-xs text-gray-500">Toplam token ({summary.days} gün)</p>
          </div>
          <div className="card p-4">
            <p className="text-2xl font-semibold text-gray-900">{fmtUsd(summary.totalCost)}</p>
            <p className="text-xs text-gray-500">Tahmini maliyet</p>
          </div>
        </div>
      )}

      {summary && summary.bySource.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Kaynağa Göre Kullanım</h2>
          <div className="space-y-2">
            {summary.bySource
              .sort((a, b) => b.tokens - a.tokens)
              .map((s) => (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <span>{SOURCE_LABELS[s.source] || s.source}</span>
                  <span className="text-gray-500">
                    {s.tokens.toLocaleString("tr-TR")} token · {fmtUsd(s.cost)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {summary && summary.byModel.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">Modele Göre Kullanım</h2>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="pb-2">Sağlayıcı / Model</th>
                  <th className="pb-2 text-right">Giriş Token</th>
                  <th className="pb-2 text-right">Çıkış Token</th>
                  <th className="pb-2 text-right">Maliyet</th>
                </tr>
              </thead>
              <tbody>
                {summary.byModel.map((m) => (
                  <tr key={`${m.provider}:${m.model}`} className="border-t border-gray-100">
                    <td className="py-2">
                      {m.provider} / {m.model}
                    </td>
                    <td className="py-2 text-right">{m.promptTokens.toLocaleString("tr-TR")}</td>
                    <td className="py-2 text-right">{m.completionTokens.toLocaleString("tr-TR")}</td>
                    <td className="py-2 text-right">{fmtUsd(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentUser?.role === "admin" && (
        <div className="card space-y-4 p-6">
          <h2 className="text-sm font-semibold text-gray-800">Fiyat Oranları (1M token başına, $)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <select
              className="input"
              value={newRate.provider}
              onChange={(e) => setNewRate({ ...newRate, provider: e.target.value })}
            >
              <option value="openai">openai</option>
              <option value="gemini">gemini</option>
            </select>
            <input
              className="input"
              placeholder="model (ör. gpt-5.1)"
              value={newRate.model}
              onChange={(e) => setNewRate({ ...newRate, model: e.target.value })}
            />
            <input
              className="input"
              placeholder="Giriş $/1M"
              type="number"
              value={newRate.input_price_per_million}
              onChange={(e) => setNewRate({ ...newRate, input_price_per_million: e.target.value })}
            />
            <input
              className="input"
              placeholder="Çıkış $/1M"
              type="number"
              value={newRate.output_price_per_million}
              onChange={(e) => setNewRate({ ...newRate, output_price_per_million: e.target.value })}
            />
            <button className="btn-primary" onClick={saveRate}>
              Ekle/Güncelle
            </button>
          </div>

          <div className="space-y-2">
            {rates.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
                <span>
                  {r.provider} / {r.model} — giriş ${r.input_price_per_million}/1M, çıkış $
                  {r.output_price_per_million}/1M
                </span>
                <button className="text-red-600 hover:underline" onClick={() => removeRate(r.id)}>
                  Sil
                </button>
              </div>
            ))}
            {rates.length === 0 && <p className="text-sm text-gray-500">Henüz fiyat oranı eklenmedi.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
