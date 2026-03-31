import type { ToolDefinition } from "@company/chatbot-core";
import { logChat } from "./logger";

export type ToolCallRequest = {
  toolName: string;
  args: Record<string, unknown>;
};

export type ToolCallResult = {
  ok: boolean;
  toolName: string;
  result?: unknown;
  error?: string;
};

/**
 * Tool 정의에서 해당 tool을 찾아 endpoint로 HTTP 요청을 보내고 결과를 반환합니다.
 */
export async function executeToolCall(
  tools: ToolDefinition[],
  call: ToolCallRequest,
  signal?: AbortSignal,
): Promise<ToolCallResult> {
  const tool = tools.find((t) => t.name === call.toolName);
  if (!tool) {
    return { ok: false, toolName: call.toolName, error: `Unknown tool: ${call.toolName}` };
  }

  if (!tool.endpoint) {
    return {
      ok: false,
      toolName: call.toolName,
      error: `Tool "${call.toolName}" has no endpoint configured`,
    };
  }

  const method = tool.method ?? "POST";
  const startMs = Date.now();

  try {
    let url = tool.endpoint;
    const fetchOpts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
      signal,
    };

    if (method === "GET") {
      // GET: args를 query string으로 변환
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(call.args)) {
        params.set(k, String(v));
      }
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}${params.toString()}`;
    } else {
      // POST/PUT/PATCH/DELETE: args를 body로 전달
      fetchOpts.body = JSON.stringify(call.args);
    }

    const res = await fetch(url, fetchOpts);
    const elapsed = Date.now() - startMs;

    let data: unknown;
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    logChat("info", "tool_executed", {
      toolName: call.toolName,
      endpoint: tool.endpoint,
      method,
      status: res.status,
      elapsed,
    });

    if (!res.ok) {
      return {
        ok: false,
        toolName: call.toolName,
        error: `HTTP ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`,
      };
    }

    return { ok: true, toolName: call.toolName, result: data };
  } catch (err) {
    const elapsed = Date.now() - startMs;
    logChat("warn", "tool_execution_failed", {
      toolName: call.toolName,
      endpoint: tool.endpoint,
      elapsed,
      error: String(err),
    });
    return {
      ok: false,
      toolName: call.toolName,
      error: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
