import type { ChatbotConfig } from "@company/chatbot-core";
import type { LocalSystemOverrides } from "./local-system-overrides";
import type { ResolvedLuonEndpoints } from "@company/chatbot-service-kit";

export function applyLocalOverrides(
  base: ChatbotConfig,
  overrides: LocalSystemOverrides | null
): ChatbotConfig {
  if (!overrides) return base;
  const has = Object.values(overrides).some(
    (v) => v !== undefined && v !== ""
  );
  if (!has) return base;

  const ns = overrides.vectorDbNamespace?.trim();
  const rag =
    base.rag || ns
      ? {
          enabled: base.rag?.enabled ?? true,
          vectorDbNamespace: ns || base.rag?.vectorDbNamespace || "default",
          topK: base.rag?.topK ?? 6,
          minScore: base.rag?.minScore ?? 0.7,
          reranking: base.rag?.reranking,
        }
      : undefined;

  return {
    ...base,
    projectId: overrides.projectId?.trim() || base.projectId,
    ui: {
      ...base.ui,
      botName: overrides.botName?.trim() || base.ui.botName,
      theme: overrides.theme ?? base.ui.theme,
      placeholder: overrides.placeholder ?? base.ui.placeholder,
    },
    conversation: {
      ...base.conversation,
      welcomeMessage:
        overrides.welcomeMessage?.trim() ||
        base.conversation.welcomeMessage,
    },
    rag,
  };
}

export function applyPathOverrides(
  paths: ResolvedLuonEndpoints,
  overrides: LocalSystemOverrides | null
): ResolvedLuonEndpoints {
  if (!overrides) return paths;
  const chat = overrides.chatApiUrl?.trim();
  const confirm = overrides.confirmApiUrl?.trim();
  return {
    apiPath: chat || paths.apiPath,
    confirmPath: confirm || paths.confirmPath,
    historyPath: paths.historyPath,
  };
}
