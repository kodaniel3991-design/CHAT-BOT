import { describe, expect, it } from "vitest";
import type { LuonServiceDefinition } from "./types";
import { joinApiUrl, resolveLuonEndpoints } from "./endpoints";

const minimalConfig = (projectId: string) =>
  ({
    projectId,
    llm: {
      provider: "anthropic" as const,
      model: "claude",
      maxTokens: 1024,
      temperature: 0.3,
    },
    systemPrompt: "x",
    conversation: {
      maxHistoryLength: 10,
      sessionTimeout: 3600_000,
      historyStrategy: "sliding" as const,
      welcomeMessage: "hi",
    },
    ui: {
      theme: "light" as const,
      botName: "Bot",
      position: "bottom-right" as const,
      placeholder: "…",
      allowFileAttachment: false,
    },
  }) satisfies import("@company/chatbot-core").ChatbotConfig;

describe("joinApiUrl", () => {
  it("returns path when no base", () => {
    expect(joinApiUrl(undefined, "/api/chat")).toBe("/api/chat");
  });

  it("joins base and path", () => {
    expect(joinApiUrl("https://api.example.com", "/api/chat")).toBe(
      "https://api.example.com/api/chat"
    );
  });

  it("keeps absolute URLs", () => {
    expect(
      joinApiUrl("https://wrong.com", "https://esg.example.com/api/chat")
    ).toBe("https://esg.example.com/api/chat");
  });
});

describe("resolveLuonEndpoints", () => {
  const def: LuonServiceDefinition = {
    id: "esg-on",
    label: "ESG",
    config: minimalConfig("esg-on"),
  };

  it("uses defaults", () => {
    const r = resolveLuonEndpoints(def);
    expect(r.apiPath).toBe("/api/chat");
    expect(r.confirmPath).toBe("/api/chat/confirm");
  });

  it("applies globalBaseUrl", () => {
    const r = resolveLuonEndpoints(def, {
      globalBaseUrl: "https://chat.company.com",
    });
    expect(r.apiPath).toBe("https://chat.company.com/api/chat");
  });

  it("respects per-service absolute chat URL", () => {
    const d: LuonServiceDefinition = {
      ...def,
      endpoints: { chat: "https://esg-api.company.com/v1/chat" },
    };
    const r = resolveLuonEndpoints(d, {
      globalBaseUrl: "https://ignored.com",
    });
    expect(r.apiPath).toBe("https://esg-api.company.com/v1/chat");
  });
});
