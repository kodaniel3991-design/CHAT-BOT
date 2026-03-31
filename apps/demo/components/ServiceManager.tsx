"use client";

import { useCallback, useEffect, useState } from "react";

/* ─── Types (서버 ServiceEntry와 동일 구조) ─── */
type ServiceEntry = {
  id: string;
  label: string;
  description?: string;
  config: {
    projectId: string;
    llm: { provider: "anthropic" | "openai"; model: string; maxTokens: number; temperature: number };
    systemPrompt: string;
    conversation: {
      maxHistoryLength: number;
      sessionTimeout: number;
      historyStrategy: "sliding" | "summarize";
      welcomeMessage?: string;
    };
    ui: {
      theme: "light" | "dark" | "auto";
      botName: string;
      position: "bottom-right" | "bottom-left";
      primaryColor?: string;
      placeholder?: string;
      allowFileAttachment?: boolean;
    };
    rag?: {
      enabled: boolean;
      vectorDbNamespace: string;
      topK: number;
      minScore: number;
    };
    tools?: { name: string; description: string }[];
    features?: {
      feedback?: boolean;
      exportHistory?: boolean;
      fileAttachment?: boolean;
      streaming?: boolean;
    };
  };
};

function emptyEntry(): ServiceEntry {
  return {
    id: "",
    label: "",
    description: "",
    config: {
      projectId: "",
      llm: { provider: "anthropic", model: "claude-sonnet-4-20250514", maxTokens: 2048, temperature: 0.3 },
      systemPrompt: "",
      conversation: {
        maxHistoryLength: 12,
        sessionTimeout: 1_800_000,
        historyStrategy: "sliding",
        welcomeMessage: "",
      },
      ui: {
        theme: "auto",
        botName: "",
        position: "bottom-right",
        placeholder: "",
        allowFileAttachment: false,
      },
      features: { feedback: true, exportHistory: true, streaming: true },
    },
  };
}

type Mode = "list" | "create" | "edit";

export type ServiceManagerProps = {
  onServicesChanged?: () => void;
};

