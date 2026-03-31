"use client";

import type { LuonServiceCatalog } from "@company/chatbot-service-kit";
import { resolveLuonEndpoints } from "@company/chatbot-service-kit";
import { useMemo, useState } from "react";

export type UseLuonServiceBindingOptions = {
  /** 최초 선택 id — 없으면 카탈로그 첫 항목 */
  initialId?: string;
  /**
   * 모든 상대 API 경로 앞에 붙일 베이스 (예: `process.env.NEXT_PUBLIC_LUON_CHAT_API_BASE`).
   * 시스템별로 `LuonServiceDefinition.endpoints`에 전체 URL을 넣으면 이 값은 해당 항목에 적용되지 않습니다.
   */
  globalBaseUrl?: string;
};

/**
 * 서비스 카탈로그에서 선택된 시스템에 맞춰 `config`와 API 경로를 계산합니다.
 */
export function useLuonServiceBinding(
  catalog: LuonServiceCatalog,
  options?: UseLuonServiceBindingOptions
) {
  const firstId = catalog.ids[0] ?? "";
  const [selectedId, setSelectedId] = useState(
    () => options?.initialId ?? firstId
  );

  const active = catalog.getById(selectedId);

  const paths = useMemo(() => {
    if (!active) {
      return {
        apiPath: "/api/chat",
        confirmPath: "/api/chat/confirm",
        historyPath: "/api/chat/history",
      };
    }
    return resolveLuonEndpoints(active, {
      globalBaseUrl: options?.globalBaseUrl,
    });
  }, [active, options?.globalBaseUrl]);

  const config = active?.config ?? catalog.services[0]?.config;

  return {
    selectedId,
    setSelectedId,
    active,
    config,
    paths,
  };
}
