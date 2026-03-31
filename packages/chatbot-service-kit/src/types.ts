import type { ChatbotConfig } from "@company/chatbot-core";

/**
 * 채팅 API 경로 — 비우면 동일 오리진 기본값(`/api/chat` 등).
 * 시스템마다 다른 호스트를 쓰려면 전체 URL을 넣습니다.
 */
export type LuonServiceEndpoints = {
  chat?: string;
  confirm?: string;
  history?: string;
};

/**
 * 하나의 LUON 연동 서비스(예: ESG_On, MES_On).
 * `id`는 `config.projectId`와 같게 두는 것을 권장합니다.
 */
export type LuonServiceDefinition = {
  id: string;
  label: string;
  description?: string;
  config: ChatbotConfig;
  endpoints?: LuonServiceEndpoints;
};

export type ResolvedLuonEndpoints = {
  apiPath: string;
  confirmPath: string;
  historyPath: string;
};

export type LuonServiceCatalog = {
  readonly services: readonly LuonServiceDefinition[];
  getById: (id: string) => LuonServiceDefinition | undefined;
  readonly ids: readonly string[];
};
