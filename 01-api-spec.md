# 📡 AI Chatbot API 명세서

> **버전:** v1.0  
> **Base URL:** `/api/chat`  
> **작성일:** 2026-03-29  
> **인증 방식:** JWT (Bearer Token) / NextAuth Session

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [메시지 전송 (스트리밍)](#2-메시지-전송-스트리밍)
3. [대화 기록 조회](#3-대화-기록-조회)
4. [세션 초기화](#4-세션-초기화)
5. [피드백 수집](#5-피드백-수집)
6. [대화 기록 삭제](#6-대화-기록-삭제)
7. [문서 인덱싱 (관리자)](#7-문서-인덱싱-관리자)
8. [SSE 이벤트 스펙](#8-sse-이벤트-스펙)
9. [에러 코드 정의](#9-에러-코드-정의)
10. [Rate Limiting 정책](#10-rate-limiting-정책)

---

## 1. 공통 규칙

### 1.1 요청 헤더

| 헤더 | 필수 | 설명 |
|------|------|------|
| `Content-Type` | ✅ | `application/json` |
| `Authorization` | ✅ | `Bearer {jwt_token}` |
| `X-Project-Id` | ✅ | 프로젝트 식별자 (예: `saas-app`, `customer-support`, `internal-tool`) |

### 1.2 공통 응답 형식

```typescript
// 성공 응답
{
  "success": true,
  "data": { ... }
}

// 실패 응답
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 친화적 메시지",
    "retryable": true | false,
    "retryAfter": 30  // RATE_LIMIT 시 재시도 가능 시간(초), 선택
  }
}
```

### 1.3 인증 흐름

```
Client → Route Handler
  → getServerSession() 또는 JWT 검증
  → 실패 시 401 AUTH_ERROR 반환
  → 성공 시 userId 추출 → Rate Limit 키로 사용
```

---

## 2. 메시지 전송 (스트리밍)

챗봇의 핵심 엔드포인트. SSE(Server-Sent Events) 방식으로 응답을 스트리밍한다.

### `POST /api/chat`

#### 요청

```typescript
// Request Body
{
  "message": string,      // 사용자 입력 메시지 (1~2000자)
  "sessionId": string,    // UUID v4 형식 세션 ID
  "projectId": string     // 프로젝트 식별자
}
```

#### 요청 예시

```json
{
  "message": "지난달 매출 데이터 보여줘",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "saas-app"
}
```

#### 응답 헤더

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

#### SSE 이벤트 스트림 (응답 본문)

응답은 SSE 형식으로 순차 전송되며 이벤트 타입에 따라 클라이언트가 처리한다.  
상세 스펙은 [8. SSE 이벤트 스펙](#8-sse-이벤트-스펙) 참조.

```
data: {"type":"chunk","content":"안녕하세요"}

data: {"type":"chunk","content","! 지난달"}

data: {"type":"tool_start","toolName":"queryDatabase"}

data: {"type":"tool_result","toolName":"queryDatabase","result":{...}}

data: {"type":"done","messageId":"msg_abc123"}
```

#### 처리 순서 (서버 내부)

```
1. 인증 검증 (getServerSession / JWT)
2. Rate Limit 체크 (upstash)
3. Zod 스키마 검증
4. Prompt Injection 방어 (PromptGuard)
5. 세션 히스토리 로드 (Redis)
6. RAG 검색 (Pinecone) — config.rag.enabled 시
7. Context 조립 (시스템프롬프트 + RAG + 히스토리 + 입력)
8. Anthropic API 스트리밍 호출
9. Tool Calling 감지 → 실행 → 결과 반환
10. 세션 히스토리 저장 (Redis)
```

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 스트리밍 시작 (에러는 SSE 스트림 내 `error` 이벤트로 전달) |
| `400` | 요청 형식 오류 (Zod 검증 실패, Prompt Injection 감지) |
| `401` | 인증 실패 |
| `429` | Rate Limit 초과 |
| `500` | 서버 내부 오류 |

---

## 3. 대화 기록 조회

### `GET /api/chat/history`

세션 ID에 해당하는 대화 기록을 반환한다.

#### 요청 파라미터 (Query String)

| 파라미터 | 필수 | 타입 | 설명 |
|---------|------|------|------|
| `sessionId` | ✅ | `string` | UUID v4 세션 ID |
| `limit` | ❌ | `number` | 최대 반환 메시지 수 (기본값: 50, 최대: 100) |
| `before` | ❌ | `number` | 특정 timestamp 이전 메시지만 조회 (페이지네이션) |

#### 요청 예시

```
GET /api/chat/history?sessionId=550e8400-e29b-41d4-a716-446655440000&limit=20
```

#### 응답

```typescript
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "지난달 매출 데이터 보여줘",
        "timestamp": 1743210000000
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "지난달 매출 데이터를 조회했습니다...",
        "timestamp": 1743210005000,
        "feedback": "up"
      }
    ],
    "total": 2,
    "hasMore": false
  }
}
```

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 조회 성공 |
| `400` | sessionId 형식 오류 |
| `401` | 인증 실패 |
| `404` | 세션 없음 (빈 배열 반환 권장) |

---

## 4. 세션 초기화

### `POST /api/chat/reset`

현재 세션의 대화 기록을 초기화하고 새 세션 ID를 발급한다.

#### 요청

```typescript
{
  "sessionId": string   // 초기화할 세션 ID
}
```

#### 응답

```typescript
{
  "success": true,
  "data": {
    "newSessionId": "660f9511-f30c-52e5-b827-557766551111"  // 새 세션 ID
  }
}
```

#### 처리 동작

- Redis에서 기존 `sessionId` 키 삭제
- 새 `sessionId` 생성 후 반환
- 클라이언트는 반환된 `newSessionId`로 Zustand store 업데이트

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 초기화 성공 |
| `400` | sessionId 형식 오류 |
| `401` | 인증 실패 |

---

## 5. 피드백 수집

### `POST /api/chat/feedback`

메시지에 대한 👍 / 👎 피드백을 저장한다.

#### 요청

```typescript
{
  "messageId": string,            // 피드백 대상 메시지 ID
  "sessionId": string,            // 세션 ID
  "feedback": "up" | "down",     // 피드백 값
  "reason"?: string               // 👎 선택 시 사유 (선택)
}
```

#### 요청 예시

```json
{
  "messageId": "msg_002",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "feedback": "down",
  "reason": "답변이 부정확합니다"
}
```

#### 응답

```typescript
{
  "success": true,
  "data": {
    "messageId": "msg_002",
    "feedback": "down"
  }
}
```

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 피드백 저장 성공 |
| `400` | 요청 형식 오류 |
| `401` | 인증 실패 |
| `404` | 메시지 ID 없음 |

---

## 6. 대화 기록 삭제

### `DELETE /api/chat/history`

사용자 요청에 의한 대화 기록 영구 삭제 (개인정보 처리 방침 준수).

#### 요청 파라미터 (Query String)

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `sessionId` | ✅ | 삭제할 세션 ID |

#### 응답

```typescript
{
  "success": true,
  "data": {
    "deletedSessionId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 삭제 성공 |
| `401` | 인증 실패 |
| `404` | 세션 없음 |

---

## 7. 문서 인덱싱 (관리자)

### `POST /api/rag/index`

RAG용 문서를 Vector DB에 인덱싱한다. **관리자 권한 필요.**

#### 요청

```typescript
{
  "projectId": string,            // 대상 프로젝트 ID
  "documents": [
    {
      "title": string,            // 문서 제목
      "content": string,          // 문서 본문 (텍스트)
      "source": string,           // 출처 URL 또는 경로
      "updatedAt": string         // ISO 8601 형식 (예: "2026-03-29T00:00:00Z")
    }
  ]
}
```

#### 응답

```typescript
{
  "success": true,
  "data": {
    "indexed": 5,        // 인덱싱 성공 건수
    "failed": 0,         // 실패 건수
    "namespace": "customer-support-docs"
  }
}
```

#### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| `200` | 인덱싱 완료 |
| `400` | 요청 형식 오류 |
| `401` | 인증 실패 |
| `403` | 관리자 권한 없음 |

---

## 8. SSE 이벤트 스펙

`POST /api/chat` 의 스트리밍 응답은 아래 이벤트 타입으로 구성된다.

### 8.1 이벤트 타입 목록

| type | 방향 | 설명 |
|------|------|------|
| `chunk` | Server → Client | LLM 응답 텍스트 조각 |
| `tool_start` | Server → Client | Tool 실행 시작 알림 |
| `tool_result` | Server → Client | Tool 실행 결과 |
| `done` | Server → Client | 스트리밍 완료 |
| `error` | Server → Client | 오류 발생 |

### 8.2 이벤트별 페이로드

#### `chunk` — LLM 응답 조각

```typescript
{
  "type": "chunk",
  "content": string    // 텍스트 조각 (마크다운 포함 가능)
}
```

#### `tool_start` — Tool 실행 시작

```typescript
{
  "type": "tool_start",
  "toolName": string   // 실행되는 Tool 이름 (예: "queryDatabase")
}
```

#### `tool_result` — Tool 실행 결과

```typescript
{
  "type": "tool_result",
  "toolName": string,
  "result": unknown    // Tool별 반환값 (구조는 Tool마다 상이)
}
```

#### `done` — 스트리밍 완료

```typescript
{
  "type": "done",
  "messageId": string  // 저장된 메시지 ID (피드백 연동용)
}
```

#### `error` — 오류 발생

```typescript
{
  "type": "error",
  "code": "LLM_ERROR" | "TOOL_ERROR" | "RAG_ERROR" | "NETWORK_ERROR" | "RATE_LIMIT",
  "message": string,   // 사용자에게 표시할 메시지
  "retryable": boolean,
  "retryAfter"?: number  // 재시도 가능 시간(초), RATE_LIMIT 시
}
```

### 8.3 전체 스트림 흐름 예시

```
// 일반 응답
data: {"type":"chunk","content":"안녕하세요! "}
data: {"type":"chunk","content":"지난달 매출 데이터를 조회할게요."}
data: {"type":"tool_start","toolName":"queryDatabase"}
data: {"type":"tool_result","toolName":"queryDatabase","result":{"rows":[...]}}
data: {"type":"chunk","content":"조회 결과, 지난달 총 매출은 1억 2천만 원입니다."}
data: {"type":"done","messageId":"msg_abc123"}

// 에러 발생 시
data: {"type":"chunk","content":"분석을 시작하겠습니다"}
data: {"type":"error","code":"LLM_ERROR","message":"AI 응답 중 문제가 생겼어요.","retryable":true}

// Rate Limit
data: {"type":"error","code":"RATE_LIMIT","message":"잠시 후 다시 시도해 주세요.","retryable":false,"retryAfter":30}
```

### 8.4 클라이언트 구현 가이드

```typescript
const response = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, sessionId, projectId }),
  signal: abortController.signal,  // 스트리밍 취소 지원
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split("\n\n").filter(Boolean);
  for (const line of lines) {
    const event = JSON.parse(line.replace("data: ", ""));

    switch (event.type) {
      case "chunk":
        // Zustand: updateLastMessage(event.content)
        break;
      case "tool_start":
        // UI: Tool 로딩 인디케이터 표시
        break;
      case "tool_result":
        // UI: ToolResultCard 렌더링
        break;
      case "done":
        // Zustand: setStreaming(false)
        // React Query: invalidateQueries(["chat-history", sessionId])
        break;
      case "error":
        // Zustand: setError(event)
        // UI: ErrorMessage 컴포넌트 표시
        break;
    }
  }
}
```

---

## 9. 에러 코드 정의

모든 에러는 아래 코드 체계를 따른다. HTTP 응답 바디와 SSE `error` 이벤트 모두 동일한 코드를 사용한다.

| 코드 | HTTP 상태 | 원인 | 재시도 | 사용자 메시지 |
|------|----------|------|--------|------------|
| `AUTH_ERROR` | 401 | 인증 실패 / 세션 만료 | ❌ | "세션이 만료되었어요. 다시 로그인해 주세요." |
| `FORBIDDEN` | 403 | 권한 없음 | ❌ | "접근 권한이 없습니다." |
| `INVALID_INPUT` | 400 | Zod 검증 실패 | ❌ | "입력 형식이 올바르지 않습니다." |
| `PROMPT_INJECTION` | 400 | Prompt Injection 감지 | ❌ | "사용할 수 없는 입력입니다." |
| `INPUT_TOO_LONG` | 400 | 입력 2000자 초과 | ❌ | "메시지가 너무 깁니다. 2000자 이내로 입력해 주세요." |
| `RATE_LIMIT` | 429 | 분당 요청 한도 초과 | ⏳ | "잠시 후 다시 시도해 주세요. ({n}초 후 가능)" |
| `LLM_ERROR` | 200 (SSE) | Anthropic API 오류 | ✅ | "AI 응답 중 문제가 생겼어요. 다시 시도해 주세요." |
| `TOOL_ERROR` | 200 (SSE) | Tool 실행 실패 | ✅ | "요청한 작업을 처리하지 못했어요. 직접 확인해 주세요." |
| `RAG_ERROR` | 200 (SSE) | Vector DB 검색 실패 | ✅ | (내부 처리 — 일반 응답으로 Fallback) |
| `NETWORK_ERROR` | — | 네트워크 단절 (클라이언트) | ✅ | "연결이 끊겼어요. 인터넷 연결을 확인해 주세요." |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 | ✅ | "일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요." |

---

## 10. Rate Limiting 정책

### 10.1 기본 정책

| 단위 | 한도 | 키 |
|------|------|---|
| 분당 | 10회 | `userId` |
| 시간당 | 100회 | `userId` |
| 일당 | 500회 | `userId` |

### 10.2 429 응답 예시

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "잠시 후 다시 시도해 주세요. (30초 후 가능)",
    "retryable": false,
    "retryAfter": 30
  }
}
```

### 10.3 Rate Limit 헤더

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1743210060
```

### 10.4 프로젝트별 한도 조정

| 프로젝트 | 분당 한도 | 비고 |
|---------|---------|------|
| SaaS | 10회 | 기본값 |
| 고객 지원 | 20회 | 고객 문의 빈도 고려 |
| 사내 도구 | 15회 | 업무 특성 고려 |

---

## 부록 A. API 엔드포인트 요약

| 메서드 | 엔드포인트 | 설명 | 인증 | 권한 |
|--------|-----------|------|------|------|
| `POST` | `/api/chat` | 메시지 전송 (스트리밍) | ✅ | 일반 사용자 |
| `GET` | `/api/chat/history` | 대화 기록 조회 | ✅ | 일반 사용자 |
| `POST` | `/api/chat/reset` | 세션 초기화 | ✅ | 일반 사용자 |
| `POST` | `/api/chat/feedback` | 피드백 수집 | ✅ | 일반 사용자 |
| `DELETE` | `/api/chat/history` | 대화 기록 삭제 | ✅ | 일반 사용자 |
| `POST` | `/api/rag/index` | 문서 인덱싱 | ✅ | **관리자** |

---

## 부록 B. Zod 스키마 정의

```typescript
// packages/chatbot-core/src/schemas/index.ts

import { z } from "zod";

// POST /api/chat
export const ChatRequestSchema = z.object({
  message:   z.string().min(1).max(2000),
  sessionId: z.string().uuid(),
  projectId: z.string().min(1).max(50),
});

// GET /api/chat/history
export const HistoryQuerySchema = z.object({
  sessionId: z.string().uuid(),
  limit:     z.coerce.number().min(1).max(100).default(50),
  before:    z.coerce.number().optional(),
});

// POST /api/chat/reset
export const ResetRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

// POST /api/chat/feedback
export const FeedbackRequestSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().uuid(),
  feedback:  z.enum(["up", "down"]),
  reason:    z.string().max(500).optional(),
});

// POST /api/rag/index
export const RagIndexRequestSchema = z.object({
  projectId:  z.string().min(1).max(50),
  documents:  z.array(z.object({
    title:     z.string().min(1),
    content:   z.string().min(1),
    source:    z.string().url(),
    updatedAt: z.string().datetime(),
  })).min(1).max(100),
});
```

---

*이 문서는 2026-03-29 기준이며, API 변경 시 버전과 함께 업데이트됩니다.*
