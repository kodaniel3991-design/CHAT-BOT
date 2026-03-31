# 📐 공통 타입 / 인터페이스 명세서

> **버전:** v1.0  
> **패키지:** `@company/chatbot-core`  
> **파일 위치:** `packages/chatbot-core/src/types/index.ts`  
> **작성일:** 2026-03-29

> ⚠️ **이 파일의 타입은 모든 프로젝트가 공유하는 "계약서"입니다.**  
> 변경 시 반드시 모든 적용 프로젝트에 영향도를 검토하고 버전을 올려야 합니다.

---

## 목차

1. [설정 타입 (Config)](#1-설정-타입-config)
2. [메시지 타입 (Message)](#2-메시지-타입-message)
3. [에러 타입 (Error)](#3-에러-타입-error)
4. [Tool 타입 (Tool Calling)](#4-tool-타입-tool-calling)
5. [RAG 타입](#5-rag-타입)
6. [세션 타입](#6-세션-타입)
7. [피드백 타입](#7-피드백-타입)
8. [SSE 이벤트 타입](#8-sse-이벤트-타입)
9. [전체 타입 코드](#9-전체-타입-코드)
10. [타입 변경 정책](#10-타입-변경-정책)

---

## 1. 설정 타입 (Config)

각 프로젝트가 `chatbot.config.ts`에서 정의하는 최상위 설정 타입.

### `ChatbotConfig`

```typescript
interface ChatbotConfig {
  projectId:    string;              // 프로젝트 고유 식별자 (예: "saas-app")
  llm:          LLMConfig;           // LLM 관련 설정
  systemPrompt: string;              // 챗봇 역할 및 동작 지침
  conversation: ConversationConfig;  // 대화 관련 설정
  ui:           UIConfig;            // UI 관련 설정
  rag?:         RAGConfig;           // RAG 설정 (선택, 미설정 시 비활성화)
  tools?:       ToolDefinition[];    // 사용 가능한 Tool 목록 (선택)
  features?:    FeatureFlags;        // 기능 플래그 (선택, 미설정 시 기본값 적용)
}
```

---

### `LLMConfig`

```typescript
interface LLMConfig {
  provider:  "anthropic" | "openai";  // LLM 프로바이더
  model:     string;                   // 모델명 (예: "claude-sonnet-4-20250514")
  maxTokens: number;                   // 최대 응답 토큰 수 (권장: 1024~2048)
  temperature: number;                 // 창의성 제어 (0.0~1.0, 낮을수록 일관성↑)
}
```

| 필드 | 타입 | 제약 | 기본 권장값 |
|------|------|------|-----------|
| `provider` | union | `"anthropic"` \| `"openai"` | `"anthropic"` |
| `model` | string | 공백 불가 | `"claude-sonnet-4-20250514"` |
| `maxTokens` | number | 1 ~ 4096 | 프로젝트별 상이 |
| `temperature` | number | 0.0 ~ 1.0 | 0.3 ~ 0.7 |

---

### `ConversationConfig`

```typescript
interface ConversationConfig {
  maxHistoryLength: number;                    // 컨텍스트에 포함할 최대 대화 쌍 수
  sessionTimeout:   number;                    // 세션 TTL (밀리초)
  historyStrategy:  "sliding" | "summarize";  // 히스토리 초과 시 처리 전략
  welcomeMessage?:  string;                    // 첫 진입 시 봇 인사말 (선택)
}
```

| 필드 | 설명 | 프로젝트별 권장값 |
|------|------|----------------|
| `maxHistoryLength` | 클수록 컨텍스트 품질↑, 토큰 비용↑ | SaaS: 10 / 고객지원: 20 / 사내: 15 |
| `sessionTimeout` | Redis TTL 결정 | SaaS: 30분 / 고객지원: 1시간 / 사내: 8시간 |
| `historyStrategy` | `sliding`: 오래된 메시지 제거, `summarize`: LLM 요약 후 삽입 | SaaS/고객지원: sliding / 사내: summarize |

---

### `UIConfig`

```typescript
interface UIConfig {
  theme:               "light" | "dark" | "auto";   // 테마 (auto: 시스템 감지)
  primaryColor?:       string;                        // 디자인 시스템 변수 오버라이드 (예: "#6366F1")
  botName:             string;                        // 챗봇 표시 이름
  botAvatarUrl?:       string;                        // 봇 아바타 이미지 URL (선택)
  position:            "bottom-right" | "bottom-left"; // 위젯 위치
  placeholder?:        string;                        // 입력창 Placeholder 텍스트
  allowFileAttachment?: boolean;                      // 파일 첨부 허용 여부 (기본: false)
}
```

> **주의:** `primaryColor`는 디자인 시스템 CSS 변수(`var(--color-primary)`)를 우선 사용.  
> 하드코딩된 Hex 값은 다크모드 미대응 가능성이 있으므로 신중하게 사용.

---

### `RAGConfig`

```typescript
interface RAGConfig {
  enabled:          boolean;  // RAG 활성화 여부
  vectorDbNamespace: string;  // Vector DB 네임스페이스 (프로젝트별 분리)
  topK:             number;   // 검색 결과 개수 (권장: 3~10)
  minScore:         number;   // 유사도 최소 임계값 (0.0~1.0, 권장: 0.70~0.80)
  reranking?:       boolean;  // Re-ranking 활성화 여부 (선택, 기본: false)
}
```

| 필드 | 설명 | 프로젝트별 권장값 |
|------|------|----------------|
| `topK` | 클수록 정확도↑, 응답 속도↓, 비용↑ | 고객지원: 5 / 사내: 8 |
| `minScore` | 낮을수록 더 많은 결과 포함 | 고객지원: 0.75 / 사내: 0.70 |
| `reranking` | 검색 정확도 향상 (추가 처리 시간 발생) | 사내: true |

---

### `FeatureFlags`

```typescript
interface FeatureFlags {
  feedback?:       boolean;  // 답변 피드백 버튼 (👍👎) 표시 여부 (기본: false)
  exportHistory?:  boolean;  // 대화 내보내기 기능 활성화 여부 (기본: false)
  fileAttachment?: boolean;  // 파일 첨부 기능 활성화 여부 (기본: false)
  voiceInput?:     boolean;  // 음성 입력 기능 (향후 구현, 기본: false)
  streaming?:      boolean;  // 스트리밍 응답 사용 여부 (기본: true)
}
```

> **기본값:** 모든 플래그가 `undefined`인 경우 `false`로 처리.  
> `streaming`만 예외적으로 미설정 시 `true` 적용.

---

## 2. 메시지 타입 (Message)

### `ChatMessage`

대화 목록의 각 메시지를 표현하는 핵심 타입.

```typescript
type ChatMessage = {
  id:          string;                          // 메시지 고유 ID (nanoid 권장)
  role:        "user" | "assistant" | "tool";  // 메시지 발신 주체
  content:     string;                          // 메시지 본문 (마크다운 가능)
  timestamp:   number;                          // Unix timestamp (ms)
  isStreaming?: boolean;                         // 스트리밍 진행 중 여부
  toolName?:   string;                           // role="tool"일 때 실행된 Tool 이름
  toolResult?: unknown;                          // role="tool"일 때 실행 결과
  feedback?:   "up" | "down";                   // 사용자 피드백 (선택)
  sources?:    RAGSource[];                      // RAG 출처 목록 (선택)
};
```

#### `role` 별 사용 기준

| role | 생성 주체 | 표시 위치 | content |
|------|---------|---------|---------|
| `user` | 사용자 입력 | 우측 말풍선 | 사용자가 입력한 텍스트 |
| `assistant` | LLM 응답 | 좌측 말풍선 | 마크다운 포함 텍스트 |
| `tool` | Tool 실행 결과 | 좌측 결과 카드 | JSON 직렬화 결과 |

---

### `RAGSource`

```typescript
type RAGSource = {
  title:  string;   // 출처 문서 제목
  url?:   string;   // 원본 문서 URL (선택)
  score:  number;   // 유사도 점수 (0.0~1.0)
  chunk?: string;   // 참조된 문서 청크 내용 (선택)
};
```

---

## 3. 에러 타입 (Error)

### `ChatError`

```typescript
type ChatError = {
  code:        ErrorCode;  // 에러 코드
  message:     string;     // 사용자에게 표시할 메시지
  retryable:   boolean;    // 재시도 가능 여부
  retryAfter?: number;     // 재시도 가능 시간(초), RATE_LIMIT 시
};

type ErrorCode =
  | "AUTH_ERROR"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "PROMPT_INJECTION"
  | "INPUT_TOO_LONG"
  | "RATE_LIMIT"
  | "LLM_ERROR"
  | "TOOL_ERROR"
  | "RAG_ERROR"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";
```

---

## 4. Tool 타입 (Tool Calling)

### `ToolDefinition`

각 프로젝트가 사용할 Tool을 정의하는 타입.

```typescript
interface ToolDefinition {
  name:        string;              // Tool 고유 이름 (camelCase 권장)
  description: string;              // LLM이 참고하는 Tool 용도 설명 (영문 권장)
  inputSchema: ToolInputSchema;     // Tool 입력 JSON Schema
  handler:     ToolHandler;         // 실제 실행 함수
  requiresConfirmation?: boolean;   // 실행 전 사용자 확인 필요 여부 (기본: false)
  dangerLevel?: "low" | "medium" | "high";  // 위험도 (UI 확인 방식 결정)
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

interface ToolInputSchema {
  type:       "object";
  properties: Record<string, {
    type:        string;
    description: string;
    enum?:       string[];
  }>;
  required?: string[];
}
```

#### `dangerLevel` 별 UX 처리

| dangerLevel | 처리 방식 |
|------------|---------|
| `low` | 확인 없이 즉시 실행 |
| `medium` | 1단계 확인 다이얼로그 표시 |
| `high` | 2단계 확인 (내용 재확인 후 실행) |

---

### `ToolExecutionResult`

```typescript
type ToolExecutionResult = {
  toolName: string;
  success:  boolean;
  result?:  unknown;   // 성공 시 반환값
  error?:   string;    // 실패 시 에러 메시지
  duration: number;    // 실행 시간 (ms, 로깅용)
};
```

---

## 5. RAG 타입

### `RAGSearchResult`

```typescript
interface RAGSearchResult {
  sources:     RAGSource[];  // 검색된 문서 목록 (score 내림차순 정렬)
  context:     string;       // LLM Context에 삽입할 조합된 텍스트
  hasResults:  boolean;      // 최소 임계값 이상 결과 존재 여부
}
```

---

### `DocumentChunk`

```typescript
interface DocumentChunk {
  id:        string;   // 청크 고유 ID
  title:     string;   // 문서 제목
  content:   string;   // 청크 내용
  source:    string;   // 출처 URL 또는 경로
  updatedAt: string;   // ISO 8601 형식
  projectId: string;   // 소속 프로젝트 ID
}
```

---

## 6. 세션 타입

### `ChatSession`

Redis에 저장되는 세션 데이터 구조.

```typescript
interface ChatSession {
  sessionId:  string;              // UUID v4
  userId:     string;              // 인증된 사용자 ID
  projectId:  string;              // 프로젝트 ID
  messages:   ChatMessage[];       // 대화 히스토리
  createdAt:  number;              // 세션 생성 시각 (Unix ms)
  updatedAt:  number;              // 마지막 업데이트 시각 (Unix ms)
  summary?:   string;              // historyStrategy="summarize" 시 사용
}
```

---

## 7. 피드백 타입

### `FeedbackPayload`

```typescript
interface FeedbackPayload {
  messageId:  string;           // 피드백 대상 메시지 ID
  sessionId:  string;           // 세션 ID
  feedback:   "up" | "down";   // 피드백 값
  reason?:    string;           // 부정 피드백 사유 (선택)
}
```

---

## 8. SSE 이벤트 타입

스트리밍 응답에서 클라이언트가 수신하는 이벤트 Union 타입.

```typescript
type SSEEvent =
  | ChunkEvent
  | ToolStartEvent
  | ToolResultEvent
  | DoneEvent
  | ErrorEvent;

type ChunkEvent = {
  type:    "chunk";
  content: string;
};

type ToolStartEvent = {
  type:     "tool_start";
  toolName: string;
};

type ToolResultEvent = {
  type:     "tool_result";
  toolName: string;
  result:   unknown;
};

type DoneEvent = {
  type:      "done";
  messageId: string;
};

type ErrorEvent = {
  type:        "error";
  code:        ErrorCode;
  message:     string;
  retryable:   boolean;
  retryAfter?: number;
};
```

---

## 9. 전체 타입 코드

> 아래 코드를 `packages/chatbot-core/src/types/index.ts`에 그대로 사용하세요.

```typescript
// ============================================================
// @company/chatbot-core — 공통 타입 정의
// 버전: 1.0.0
// ⚠️ 변경 시 모든 프로젝트 영향도 검토 필수
// ============================================================

// ────────────────────────────────────────
// 에러 코드
// ────────────────────────────────────────
export type ErrorCode =
  | "AUTH_ERROR"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "PROMPT_INJECTION"
  | "INPUT_TOO_LONG"
  | "RATE_LIMIT"
  | "LLM_ERROR"
  | "TOOL_ERROR"
  | "RAG_ERROR"
  | "NETWORK_ERROR"
  | "INTERNAL_ERROR";

export type ChatError = {
  code:        ErrorCode;
  message:     string;
  retryable:   boolean;
  retryAfter?: number;
};

// ────────────────────────────────────────
// 메시지
// ────────────────────────────────────────
export type RAGSource = {
  title:  string;
  url?:   string;
  score:  number;
  chunk?: string;
};

export type ChatMessage = {
  id:          string;
  role:        "user" | "assistant" | "tool";
  content:     string;
  timestamp:   number;
  isStreaming?: boolean;
  toolName?:   string;
  toolResult?: unknown;
  feedback?:   "up" | "down";
  sources?:    RAGSource[];
};

// ────────────────────────────────────────
// SSE 이벤트
// ────────────────────────────────────────
export type ChunkEvent      = { type: "chunk";       content: string };
export type ToolStartEvent  = { type: "tool_start";  toolName: string };
export type ToolResultEvent = { type: "tool_result"; toolName: string; result: unknown };
export type DoneEvent       = { type: "done";        messageId: string };
export type ErrorEvent      = { type: "error" } & ChatError;

export type SSEEvent =
  | ChunkEvent
  | ToolStartEvent
  | ToolResultEvent
  | DoneEvent
  | ErrorEvent;

// ────────────────────────────────────────
// Tool
// ────────────────────────────────────────
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolInputSchema {
  type:       "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required?:  string[];
}

export interface ToolDefinition {
  name:                    string;
  description:             string;
  inputSchema:             ToolInputSchema;
  handler:                 ToolHandler;
  requiresConfirmation?:   boolean;
  dangerLevel?:            "low" | "medium" | "high";
}

export type ToolExecutionResult = {
  toolName: string;
  success:  boolean;
  result?:  unknown;
  error?:   string;
  duration: number;
};

// ────────────────────────────────────────
// RAG
// ────────────────────────────────────────
export interface RAGSearchResult {
  sources:    RAGSource[];
  context:    string;
  hasResults: boolean;
}

export interface DocumentChunk {
  id:        string;
  title:     string;
  content:   string;
  source:    string;
  updatedAt: string;
  projectId: string;
}

// ────────────────────────────────────────
// 세션
// ────────────────────────────────────────
export interface ChatSession {
  sessionId:  string;
  userId:     string;
  projectId:  string;
  messages:   ChatMessage[];
  createdAt:  number;
  updatedAt:  number;
  summary?:   string;
}

// ────────────────────────────────────────
// 피드백
// ────────────────────────────────────────
export interface FeedbackPayload {
  messageId: string;
  sessionId: string;
  feedback:  "up" | "down";
  reason?:   string;
}

// ────────────────────────────────────────
// 설정 (Config)
// ────────────────────────────────────────
export interface LLMConfig {
  provider:    "anthropic" | "openai";
  model:       string;
  maxTokens:   number;
  temperature: number;
}

export interface ConversationConfig {
  maxHistoryLength: number;
  sessionTimeout:   number;
  historyStrategy:  "sliding" | "summarize";
  welcomeMessage?:  string;
}

export interface UIConfig {
  theme:                "light" | "dark" | "auto";
  primaryColor?:        string;
  botName:              string;
  botAvatarUrl?:        string;
  position:             "bottom-right" | "bottom-left";
  placeholder?:         string;
  allowFileAttachment?: boolean;
}

export interface RAGConfig {
  enabled:           boolean;
  vectorDbNamespace: string;
  topK:              number;
  minScore:          number;
  reranking?:        boolean;
}

export interface FeatureFlags {
  feedback?:       boolean;
  exportHistory?:  boolean;
  fileAttachment?: boolean;
  voiceInput?:     boolean;
  streaming?:      boolean;
}

export interface ChatbotConfig {
  projectId:    string;
  llm:          LLMConfig;
  systemPrompt: string;
  conversation: ConversationConfig;
  ui:           UIConfig;
  rag?:         RAGConfig;
  tools?:       ToolDefinition[];
  features?:    FeatureFlags;
}
```

---

## 10. 타입 변경 정책

### 10.1 Breaking Change 기준

아래에 해당하는 변경은 **Breaking Change**로 간주하며 Major 버전을 올린다.

- 기존 필드 삭제
- 기존 필드의 타입 변경 (넓히는 경우 제외)
- 필수 필드 추가 (optional → required)
- `ErrorCode` union에서 코드 제거
- `SSEEvent` union에서 이벤트 타입 제거

### 10.2 Non-Breaking Change 기준

아래는 **Minor 버전** 업데이트로 처리한다.

- 새 optional 필드 추가
- `ErrorCode` union에 코드 추가
- `SSEEvent` union에 이벤트 타입 추가
- 기존 필드를 optional로 변경

### 10.3 변경 절차

```
1. 타입 변경 PR 생성
2. 영향받는 프로젝트 목록 명시 (saas / customer-support / internal-tool)
3. 각 프로젝트 담당자 리뷰
4. 패키지 버전 업데이트 후 배포
5. 각 프로젝트 의존성 업데이트
```

---

*이 문서는 2026-03-29 기준이며, 타입 변경 시 반드시 버전과 함께 업데이트합니다.*
