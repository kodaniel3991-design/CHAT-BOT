import type { ChatbotConfig } from "@company/chatbot-core";

/** ESG_On — ESG 배출량 산출 SaaS */
export const esgOnChatbotConfig: ChatbotConfig = {
  projectId: "esg-on",
  llm: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
    temperature: 0.3,
  },
  systemPrompt: `
당신은 ESG 배출량 산출 SaaS(ESG_On)의 AI 어시스턴트입니다.
- Scope 1/2/3, 활동자료, 배출계수, 보고서 항목에 대해 안내합니다.
- 법규·고객사 내부 기준은 확정되지 않은 경우 단정하지 말고 확인 질문을 합니다.
  `.trim(),
  conversation: {
    maxHistoryLength: 12,
    sessionTimeout: 1_800_000,
    historyStrategy: "sliding",
    welcomeMessage:
      "안녕하세요. ESG 배출량·활동자료·보고 항목 관련 질문을 도와드릴게요.",
  },
  ui: {
    theme: "light",
    botName: "ESG_On 어시스턴트",
    position: "bottom-right",
    placeholder:
      "예: Scope 2 배출량 산출 방식, 활동자료 템플릿…",
    allowFileAttachment: true,
  },
  rag: {
    enabled: true,
    vectorDbNamespace: "esg-on-docs",
    topK: 6,
    minScore: 0.72,
  },
  tools: [
    { name: "lookupEmissionFactor", description: "배출계수 조회" },
    { name: "exportReportDraft", description: "보고서 초안 내보내기" },
  ],
  features: {
    feedback: true,
    exportHistory: true,
    fileAttachment: true,
    streaming: true,
  },
};
