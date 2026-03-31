import type { ChatbotConfig } from "@company/chatbot-core";

/** 실제 LLM 호출 가능 여부 (환경 변수 + provider) */
export function canUseRealLlm(config: ChatbotConfig): boolean {
  if (process.env.CHAT_USE_PLACEHOLDER_LLM === "true") {
    return false;
  }
  if (config.llm.provider === "anthropic") {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  }
  if (config.llm.provider === "openai") {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  }
  return false;
}
