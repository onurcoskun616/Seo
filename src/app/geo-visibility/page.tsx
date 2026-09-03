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

interface RunSummary {
  runId: string;
  checkedAt: string;
  total: number;
  mentionedCount: number;
  shareOfVoicePercent: number;
}

interface DiagnosticCheck {
  id: string;
  label: string;
  status: "ok" | "warn" | "fail" | "unknown";
  detail: string;
}

interface DiagnosticsReport {
  siteUrl: string;
  checkedAt: string;
  checks: DiagnosticCheck[];
}

interface Briefing {
  id: string;
  share_of_voice_percent: number | null;
  previous_share_of_voice_percent: number | null;
  message_text: string | null;
  slack_sent: boolean;
  created_at: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (ChatGPT motoru)",
  gemini: "Google Gemini"
};

const DIAG_STATUS_COLORS: Record<string, string> = {
  ok: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  fail: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-600"
};

const DIAG_STATUS_ICON: Record<string, string> = { ok: "✓", warn: "!", fail: "✗", unknown: "?" };

type Tab = "olc" | "teshis" | "brifing";

export default function GeoVisibilityPage() {
  const [tab, setTab] = useState<Tab>("olc");
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [status, setStatus] = useState<{ openaiConfigured: boolean; geminiConfigured: boolean } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState<string | null>(null);

  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [briefingRunning, setBriefingRunning] = useState(false);
  const [briefingError, setBriefingError] = useState<string | null>(null);

  function refresh() {
    return Promise.all([
      fetch("/api/geo-test/prompts").then((r) => r.json()),
      fetch("/api/geo-test/results").then((r) => r.json()),
      fetch("/api/geo-test/runs").then((r) => r.json())
    ]).then(([p, r, ru]) => {
      setPrompts(p.prompts || []);
      setResults(r.results || []);
      setRuns(ru.runs || []);
    });
  }

  useEffect(() => {
    fetch("/api/settings/status")
      .then((r) => r.json())
      .then(setStatus);
    refresh().finally(() => setLoading(false));
  }, []);

  function loadDiagnostics() {
    setDiagLoading(true);
    fetch("/api/diagnostics")
      .then((r) => r.json())
      .then((d) => setDiagnostics(d.report))
      .finally(() => setDiagLoading(false));
  }

  function loadBriefings() {
    return fetch("/api/briefing/history")
      .then((r) => r.json())
      .then((d) => setBriefings(d.briefings || []));
  }

  useEffect(() => {
    if (tab === "teshis" && !diagnostics) loadDiagnostics();
    if (tab === "brifing") loadBriefings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  async function runBriefing() {
    setBriefingRunning(true);
    setBriefingError(null);
    try {
      const res = await fetch("/api/briefing/run", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Brifing oluşturulamadı.");
      await Promise.all([loadBriefings(), refresh()]);
    } catch (err) {
      setBriefingError(err instanceof Error ? err.message : "Bilinmeyen hata.");
    } finally {
      setBriefingRunning(false);
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

  async function addToCalendar(prompt: Prompt) {
    setAddingToCalendar(prompt.id);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `GEO: "${prompt.prompt}" sorusuna cevap`,
          planned_date: new Date().toISOString().slice(0, 10),
          article_type: "education_approach",
          audience: "genel",
          notes: `GEO Görünürlük Testi'nde bu soru için Topkapı Okulları yapay zekâ yanıtlarında geçmedi: "${prompt.prompt}". Bu konuyu doğrudan ele alan bir makale yazın.`
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Takvime eklenemedi.");
      alert("Editöryal Takvim'e eklendi.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Hata");
    } finally {
      setAddingToCalendar(null);
    }
  }

  const latestByPromptProvider = useMemo(() => {
    const map = new Map<string, Result>();
    for (const r of results) {
      const key = `${r.prompt_id}:${r.provider}`;
      if (!map.has(key)) map.set(key, r);
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

  const providers: ("openai" | "gemini")[] = [
    ...(status?.openaiConfigured ? (["openai"] as const) : []),
    ...(status?.geminiConfigured ? (["gemini"] as const) : [])
  ];

  function promptFailingLatest(promptId: string): boolean {
    return providers.some((provider) => {
      const r = latestByPromptProvider.get(`${promptId}:${provider}`);
      return r && !r.error && !r.mentioned;
    });
  }

  const latestRun = runs[0];

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">GEO Döngüsü</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Ölç → Teşhis et → Reçete yaz → Yeniden ölç. Yapay zekâ arama motorlarının Topkapı
          Okulları'nı önerip önermediğini ölçer, nedenini teşhis eder, eksik konuları takvime
          önerir.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            ["olc", "1. Ölç"],
            ["teshis", "2. Teşhis"],
            ["brifing", "3-4. Reçete & Brifing"]
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

      {tab === "olc" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="card flex items-center gap-6 p-5">
              <div>
                <p className="text-xs text-gray-500">Görünürlük Payı (son ölçüm)</p>
                <p className="text-3xl font-bold text-gray-900">
                  {latestRun ? `%${latestRun.shareOfVoicePercent}` : "—"}
                </p>
                {latestRun && (
                  <p className="text-xs text-gray-400">
                    {latestRun.mentionedCount}/{latestRun.total} test geçti ·{" "}
                    {new Date(latestRun.checkedAt).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
              {runs.length > 1 && (
                <div className="flex items-end gap-1">
                  {runs
                    .slice()
                    .reverse()
                    .map((r) => (
                      <div
                        key={r.runId}
                        title={`%${r.shareOfVoicePercent} — ${new Date(r.checkedAt).toLocaleDateString("tr-TR")}`}
                        className="w-2 rounded-t bg-brand-400"
                        style={{ height: `${Math.max(4, r.shareOfVoicePercent / 2)}px` }}
                      />
                    ))}
                </div>
              )}
            </div>
            <button className="btn-primary whitespace-nowrap" onClick={runTest} disabled={running || !providers.length}>
              {running ? "Test çalışıyor..." : "Şimdi Test Et"}
            </button>
          </div>

          {!providers.length && (
            <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Hiçbir sağlayıcı yapılandırılmamış. OpenAI için mevcut <code>OPENAI_API_KEY</code>{" "}
              kullanılır; Gemini için <code>GEMINI_API_KEY</code> ortam değişkenini tanımlayın.
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="card space-y-3 p-6">
            <h2 className="text-sm font-semibold text-gray-800">Test Soruları</h2>
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
                      {promptFailingLatest(p.id) && (
                        <button
                          className="text-amber-600 hover:underline disabled:text-gray-300"
                          onClick={() => addToCalendar(p)}
                          disabled={addingToCalendar === p.id}
                        >
                          {addingToCalendar === p.id ? "Ekleniyor..." : "Reçete: Takvime Ekle"}
                        </button>
                      )}
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
      )}

      {tab === "teshis" && (
        <div className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Teşhis: Neden önerilmiyor olabilirsin?</h2>
              {diagnostics && (
                <p className="text-xs text-gray-400">
                  {diagnostics.siteUrl} · {new Date(diagnostics.checkedAt).toLocaleString("tr-TR")}
                </p>
              )}
            </div>
            <button className="btn-secondary" onClick={loadDiagnostics} disabled={diagLoading}>
              {diagLoading ? "Kontrol ediliyor..." : "Yeniden Kontrol Et"}
            </button>
          </div>

          {!diagnostics && diagLoading && <p className="text-sm text-gray-500">Kontrol ediliyor...</p>}

          {diagnostics && (
            <div className="space-y-3">
              {diagnostics.checks.map((c) => (
                <div key={c.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${DIAG_STATUS_COLORS[c.status]}`}
                  >
                    {DIAG_STATUS_ICON[c.status]}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "brifing" && (
        <div className="space-y-4">
          <div className="card space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">3-4. Reçete & Pazartesi Brifingi</h2>
                <p className="text-xs text-gray-500">
                  Yeniden ölçüm + teşhis + trend'i tek seferde çalıştırıp Slack'e özet gönderir.
                  Otomatik haftalık çalışması için repodaki{" "}
                  <code>.github/workflows/monday-briefing.yml</code> GitHub Actions iş akışını
                  (ücretsiz) etkinleştirin — <code>CRON_SECRET</code> ve <code>APP_URL</code>{" "}
                  değerlerini repo Settings → Secrets → Actions'a ekleyin.
                </p>
              </div>
              <button className="btn-primary whitespace-nowrap" onClick={runBriefing} disabled={briefingRunning}>
                {briefingRunning ? "Oluşturuluyor..." : "Şimdi Oluştur ve Gönder"}
              </button>
            </div>
            {briefingError && <p className="text-sm text-red-600">{briefingError}</p>}
          </div>

          <div className="space-y-3">
            {briefings.map((b) => (
              <div key={b.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">
                    %{b.share_of_voice_percent ?? "—"} Görünürlük Payı
                    {b.previous_share_of_voice_percent != null &&
                      b.share_of_voice_percent != null && (
                        <span className="ml-2 text-xs text-gray-400">
                          (önceki: %{b.previous_share_of_voice_percent})
                        </span>
                      )}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        b.slack_sent ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {b.slack_sent ? "Slack'e gönderildi" : "Slack gönderilmedi"}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(b.created_at).toLocaleString("tr-TR")}
                    </span>
                  </div>
                </div>
                {b.message_text && (
                  <pre className="whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
                    {b.message_text}
                  </pre>
                )}
              </div>
            ))}
            {briefings.length === 0 && (
              <p className="text-sm text-gray-500">Henüz brifing oluşturulmadı.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
