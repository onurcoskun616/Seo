"use client";

import { useEffect, useMemo, useState } from "react";

interface Prompt {
  id: string;
  prompt: string;
  active: boolean;
}

interface Result {
  id: string;
  prompt_id: string;
  provider: "openai" | "gemini";
  response_text: string;
  mentioned: boolean;
  mentioned_with_link: boolean;
  error: string | null;
  checked_at: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (ChatGPT motoru)",
  gemini: "Google Gemini"
};

export default function GeoVisibilityPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<{ openaiConfigured: boolean; geminiConfigured: boolean } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  function refresh() {
    return Promise.all([
      fetch("/api/geo-test/prompts").then((r) => r.json()),
      fetch("/api/geo-test/results").then((r) => r.json())
    ]).then(([p, r]) => {
      setPrompts(p.prompts || []);
      setResults(r.results || []);
    });
  }

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus);
    refresh().finally(() => setLoading(false));
  }, []);

  async function runTest() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/geo-test/run", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Test başarısız.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setRunning(false);
    }
  }

  async function addPrompt() {
    if (!newPrompt.trim()) return;
    const res = await fetch("/api/geo-test/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: newPrompt })
    });
    if (!res.ok) {
      alert((await res.json()).error || "Hata");
      return;
    }
    setNewPrompt("");
    refresh();
  }

  async function removePrompt(id: string) {
    if (!confirm("Bu test sorusu silinsin mi? Geçmiş sonuçları da silinecek.")) return;
    await fetch(`/api/geo-test/prompts/${id}`, { method: "DELETE" });
    refresh();
  }

  async function toggleActive(p: Prompt) {
    await fetch(`/api/geo-test/prompts/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active })
    });
    refresh();
  }

  const latestByPromptProvider = useMemo(() => {
    const map = new Map<string, Result>();
    for (const r of results) {
      const key = `${r.prompt_id}:${r.provider}`;
      if (!map.has(key)) map.set(key, r); // sonuçlar checked_at desc geldiği için ilk görülen en yeni
    }
    return map;
  }, [results]);

  const historyByPromptProvider = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const r of results) {
      const key = `${r.prompt_id}:${r.provider}`;
      const arr = map.get(key) || [];
      if (arr.length < 5) arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [results]);

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  const providers: ("openai" | "gemini")[] = [
    ...(status?.openaiConfigured ? (["openai"] as const) : []),
    ...(status?.geminiConfigured ? (["gemini"] as const) : [])
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">GEO Görünürlük Testi</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Gerçekçi arama sorularını, canlı web araması yapan yapay zekâ modellerine (OpenAI'nin
            web search aracı, Gemini'nin Google Search grounding'i) sorup yanıtta{" "}
            <strong>Topkapı Okulları</strong>'nın geçip geçmediğini ölçer. Bu, ChatGPT.com/
            gemini.google.com'daki gerçek kullanıcı deneyiminin birebir aynısı değil, yaklaşık bir
            göstergedir.
          </p>
        </div>
        <button className="btn-primary whitespace-nowrap" onClick={runTest} disabled={running || !providers.length}>
          {running ? "Test çalışıyor..." : "Şimdi Test Et"}
        </button>
      </div>

      {!providers.length && (
        <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Hiçbir sağlayıcı yapılandırılmamış. OpenAI için mevcut <code>OPENAI_API_KEY</code>{" "}
          kullanılır; Gemini için <code>GEMINI_API_KEY</code> ortam değişkenini tanımlayın (Google
          AI Studio'dan alınır).
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card space-y-3 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Test Soruları</h2>
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Örn: İstanbul'da iyi bir meslek lisesi önerir misin?"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <button className="btn-secondary whitespace-nowrap" onClick={addPrompt}>
            + Ekle
          </button>
        </div>

        <div className="space-y-4">
          {prompts.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-4">
              <div className="mb-2 flex items-start justify-between">
                <p className={`text-sm font-medium ${p.active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                  {p.prompt}
                </p>
                <div className="flex gap-3 text-xs">
                  <button className="text-gray-500 hover:underline" onClick={() => toggleActive(p)}>
                    {p.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button className="text-red-600 hover:underline" onClick={() => removePrompt(p.id)}>
                    Sil
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {providers.map((provider) => {
                  const key = `${p.id}:${provider}`;
                  const latest = latestByPromptProvider.get(key);
                  const history = historyByPromptProvider.get(key) || [];
                  return (
                    <div key={provider} className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-gray-600">
                        {PROVIDER_LABELS[provider]}
                      </p>
                      {!latest ? (
                        <p className="text-xs text-gray-400">Henüz test edilmedi.</p>
                      ) : latest.error ? (
                        <p className="text-xs text-red-500">Hata: {latest.error}</p>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                latest.mentioned
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {latest.mentioned ? "Geçti ✓" : "Geçmedi"}
                            </span>
                            {latest.mentioned_with_link && (
                              <span className="text-xs text-brand-600">link ile</span>
                            )}
                            <span className="text-xs text-gray-400">
                              {new Date(latest.checked_at).toLocaleDateString("tr-TR")}
                            </span>
                          </div>
                          <button
                            className="text-xs text-brand-600 hover:underline"
                            onClick={() => setExpanded(expanded === key ? null : key)}
                          >
                            {expanded === key ? "Yanıtı gizle" : "Yanıtı gör"}
                          </button>
                          {expanded === key && (
                            <p className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-700">
                              {latest.response_text}
                            </p>
                          )}
                          {history.length > 1 && (
                            <div className="mt-2 flex gap-1">
                              {history
                                .slice()
                                .reverse()
                                .map((h) => (
                                  <span
                                    key={h.id}
                                    title={new Date(h.checked_at).toLocaleString("tr-TR")}
                                    className={`h-2 w-2 rounded-full ${
                                      h.mentioned ? "bg-green-500" : "bg-red-400"
                                    }`}
                                  />
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {prompts.length === 0 && <p className="text-sm text-gray-500">Henüz test sorusu yok.</p>}
        </div>
      </div>
    </div>
  );
}