export function ServiceManager({ onServicesChanged }: ServiceManagerProps) {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ServiceEntry>(emptyEntry());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/services");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as { services: ServiceEntry[] };
      setServices(data.services);
    } catch {
      setError("서비스 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  /* ─── Actions ─── */
  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const action = mode === "create" ? "create" : "update";
      const body =
        action === "create"
          ? { action, entry: draft }
          : { action, id: editId, entry: draft };

      const res = await fetch("/api/config/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "DUPLICATE_ID" ? "이미 존재하는 ID입니다." : data.error ?? "저장 실패");
        return;
      }
      await fetchServices();
      onServicesChanged?.();
      setMode("list");
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`"${id}" 서비스를 삭제하시겠습니까?`)) return;
    setError(null);
    try {
      const res = await fetch("/api/config/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "삭제 실패");
        return;
      }
      await fetchServices();
      onServicesChanged?.();
    } catch {
      setError("삭제 중 오류가 발생했습니다.");
    }
  }

  function startEdit(entry: ServiceEntry) {
    setDraft(structuredClone(entry));
    setEditId(entry.id);
    setMode("edit");
    setError(null);
  }

  function startCreate() {
    setDraft(emptyEntry());
    setEditId(null);
    setMode("create");
    setError(null);
  }

  /* ─── Field helpers ─── */
  const inputCls =
    "w-full rounded-md border px-3 py-2 text-sm outline-none transition-shadow focus:ring-1";
  const labelCls = "mb-1 block text-xs font-semibold";

  function updateDraft<K extends keyof ServiceEntry>(key: K, val: ServiceEntry[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function updateConfig<K extends keyof ServiceEntry["config"]>(
    key: K,
    val: ServiceEntry["config"][K],
  ) {
    setDraft((d) => ({ ...d, config: { ...d.config, [key]: val } }));
  }

  function updateUi<K extends keyof ServiceEntry["config"]["ui"]>(
    key: K,
    val: ServiceEntry["config"]["ui"][K],
  ) {
    setDraft((d) => ({
      ...d,
      config: { ...d.config, ui: { ...d.config.ui, [key]: val } },
    }));
  }

  function updateConv<K extends keyof ServiceEntry["config"]["conversation"]>(
    key: K,
    val: ServiceEntry["config"]["conversation"][K],
  ) {
    setDraft((d) => ({
      ...d,
      config: { ...d.config, conversation: { ...d.config.conversation, [key]: val } },
    }));
  }

  function updateLlm<K extends keyof ServiceEntry["config"]["llm"]>(
    key: K,
    val: ServiceEntry["config"]["llm"][K],
  ) {
    setDraft((d) => ({
      ...d,
      config: { ...d.config, llm: { ...d.config.llm, [key]: val } },
    }));
  }

  /* ─── Render: List ─── */
  if (mode === "list") {
    return (
      <div className="mt-4">
        {error && (
          <p className="mb-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}>
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>불러오는 중...</p>
        ) : services.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>등록된 서비스가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
                style={{ borderColor: "var(--border-subtle)", background: "var(--bg-page)" }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {s.label}
                    <span className="ml-2 font-mono text-xs font-normal" style={{ color: "var(--text-tertiary)" }}>
                      {s.id}
                    </span>
                  </p>
                  {s.description && (
                    <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>{s.description}</p>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(s)}
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(s.id)}
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold"
                    style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={startCreate}
          className="mt-4 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.98]"
          style={{ background: "var(--taupe-500)" }}
        >
          + 새 서비스 등록
        </button>
      </div>
    );
  }

  /* ─── Render: Create / Edit form ─── */
  const isCreate = mode === "create";

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {isCreate ? "새 서비스 등록" : `"${editId}" 수정`}
        </h3>
        <button
          type="button"
          onClick={() => { setMode("list"); setError(null); }}
          className="text-xs font-semibold"
          style={{ color: "var(--text-tertiary)" }}
        >
          취소
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: "var(--color-error)", color: "var(--color-error)" }}>
          {error}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {/* ── 기본 정보 ── */}
        <fieldset
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <legend className="px-1 text-xs font-semibold" style={{ color: "var(--text-brand)" }}>
            기본 정보
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>서비스 ID</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.id}
                onChange={(e) => {
                  const v = e.target.value;
                  updateDraft("id", v);
                  updateConfig("projectId", v);
                }}
                placeholder="my-service"
                disabled={!isCreate}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>표시 이름</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.label}
                onChange={(e) => updateDraft("label", e.target.value)}
                placeholder="My Service"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>설명 (선택)</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.description ?? ""}
                onChange={(e) => updateDraft("description", e.target.value)}
                placeholder="서비스에 대한 간단한 설명"
              />
            </div>
          </div>
        </fieldset>

        {/* ── 챗봇 UI ── */}
        <fieldset
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <legend className="px-1 text-xs font-semibold" style={{ color: "var(--text-brand)" }}>
            챗봇 UI
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>봇 이름</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.ui.botName}
                onChange={(e) => updateUi("botName", e.target.value)}
                placeholder="어시스턴트"
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>테마</label>
              <select
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.ui.theme}
                onChange={(e) => updateUi("theme", e.target.value as "light" | "dark" | "auto")}
              >
                <option value="auto">Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>입력창 placeholder</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.ui.placeholder ?? ""}
                onChange={(e) => updateUi("placeholder", e.target.value)}
                placeholder="질문을 입력하세요..."
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>위치</label>
              <select
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.ui.position}
                onChange={(e) => updateUi("position", e.target.value as "bottom-right" | "bottom-left")}
              >
                <option value="bottom-right">우하단</option>
                <option value="bottom-left">좌하단</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>환영 메시지</label>
              <textarea
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                rows={2}
                value={draft.config.conversation.welcomeMessage ?? ""}
                onChange={(e) => updateConv("welcomeMessage", e.target.value)}
                placeholder="안녕하세요! 무엇을 도와드릴까요?"
              />
            </div>
          </div>
        </fieldset>

        {/* ── LLM ── */}
        <fieldset
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <legend className="px-1 text-xs font-semibold" style={{ color: "var(--text-brand)" }}>
            LLM 설정
          </legend>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>프로바이더</label>
              <select
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.llm.provider}
                onChange={(e) => updateLlm("provider", e.target.value as "anthropic" | "openai")}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
              </select>
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>모델</label>
              <input
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.llm.model}
                onChange={(e) => updateLlm("model", e.target.value)}
                placeholder="claude-sonnet-4-20250514"
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>Max Tokens</label>
              <input
                type="number"
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.llm.maxTokens}
                onChange={(e) => updateLlm("maxTokens", Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: "var(--text-tertiary)" }}>Temperature</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="2"
                className={inputCls}
                style={{ borderColor: "var(--border-default)" }}
                value={draft.config.llm.temperature}
                onChange={(e) => updateLlm("temperature", Number(e.target.value))}
              />
            </div>
          </div>
        </fieldset>

        {/* ── 시스템 프롬프트 ── */}
        <fieldset
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <legend className="px-1 text-xs font-semibold" style={{ color: "var(--text-brand)" }}>
            시스템 프롬프트
          </legend>
          <textarea
            className={inputCls}
            style={{ borderColor: "var(--border-default)" }}
            rows={4}
            value={draft.config.systemPrompt}
            onChange={(e) => updateConfig("systemPrompt", e.target.value)}
            placeholder="당신은 ...의 AI 어시스턴트입니다."
          />
        </fieldset>
      </div>

      {/* ── Actions ── */}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          disabled={saving || !draft.id || !draft.label || !draft.config.ui.botName || !draft.config.systemPrompt}
          onClick={() => void handleSave()}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--taupe-500)" }}
        >
          {saving ? "저장 중..." : isCreate ? "등록" : "저장"}
        </button>
        <button
          type="button"
          onClick={() => { setMode("list"); setError(null); }}
          className="rounded-lg border px-5 py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
        >
          취소
        </button>
      </div>
    </div>
  );
}
