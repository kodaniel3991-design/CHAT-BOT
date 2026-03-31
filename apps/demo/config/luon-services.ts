/** 서버(`config-registry` → API)에서도 쓰이므로 `@company/chatbot-ui`가 아닌 이 패키지만 import (React 훅 번들 방지). */
import { createLuonServiceCatalog } from "@company/chatbot-service-kit";
import { esgOnChatbotConfig } from "./esg-on";
import { mesOnChatbotConfig } from "./mes-on";

/**
 * 여기에 서비스만 추가하면 UI 선택·API `projectId`·백엔드 레지스트리가 함께 맞춰집니다.
 *
 * - 다른 호스트 API: `endpoints: { chat: "https://..." }` 또는
 * - 공통 베이스만: 앱에서 `NEXT_PUBLIC_LUON_CHAT_API_BASE` + 상대 경로
 */
export const luonServiceCatalog = createLuonServiceCatalog([
  {
    id: "esg-on",
    label: "ESG_On",
    description: "ESG 배출량 산출",
    config: esgOnChatbotConfig,
  },
  {
    id: "mes-on",
    label: "MES_On",
    description: "제조 실행",
    config: mesOnChatbotConfig,
  },
]);
