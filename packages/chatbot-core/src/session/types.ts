import type { ConversationConfig } from "../types";

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * 대화 히스토리 저장소 (메모리 / Redis 등 교체 가능).
 */
export interface ISessionHistoryStore {
  getMessages(
    sessionId: string,
    conversation: Pick<ConversationConfig, "sessionTimeout">
  ): Promise<HistoryMessage[]>;

  appendUser(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void>;

  appendAssistant(
    sessionId: string,
    content: string,
    conversation: Pick<ConversationConfig, "maxHistoryLength" | "sessionTimeout">
  ): Promise<void>;
}
