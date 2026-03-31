export interface LLMConfig {
  provider: "anthropic" | "openai";
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ConversationConfig {
  maxHistoryLength: number;
  sessionTimeout: number;
  historyStrategy: "sliding" | "summarize";
  welcomeMessage?: string;
}

export interface UIConfig {
  theme: "light" | "dark" | "auto";
  primaryColor?: string;
  botName: string;
  botAvatarUrl?: string;
  position: "bottom-right" | "bottom-left";
  placeholder?: string;
  allowFileAttachment?: boolean;
}

export interface RAGConfig {
  enabled: boolean;
  vectorDbNamespace: string;
  topK: number;
  minScore: number;
  reranking?: boolean;
}

export interface FeatureFlags {
  feedback?: boolean;
  exportHistory?: boolean;
  fileAttachment?: boolean;
  voiceInput?: boolean;
  streaming?: boolean;
}

export type ChatMessageRole = "user" | "assistant" | "tool";

export type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  toolName?: string;
  toolResult?: unknown;
  isStreaming?: boolean;
  timestamp: number;
  feedback?: "up" | "down";
};

export type ChatErrorCode =
  | "LLM_ERROR"
  | "TOOL_ERROR"
  | "TOOL_NOT_ALLOWED"
  | "RAG_ERROR"
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "AUTH_ERROR";

export type ChatError = {
  code: ChatErrorCode;
  message: string;
  retryable: boolean;
};

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Tool 실행 대상 API endpoint URL */
  endpoint?: string;
  /** HTTP 메서드 (기본: POST) */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** LLM에게 전달할 파라미터 스키마 (JSON Schema 형태) */
  parameters?: {
    type: "object";
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
  /** true면 실행 전 사용자 확인 필요 */
  confirmRequired?: boolean;
}

export interface ChatbotConfig {
  projectId: string;
  llm: LLMConfig;
  systemPrompt: string;
  conversation: ConversationConfig;
  ui: UIConfig;
  rag?: RAGConfig;
  tools?: ToolDefinition[];
  features?: FeatureFlags;
}

/**
 * 외부 서비스에서 ChatWidget에 전달하는 경량 설정.
 * 서버 전용 필드(llm, systemPrompt 등)가 필요 없으며,
 * projectId와 UI 관련 설정만 포함합니다.
 */
export interface ChatWidgetConfig {
  projectId: string;
  ui: Partial<UIConfig> & Pick<UIConfig, "botName">;
  features?: FeatureFlags;
  conversation?: Pick<ConversationConfig, "welcomeMessage">;
}
