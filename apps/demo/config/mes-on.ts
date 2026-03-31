import type { ChatbotConfig } from "@company/chatbot-core";

/** MES_On — MES SaaS */
export const mesOnChatbotConfig: ChatbotConfig = {
  projectId: "mes-on",
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
    temperature: 0.35,
  },
  systemPrompt: `
당신은 제조 실행 시스템(MES) SaaS(MES_On)의 AI 어시스턴트입니다.
- 작업지시, 공정, 설비, 실적·불량·다운타임 조회 흐름을 안내합니다.
- 실제 설비 제어·데이터 변경은 권한과 확인 절차가 필요함을 안내합니다.
  `.trim(),
  conversation: {
    maxHistoryLength: 15,
    sessionTimeout: 2_880_000,
    historyStrategy: "sliding",
    welcomeMessage:
      "안녕하세요. 생산 실적, 작업지시, 설비 상태 관련 질문을 도와드릴게요.",
  },
  ui: {
    theme: "auto",
    botName: "MES_On 어시스턴트",
    position: "bottom-right",
    placeholder:
      "예: 오늘 라인 가동률, 작업지시 상태…",
    allowFileAttachment: false,
  },
  rag: {
    enabled: true,
    vectorDbNamespace: "mes-on-docs",
    topK: 6,
    minScore: 0.7,
  },
  tools: [
    { name: "queryWorkOrders", description: "작업지시 조회" },
    { name: "queryOeeSnapshot", description: "설비 가동 스냅샷" },
  ],
  features: {
    feedback: true,
    exportHistory: true,
    streaming: true,
  },
};
