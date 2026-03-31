"use client";

import type { ChatbotConfig } from "@company/chatbot-core";
import { useEffect, useState, type ReactNode } from "react";
import type { LocalSystemOverrides } from "../lib/local-system-overrides";

export type SystemInfoFormProps = {
  baseConfig: ChatbotConfig;
  savedOverrides: LocalSystemOverrides | null;
  registeredProjectIds: readonly string[];
  onApply: (overrides: LocalSystemOverrides) => void;
  onReset: () => void;
};

function buildDraft(
  base: ChatbotConfig,
  saved: LocalSystemOverrides | null
): LocalSystemOverrides {
  const merged = applySavedToDraft(base, saved);
  return merged;
}

function applySavedToDraft(
  base: ChatbotConfig,
  saved: LocalSystemOverrides | null
): LocalSystemOverrides {
  return {
    projectId: saved?.projectId ?? base.projectId,
    botName: saved?.botName ?? base.ui.botName,
    theme: saved?.theme ?? base.ui.theme,
    placeholder: saved?.placeholder ?? base.ui.placeholder ?? "",
    welcomeMessage: saved?.welcomeMessage ?? base.conversation.welcomeMessage ?? "",
    vectorDbNamespace:
      saved?.vectorDbNamespace ?? base.rag?.vectorDbNamespace ?? "",
    chatApiUrl: saved?.chatApiUrl ?? "",
    confirmApiUrl: saved?.confirmApiUrl ?? "",
  };
}

export function SystemInfoForm({
  baseConfig,
  savedOverrides,
  registeredProjectIds,
  onApply,
  onReset,
}: SystemInfoFormProps) {
  const [draft, setDraft] = useState<LocalSystemOverrides>(() =>
    buildDraft(baseConfig, savedOverrides)
  );

  /** 서버 `GET /api/config/projects`와 동기화 (빌드된 카탈로그 기준) */
  const [serverProjectIds, setServerProjectIds] = useState<string[] | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/config/projects")
      .then((res) => res.json() as Promise<{ projects?: { projectId: string }[] }>)
      .then((data) => {
        if (cancelled) return;
        const ids =
          data.projects?.map((p) => p.projectId).filter(Boolean) ?? [];
        setServerProjectIds(ids);
      })
      .catch(() => {
        if (!cancelled) setServerProjectIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraft(buildDraft(baseConfig, savedOverrides));
  }, [baseConfig, savedOverrides]);

  const idsForValidation =
    serverProjectIds && serverProjectIds.length > 0
      ? serverProjectIds
      : [...registeredProjectIds];

  const projectKnown = idsForValidation.includes(
    (draft.projectId ?? "").trim()
  );

  const field = (
    label: string,
    id: keyof LocalSystemOverrides,
    el: ReactNode
  ) => (
    <div key={id}>
      <label
        htmlFor={id}
        className="mb-1 block font-mono text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </label>
      {el}
    </div>
  );

  return (
    <div
      className="mt-6 rounded-xl border p-4"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-page)",
      }}
    >
      <h3
        className="text-sm font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--text-primary)",
        }}
      >
        시스템 정보 입력
      </h3>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        카탈로그 선택값을 기준으로 아래를 바꿔 적용합니다.{" "}
        <strong style={{ color: "var(--text-brand)" }}>적용하기</strong> 시 이 브라우저에
        저장됩니다.{" "}
        <code className="rounded bg-[var(--bg-subtle)] px-1 font-mono text-[10px]">
          GET /api/config/projects
        </code>
        로 등록된 <code className="font-mono text-[10px]">projectId</code>와 맞춥니다.
      </p>

      {serverProjectIds && serverProjectIds.length > 0 && (
        <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
          서버 등록 projectId:{" "}
          <span className="font-mono text-[var(--text-secondary)]">
            {serverProjectIds.join(", ")}
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {field(
          "projectId (API 요청에 사용)",
          "projectId",
          <input
            id="projectId"
            className="w-full rounded-md border px-3 py-2 text-sm font-mono outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.projectId ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, projectId: e.target.value }))
            }
            placeholder="esg-on"
          />
        )}
        {field(
          "봇 이름 (botName)",
          "botName",
          <input
            id="botName"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.botName ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, botName: e.target.value }))
            }
          />
        )}
        {field(
          "테마",
          "theme",
          <select
            id="theme"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.theme ?? "light"}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                theme: e.target.value as LocalSystemOverrides["theme"],
              }))
            }
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
            <option value="auto">auto</option>
          </select>
        )}
        {field(
          "입력창 placeholder",
          "placeholder",
          <input
            id="placeholder"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.placeholder ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, placeholder: e.target.value }))
            }
          />
        )}
        <div className="md:col-span-2">
          {field(
            "환영 메시지 (welcomeMessage)",
            "welcomeMessage",
            <textarea
              id="welcomeMessage"
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border-default)" }}
              value={draft.welcomeMessage ?? ""}
              onChange={(e) =>
                setDraft((d) => ({ ...d, welcomeMessage: e.target.value }))
              }
            />
          )}
        </div>
        {field(
          "RAG namespace (표시·설정용)",
          "vectorDbNamespace",
          <input
            id="vectorDbNamespace"
            className="w-full rounded-md border px-3 py-2 text-sm font-mono outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.vectorDbNamespace ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, vectorDbNamespace: e.target.value }))
            }
            placeholder="esg-on-docs"
          />
        )}
        {field(
          "chat API URL (비우면 카탈로그/환경 기본값)",
          "chatApiUrl",
          <input
            id="chatApiUrl"
            className="w-full rounded-md border px-3 py-2 text-xs font-mono outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.chatApiUrl ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, chatApiUrl: e.target.value }))
            }
            placeholder="/api/chat 또는 https://..."
          />
        )}
        {field(
          "confirm API URL (선택)",
          "confirmApiUrl",
          <input
            id="confirmApiUrl"
            className="w-full rounded-md border px-3 py-2 text-xs font-mono outline-none"
            style={{ borderColor: "var(--border-default)" }}
            value={draft.confirmApiUrl ?? ""}
            onChange={(e) =>
              setDraft((d) => ({ ...d, confirmApiUrl: e.target.value }))
            }
            placeholder="/api/chat/confirm"
          />
        )}
      </div>

      {!projectKnown && (draft.projectId ?? "").trim().length > 0 && (
        <p
          className="mt-4 rounded-md border px-3 py-2 text-xs"
          style={{
            borderColor: "var(--border-accent)",
            background: "var(--green-50)",
            color: "var(--green-800)",
          }}
        >
          이 데모 서버에 등록되지 않은 <code className="font-mono">projectId</code>입니다.{" "}
          <code className="font-mono">/api/chat</code>가{" "}
          <code className="font-mono">UNKNOWN_PROJECT</code>로 실패할 수 있습니다. 서버{" "}
          <code className="font-mono">config-registry</code>에 추가하세요.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--taupe-500)" }}
          onClick={() => {
            const payload: LocalSystemOverrides = {
              ...draft,
              chatApiUrl: draft.chatApiUrl?.trim() || undefined,
              confirmApiUrl: draft.confirmApiUrl?.trim() || undefined,
            };
            onApply(payload);
          }}
        >
          적용하기
        </button>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
          onClick={() => {
            setDraft(buildDraft(baseConfig, null));
            onReset();
          }}
        >
          초기화 (카탈로그만 사용)
        </button>
      </div>
    </div>
  );
}
