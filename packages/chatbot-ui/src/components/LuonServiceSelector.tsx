"use client";

import type { LuonServiceCatalog } from "@company/chatbot-service-kit";
import { cn } from "../lib/cn";

export type LuonServiceSelectorProps = {
  catalog: LuonServiceCatalog;
  value: string;
  onChange: (serviceId: string) => void;
  className?: string;
  /** 버튼 래퍼 */
  buttonClassName?: string;
};

/**
 * 카탈로그에 등록된 시스템을 탭/버튼으로 전환합니다.
 */
export function LuonServiceSelector({
  catalog,
  value,
  onChange,
  className,
  buttonClassName,
}: LuonServiceSelectorProps) {
  return (
    <div className={cn("flex flex-wrap gap-3", className)} role="tablist">
      {catalog.services.map((s) => {
        const selected = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={selected}
            title={s.description ? `${s.label} — ${s.description}` : s.label}
            onClick={() => onChange(s.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98]",
              selected
                ? "bg-[var(--taupe-500)] text-[var(--text-inverse)]"
                : "border border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-primary)]",
              buttonClassName
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
