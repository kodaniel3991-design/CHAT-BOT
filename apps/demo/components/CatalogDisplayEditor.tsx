"use client";

import type { LuonServiceDefinition } from "@company/chatbot-service-kit";
import { useEffect, useState } from "react";
import type { CatalogDisplayOverrides } from "../lib/local-catalog-display";

export type CatalogDisplayEditorProps = {
  /** `luon-services.ts` 기준 원본 (id 불변) */
  baseServices: readonly LuonServiceDefinition[];
  saved: CatalogDisplayOverrides | null;
  onApply: (overrides: CatalogDisplayOverrides) => void;
  onReset: () => void;
};

type DraftRow = { label: string; description: string };

function buildDraft(
  services: readonly LuonServiceDefinition[],
  saved: CatalogDisplayOverrides | null
): Record<string, DraftRow> {
  const out: Record<string, DraftRow> = {};
  for (const s of services) {
    const o = saved?.[s.id];
    out[s.id] = {
      label: o?.label ?? s.label,
      description: o?.description ?? s.description ?? "",
    };
  }
  return out;
}

export function CatalogDisplayEditor({
  baseServices,
  saved,
  onApply,
  onReset,
}: CatalogDisplayEditorProps) {
  const [draft, setDraft] = useState<Record<string, DraftRow>>(() =>
    buildDraft(baseServices, saved)
  );

  useEffect(() => {
    setDraft(buildDraft(baseServices, saved));
  }, [baseServices, saved]);

  const update = (id: string, field: keyof DraftRow, value: string) => {
    setDraft((d) => ({
      ...d,
      [id]: { ...d[id]!, [field]: value },
    }));
  };

  return (
    <div
      className="mt-4 rounded-xl border p-4"
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
        시스템 버튼 표시 (가칭)
      </h3>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        버튼에 보이는 이름·설명만 바꿉니다. 내부 <code className="font-mono text-[10px]">id</code>·
        <code className="font-mono text-[10px]">projectId</code>는{" "}
        <code className="font-mono text-[10px]">config/luon-services.ts</code>와 같아야 합니다.{" "}
        <strong style={{ color: "var(--text-brand)" }}>적용</strong> 시 이 브라우저에 저장됩니다.
      </p>

      <div className="mt-4 space-y-4">
        {baseServices.map((s) => {
          const row = draft[s.id];
          if (!row) return null;
          return (
            <div
              key={s.id}
              className="grid gap-2 border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0 md:grid-cols-12 md:items-end"
            >
              <div className="md:col-span-3">
                <span
                  className="block font-mono text-[10px] uppercase"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  id (고정)
                </span>
                <code
                  className="mt-0.5 block text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.id}
                </code>
              </div>
              <div className="md:col-span-4">
                <label
                  className="block font-mono text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                  htmlFor={`label-${s.id}`}
                >
                  버튼 이름
                </label>
                <input
                  id={`label-${s.id}`}
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm outline-none"
                  style={{ borderColor: "var(--border-default)" }}
                  value={row.label}
                  onChange={(e) => update(s.id, "label", e.target.value)}
                  placeholder={s.label}
                />
              </div>
              <div className="md:col-span-5">
                <label
                  className="block font-mono text-[10px]"
                  style={{ color: "var(--text-tertiary)" }}
                  htmlFor={`desc-${s.id}`}
                >
                  부가 설명 (선택)
                </label>
                <input
                  id={`desc-${s.id}`}
                  className="mt-1 w-full rounded-md border px-2 py-1.5 text-sm outline-none"
                  style={{ borderColor: "var(--border-default)" }}
                  value={row.description}
                  onChange={(e) => update(s.id, "description", e.target.value)}
                  placeholder={s.description ?? ""}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--taupe-500)" }}
          onClick={() => {
            const payload: CatalogDisplayOverrides = {};
            for (const s of baseServices) {
              const row = draft[s.id];
              if (!row) continue;
              payload[s.id] = {
                label: row.label.trim() || s.label,
                description: row.description.trim() || s.description || "",
              };
            }
            onApply(payload);
          }}
        >
          표시 적용
        </button>
        <button
          type="button"
          className="rounded-lg border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
          }}
          onClick={() => {
            setDraft(buildDraft(baseServices, null));
            onReset();
          }}
        >
          표시 초기화 (카탈로그 기본)
        </button>
      </div>
    </div>
  );
}
