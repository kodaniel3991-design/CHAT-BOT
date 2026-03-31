# ⚠️ 에러 코드 정의서

> **버전:** v1.0  
> **적용 범위:** 서버(Route Handler) + 클라이언트(React) + SSE 스트림  
> **작성일:** 2026-03-29

> **목적:** 프론트엔드와 백엔드가 동일한 에러 코드 체계를 사용하여,  
> 어떤 프로젝트에 챗봇을 적용하더라도 에러 처리 방식이 일관되게 유지되도록 한다.

---

## 목차

1. [에러 코드 전체 목록](#1-에러-코드-전체-목록)
2. [에러 발생 위치별 분류](#2-에러-발생-위치별-분류)
3. [에러 코드별 상세 정의](#3-에러-코드별-상세-정의)
4. [클라이언트 처리 행동 기준](#4-클라이언트-처리-행동-기준)
5. [서버 에러 매핑 로직](#5-서버-에러-매핑-로직)
6. [에러 UI 컴포넌트 명세](#6-에러-ui-컴포넌트-명세)
7. [에러 로깅 기준](#7-에러-로깅-기준)
8. [프로젝트별 에러 처리 특이사항](#8-프로젝트별-에러-처리-특이사항)

---

## 1. 에러 코드 전체 목록

| 코드 | HTTP 상태 | 발생 위치 | 재시도 | 사용자 노출 |
|------|----------|---------|--------|-----------|
| `AUTH_ERROR` | 401 | Route Handler | ❌ | ✅ |
| `FORBIDDEN` | 403 | Route Handler | ❌ | ✅ |
| `INVALID_INPUT` | 400 | Route Handler | ❌ | ✅ |
| `PROMPT_INJECTION` | 400 | Route Handler | ❌ | ✅ |
| `INPUT_TOO_LONG` | 400 | Route Handler | ❌ | ✅ |
| `RATE_LIMIT` | 429 | Route Handler | ⏳ 대기 후 | ✅ |
| `LLM_ERROR` | 200 (SSE) | Anthropic API | ✅ | ✅ |
| `TOOL_ERROR` | 200 (SSE) | Tool 실행 | ✅ | ✅ |
| `RAG_ERROR` | 200 (SSE) | Vector DB | ✅ (Fallback) | ❌ |
| `NETWORK_ERROR` | — | 클라이언트 | ✅ | ✅ |
| `INTERNAL_ERROR` | 500 | Route Handler | ✅ | ✅ |

> **사용자 노출 ❌:** 내부적으로 처리하고 사용자에게는 정상 응답처럼 보임 (Graceful Degradation)

---

## 2. 에러 발생 위치별 분류

```
[클라이언트]                 [Route Handler]              [외부 서비스]
     │                            │                            │
     │  fetch 실패                │  인증 실패 → AUTH_ERROR     │
     ├─ NETWORK_ERROR             ├─  권한 없음 → FORBIDDEN     │
     │                            ├─  입력 오류 → INVALID_INPUT  │
     │                            ├─  Injection → PROMPT_INJECTION
     │                            ├─  길이 초과 → INPUT_TOO_LONG │
     │                            ├─  Rate Limit → RATE_LIMIT   │
     │                            │                            │
     │                            │    Anthropic API 오류       │
     │        SSE stream          ├────────────────────────────►─ LLM_ERROR
     │◄───────────────────────────┤                            │
     │                            │    Tool 실행 오류           │
     │                            ├────────────────────────────►─ TOOL_ERROR
     │                            │                            │
     │                            │    Pinecone 검색 오류       │
     │                            ├────────────────────────────►─ RAG_ERROR
     │                            │   (내부 Fallback 처리)      │
     │                            │                            │
     │                            │  서버 예외 → INTERNAL_ERROR │
```

---

## 3. 에러 코드별 상세 정의

---

### `AUTH_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | JWT 토큰 만료, NextAuth 세션 없음, 인증 헤더 누락 |
| **HTTP 상태** | 401 |
| **사용자 메시지** | "세션이 만료되었어요. 다시 로그인해 주세요." |
| **재시도** | ❌ — 로그인 후 재시도 필요 |
| **클라이언트 행동** | 에러 메시지 표시 → 로그인 페이지로 리다이렉트 |
| **서버 처리** | `getServerSession()` 또는 JWT 검증 실패 시 반환 |

```typescript
// Route Handler
const session = await getServerSession();
if (!session) {
  return Response.json(
    { success: false, error: { code: "AUTH_ERROR", message: "인증이 필요합니다.", retryable: false } },
    { status: 401 }
  );
}
```

---

### `FORBIDDEN`

| 항목 | 내용 |
|------|------|
| **발생 원인** | 인증은 됐으나 해당 리소스/Tool에 대한 권한 없음 (RBAC) |
| **HTTP 상태** | 403 |
| **사용자 메시지** | "이 기능에 대한 접근 권한이 없습니다." |
| **재시도** | ❌ |
| **클라이언트 행동** | 에러 메시지 표시, 재시도 버튼 없음 |
| **주요 발생 시나리오** | 사내 도구에서 권한 없는 문서 접근 시도, 관리자 전용 API 호출 |

---

### `INVALID_INPUT`

| 항목 | 내용 |
|------|------|
| **발생 원인** | Zod 스키마 검증 실패 (필수 필드 누락, 타입 불일치 등) |
| **HTTP 상태** | 400 |
| **사용자 메시지** | "입력 형식이 올바르지 않습니다." |
| **재시도** | ❌ |
| **클라이언트 행동** | 에러 메시지 표시, 입력창 포커스 복귀 |
| **서버 처리** | Zod `safeParse` 실패 시 반환, `error.errors` 로그 기록 |

```typescript
const body = ChatRequestSchema.safeParse(await req.json());
if (!body.success) {
  console.error("[INVALID_INPUT]", body.error.errors);
  return Response.json(
    { success: false, error: { code: "INVALID_INPUT", message: "입력 형식이 올바르지 않습니다.", retryable: false } },
    { status: 400 }
  );
}
```

---

### `PROMPT_INJECTION`

| 항목 | 내용 |
|------|------|
| **발생 원인** | 사용자 입력에서 Prompt Injection 패턴 감지 |
| **HTTP 상태** | 400 |
| **사용자 메시지** | "사용할 수 없는 입력입니다." |
| **재시도** | ❌ |
| **클라이언트 행동** | 에러 메시지 표시, 입력창 유지 (다른 내용 입력 가능) |
| **서버 처리** | `PromptGuard.validate()` 실패 시 반환 |
| **로깅** | 반드시 기록 (보안 감사용) — userId, 입력 내용 마스킹 후 저장 |

```typescript
// 감지 패턴
const patterns = [
  /ignore (all |previous )?instructions/i,
  /you are now|act as|pretend to be/i,
  /system prompt|system message/i,
  /\[INST\]|\[SYS\]/i,
  /jailbreak|dan mode/i,
];
```

---

### `INPUT_TOO_LONG`

| 항목 | 내용 |
|------|------|
| **발생 원인** | 사용자 입력이 2,000자를 초과 |
| **HTTP 상태** | 400 |
| **사용자 메시지** | "메시지가 너무 깁니다. 2,000자 이내로 입력해 주세요." |
| **재시도** | ❌ |
| **클라이언트 행동** | 에러 메시지 표시 + 현재 입력 글자 수 표시 (예: "2,143 / 2,000") |
| **사전 방어** | 클라이언트 입력창에서 maxLength로 선제 차단 권장 |

```tsx
// MessageInput.tsx — 클라이언트 선제 처리
<Textarea
  maxLength={2000}
  onChange={(e) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
  }}
/>
{charCount > 1800 && (
  <span className={cn("text-xs", charCount >= 2000 ? "text-[--color-error]" : "text-[--color-muted]")}>
    {charCount} / 2,000
  </span>
)}
```

---

### `RATE_LIMIT`

| 항목 | 내용 |
|------|------|
| **발생 원인** | 분당 요청 한도 초과 (프로젝트별 상이) |
| **HTTP 상태** | 429 |
| **사용자 메시지** | "잠시 후 다시 시도해 주세요. (N초 후 가능)" |
| **재시도** | ⏳ `retryAfter` 초 후 가능 |
| **클라이언트 행동** | 에러 메시지 + 카운트다운 타이머 표시 → 타이머 종료 후 자동 활성화 |
| **응답 필드** | `retryAfter: number` (초 단위) 포함 |

```typescript
// 클라이언트 — 카운트다운 처리
if (error.code === "RATE_LIMIT" && error.retryAfter) {
  const retryAt = Date.now() + error.retryAfter * 1000;
  startCountdown(retryAt);  // 카운트다운 UI 표시
  setInputDisabled(true);
  setTimeout(() => setInputDisabled(false), error.retryAfter * 1000);
}
```

| 프로젝트 | 분당 한도 |
|---------|---------|
| SaaS | 10회 |
| 고객 지원 | 20회 |
| 사내 도구 | 15회 |

---

### `LLM_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | Anthropic API 호출 실패 (5xx, 타임아웃, 과부하 등) |
| **HTTP 상태** | 200 (SSE 스트림 내 error 이벤트) |
| **사용자 메시지** | "AI 응답 중 문제가 생겼어요. 다시 시도해 주세요." |
| **재시도** | ✅ |
| **클라이언트 행동** | 부분 메시지 표시 + 에러 카드 + [다시 시도] 버튼 |
| **서버 처리** | try-catch로 Anthropic SDK 오류 포착, SSE error 이벤트 전송 |
| **Fallback** | 없음 (재시도 유도) |

```typescript
// AnthropicAdapter.ts
try {
  const stream = await anthropic.messages.stream({ ... });
  // ...
} catch (err) {
  if (err instanceof Anthropic.APIError) {
    send({ type: "error", code: "LLM_ERROR", message: "AI 응답 중 문제가 생겼어요.", retryable: true });
  }
}
```

---

### `TOOL_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | Tool handler 실행 중 예외 발생 (DB 연결 실패, 외부 API 오류 등) |
| **HTTP 상태** | 200 (SSE 스트림 내 error 이벤트) |
| **사용자 메시지** | "요청한 작업을 처리하지 못했어요. 직접 확인해 주세요." |
| **재시도** | ✅ |
| **클라이언트 행동** | Tool 결과 카드 대신 에러 카드 표시 + [다시 시도] 버튼 |
| **서버 처리** | Tool handler throw → ToolExecutor catch → SSE error 이벤트 |
| **로깅** | toolName, args (민감정보 제외), 에러 스택 기록 |

```typescript
// ToolExecutor.ts
try {
  const result = await tool.handler(args);
  send({ type: "tool_result", toolName, result });
} catch (err) {
  console.error(`[TOOL_ERROR] ${toolName}:`, err);
  send({ type: "error", code: "TOOL_ERROR", message: "요청한 작업을 처리하지 못했어요.", retryable: true });
}
```

---

### `RAG_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | Pinecone 연결 실패, 임베딩 생성 오류, Vector DB 타임아웃 |
| **HTTP 상태** | 200 (SSE — 사용자에게 직접 노출 안 함) |
| **사용자 메시지** | **(없음)** — 사용자에게 노출하지 않음 |
| **재시도** | ✅ (자동 Fallback) |
| **클라이언트 행동** | 없음 (정상 응답처럼 처리) |
| **서버 Fallback** | RAG 없이 LLM 단독 답변으로 대체 |
| **로깅** | 반드시 기록 (namespace, 오류 내용) |

```typescript
// RAGEngine.ts — Graceful Degradation
async search(query: string, config: RAGConfig): Promise<string> {
  try {
    const results = await vectorStore.search(query, config);
    return buildContext(results);
  } catch (err) {
    console.error("[RAG_ERROR] Falling back to LLM-only:", err);
    // 에러를 throw하지 않고 빈 context 반환 → LLM 단독 응답
    return "";
  }
}
```

---

### `NETWORK_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | 클라이언트 네트워크 단절, fetch 자체 실패, AbortError 제외 |
| **HTTP 상태** | — (fetch 자체가 실패하므로 HTTP 상태 없음) |
| **사용자 메시지** | "연결이 끊겼어요. 인터넷 연결을 확인해 주세요." |
| **재시도** | ✅ |
| **클라이언트 행동** | 에러 카드 표시 + [다시 시도] 버튼 |
| **AbortError 구분** | 사용자가 스트리밍 취소한 경우 — 에러 처리 없음 (정상 동작) |

```typescript
// useChatbot.ts
} catch (err) {
  const error = err as Error;

  // 사용자가 직접 취소한 경우 — 에러 처리 생략
  if (error.name === "AbortError") return;

  // 그 외 네트워크 오류
  setError({
    code: "NETWORK_ERROR",
    message: "연결이 끊겼어요. 인터넷 연결을 확인해 주세요.",
    retryable: true,
  });
  setStreaming(false);
}
```

---

### `INTERNAL_ERROR`

| 항목 | 내용 |
|------|------|
| **발생 원인** | Route Handler 내 예상치 못한 예외 (버그, 설정 오류 등) |
| **HTTP 상태** | 500 |
| **사용자 메시지** | "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." |
| **재시도** | ✅ |
| **클라이언트 행동** | 에러 카드 표시 + [다시 시도] 버튼 |
| **서버 처리** | 최상위 try-catch에서 포착, Sentry 알림 전송 |
| **로깅** | 스택 트레이스 전체 기록 (Sentry) |

```typescript
// Route Handler 최상위 try-catch
} catch (err) {
  console.error("[INTERNAL_ERROR]", err);
  // Sentry 알림
  Sentry.captureException(err);
  return Response.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했어요.", retryable: true } },
    { status: 500 }
  );
}
```

---

## 4. 클라이언트 처리 행동 기준

에러 발생 시 클라이언트가 취해야 할 행동을 코드별로 정의한다.

```typescript
// useChatbot.ts — 에러 핸들러
function handleError(error: ChatError) {
  switch (error.code) {

    case "AUTH_ERROR":
      setError(error);
      // 로그인 페이지로 리다이렉트 (프로젝트별 경로 다름)
      setTimeout(() => router.push("/login"), 2000);
      break;

    case "FORBIDDEN":
      setError(error);
      // 재시도 버튼 없이 안내만 표시
      break;

    case "INVALID_INPUT":
    case "PROMPT_INJECTION":
    case "INPUT_TOO_LONG":
      setError(error);
      // 마지막 assistant 슬롯 제거 (빈 말풍선 제거)
      removeLastEmptyMessage();
      // 입력창 포커스 복귀
      focusInput();
      break;

    case "RATE_LIMIT":
      setError(error);
      // 카운트다운 타이머 시작
      if (error.retryAfter) startRetryCountdown(error.retryAfter);
      break;

    case "LLM_ERROR":
    case "TOOL_ERROR":
    case "INTERNAL_ERROR":
    case "NETWORK_ERROR":
      setError(error);
      // 재시도 버튼 표시
      setRetryable(true);
      setStreaming(false);
      break;

    case "RAG_ERROR":
      // 사용자에게 노출하지 않음 — 내부 처리
      console.warn("[RAG_ERROR] Fallback to LLM-only response");
      break;
  }
}
```

### 에러 코드별 UI 행동 요약표

| 코드 | 에러 카드 표시 | 재시도 버튼 | 입력창 상태 | 추가 행동 |
|------|-------------|-----------|-----------|---------|
| `AUTH_ERROR` | ✅ | ❌ | 비활성 | 2초 후 로그인 리다이렉트 |
| `FORBIDDEN` | ✅ | ❌ | 비활성 | - |
| `INVALID_INPUT` | ✅ | ❌ | 활성 (포커스) | 빈 assistant 슬롯 제거 |
| `PROMPT_INJECTION` | ✅ | ❌ | 활성 | 빈 assistant 슬롯 제거 |
| `INPUT_TOO_LONG` | ✅ | ❌ | 활성 (글자 수 표시) | - |
| `RATE_LIMIT` | ✅ | ⏳ (카운트다운) | 타이머 동안 비활성 | 타이머 완료 후 자동 활성 |
| `LLM_ERROR` | ✅ | ✅ | 활성 | - |
| `TOOL_ERROR` | ✅ | ✅ | 활성 | - |
| `RAG_ERROR` | ❌ (미표시) | - | - | 정상 응답으로 처리 |
| `NETWORK_ERROR` | ✅ | ✅ | 활성 | - |
| `INTERNAL_ERROR` | ✅ | ✅ | 활성 | - |

---

## 5. 서버 에러 매핑 로직

```typescript
// packages/chatbot-core/src/error/ErrorHandler.ts

import type { ChatError, ErrorCode } from "../types";

export class ErrorHandler {

  // HTTP 에러 → ChatError 매핑
  static fromHttpStatus(status: number, body?: unknown): ChatError {
    switch (status) {
      case 400: return { code: "INVALID_INPUT",  message: "입력 형식이 올바르지 않습니다.", retryable: false };
      case 401: return { code: "AUTH_ERROR",     message: "세션이 만료되었어요. 다시 로그인해 주세요.", retryable: false };
      case 403: return { code: "FORBIDDEN",      message: "이 기능에 대한 접근 권한이 없습니다.", retryable: false };
      case 429: return { code: "RATE_LIMIT",     message: "잠시 후 다시 시도해 주세요.", retryable: false,
                         retryAfter: (body as any)?.error?.retryAfter };
      case 500: return { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했어요.", retryable: true };
      default:  return { code: "INTERNAL_ERROR", message: "알 수 없는 오류가 발생했어요.", retryable: true };
    }
  }

  // 예외 객체 → ChatError 매핑 (Route Handler 내부)
  static fromException(err: unknown): ChatError {
    if (err instanceof AnthropicError) {
      return { code: "LLM_ERROR",      message: "AI 응답 중 문제가 생겼어요.", retryable: true };
    }
    if (err instanceof ToolExecutionError) {
      return { code: "TOOL_ERROR",     message: "요청한 작업을 처리하지 못했어요.", retryable: true };
    }
    if (err instanceof VectorDBError) {
      return { code: "RAG_ERROR",      message: "", retryable: true };  // 사용자 미노출
    }
    return { code: "INTERNAL_ERROR",   message: "일시적인 오류가 발생했어요.", retryable: true };
  }

  // 사용자 표시 메시지 (에러 코드 기준 최종 확인용)
  static toUserMessage(code: ErrorCode, retryAfter?: number): string {
    const messages: Record<ErrorCode, string> = {
      AUTH_ERROR:       "세션이 만료되었어요. 다시 로그인해 주세요.",
      FORBIDDEN:        "이 기능에 대한 접근 권한이 없습니다.",
      INVALID_INPUT:    "입력 형식이 올바르지 않습니다.",
      PROMPT_INJECTION: "사용할 수 없는 입력입니다.",
      INPUT_TOO_LONG:   "메시지가 너무 깁니다. 2,000자 이내로 입력해 주세요.",
      RATE_LIMIT:       `잠시 후 다시 시도해 주세요.${retryAfter ? ` (${retryAfter}초 후 가능)` : ""}`,
      LLM_ERROR:        "AI 응답 중 문제가 생겼어요. 다시 시도해 주세요.",
      TOOL_ERROR:       "요청한 작업을 처리하지 못했어요. 직접 확인해 주세요.",
      RAG_ERROR:        "",  // 사용자에게 미노출
      NETWORK_ERROR:    "연결이 끊겼어요. 인터넷 연결을 확인해 주세요.",
      INTERNAL_ERROR:   "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
    };
    return messages[code];
  }
}
```

---

## 6. 에러 UI 컴포넌트 명세

### 6.1 ErrorMessage 컴포넌트

```tsx
// packages/chatbot-ui/src/components/ErrorMessage.tsx

interface ErrorMessageProps {
  error: ChatError;
  onRetry?: () => void;         // 재시도 콜백
  retryCountdown?: number;      // RATE_LIMIT 카운트다운 (초)
}

export function ErrorMessage({ error, onRetry, retryCountdown }: ErrorMessageProps) {
  if (!error.message) return null;  // RAG_ERROR 등 미노출 에러

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 p-3 rounded-[--radius] border text-sm
                 bg-[--chat-error-bg] border-[--chat-error-border] text-[--chat-error-text]"
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p>{error.message}</p>

        {/* RATE_LIMIT 카운트다운 */}
        {error.code === "RATE_LIMIT" && retryCountdown !== undefined && (
          <p className="text-xs mt-1 text-[--color-muted]">
            {retryCountdown > 0 ? `${retryCountdown}초 후 재시도 가능` : "지금 재시도할 수 있습니다."}
          </p>
        )}
      </div>

      {/* 재시도 버튼 */}
      {error.retryable && onRetry && (
        <button
          onClick={onRetry}
          disabled={error.code === "RATE_LIMIT" && (retryCountdown ?? 0) > 0}
          className="text-xs font-medium text-[--color-primary] hover:underline
                     disabled:text-[--color-muted] disabled:no-underline shrink-0"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
```

### 6.2 스트리밍 중단 표시

```tsx
// 스트리밍 도중 에러 발생 시
// 이미 출력된 부분 텍스트 끝에 중단 안내 추가

updateLastMessage("...\n\n⚠️ 응답이 중단되었습니다.");
```

---

## 7. 에러 로깅 기준

에러별 로깅 레벨과 필수 포함 필드를 정의한다.

| 코드 | 로그 레벨 | Sentry 알림 | 필수 필드 |
|------|---------|-----------|---------|
| `AUTH_ERROR` | `warn` | ❌ | userId, projectId |
| `FORBIDDEN` | `warn` | ❌ | userId, projectId, toolName |
| `INVALID_INPUT` | `info` | ❌ | projectId, 오류 필드명 |
| `PROMPT_INJECTION` | `warn` | ✅ | userId, 패턴 (입력 내용 마스킹) |
| `INPUT_TOO_LONG` | `info` | ❌ | projectId, 입력 길이 |
| `RATE_LIMIT` | `info` | ❌ | userId, projectId |
| `LLM_ERROR` | `error` | ✅ | projectId, sessionId, Anthropic 오류 코드 |
| `TOOL_ERROR` | `error` | ✅ | projectId, sessionId, toolName, 오류 스택 |
| `RAG_ERROR` | `warn` | ✅ | projectId, namespace, 오류 내용 |
| `NETWORK_ERROR` | — (클라이언트) | ❌ | — |
| `INTERNAL_ERROR` | `error` | ✅ | 오류 스택 전체 |

```typescript
// 로깅 예시
console.error("[LLM_ERROR]", {
  projectId: config.projectId,
  sessionId,
  anthropicError: err.message,
  timestamp: new Date().toISOString(),
});

// PROMPT_INJECTION — 입력 마스킹
console.warn("[PROMPT_INJECTION]", {
  userId: session.user.id,
  projectId: config.projectId,
  inputLength: message.length,
  detectedPattern: pattern.toString(),
  // 실제 입력 내용은 로그에 남기지 않음
});
```

---

## 8. 프로젝트별 에러 처리 특이사항

### 8.1 SaaS (데이터 CRUD)

- `TOOL_ERROR` 발생 시 데이터 변경 여부를 사용자에게 명확히 안내
  - 예: "데이터 저장 중 오류가 발생했어요. 저장이 완료되지 않았을 수 있습니다."
- `deleteRecord` Tool 오류 시 특별 안내: "삭제 여부를 직접 확인해 주세요."

### 8.2 고객 지원 서비스

- `LLM_ERROR` 3회 연속 발생 시 자동으로 에스컬레이션 제안
  ```typescript
  if (llmErrorCount >= 3) {
    offerEscalation();  // "상담원 연결을 원하시나요?" UI 표시
  }
  ```
- `AUTH_ERROR`: 비로그인 고객도 챗봇 사용 가능한 경우 인증 없이 허용 (config 설정)

### 8.3 사내 내부 도구

- `FORBIDDEN` 발생 시 담당자 연락처 안내
  - 예: "문서 접근 권한이 없습니다. IT 헬프데스크(내선 1234)에 문의해 주세요."
- `AUTH_ERROR`: SSO 세션 만료 시 자동 SSO 재인증 시도
- 모든 에러에 대한 감사 로그 의무 보관 (보안 팀 요청 대응)

---

*이 문서는 2026-03-29 기준이며, 에러 코드 추가/변경 시 타입 명세서(`02-type-spec.md`)와 함께 업데이트합니다.*
