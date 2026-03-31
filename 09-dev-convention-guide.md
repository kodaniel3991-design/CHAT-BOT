# 📏 개발 컨벤션 가이드

> **버전:** v1.0
> **적용 범위:** `packages/chatbot-core` · `packages/chatbot-ui` · `apps/*`
> **작성일:** 2026-03-29

> **목적:** 여러 프로젝트에서 공통 패키지를 함께 작업할 때 코드 스타일·구조·협업 방식을
> 통일하여 충돌을 방지하고 유지보수성을 높인다.

---

## 목차

1. [네이밍 규칙](#1-네이밍-규칙)
2. [폴더 및 파일 구조 규칙](#2-폴더-및-파일-구조-규칙)
3. [TypeScript 코딩 규칙](#3-typescript-코딩-규칙)
4. [React 컴포넌트 규칙](#4-react-컴포넌트-규칙)
5. [스타일링 규칙 (Tailwind + LUON AI)](#5-스타일링-규칙-tailwind--luon-ai)
6. [커밋 메시지 규칙](#6-커밋-메시지-규칙)
7. [브랜치 전략](#7-브랜치-전략)
8. [PR (Pull Request) 규칙](#8-pr-pull-request-규칙)
9. [공통 패키지 변경 절차](#9-공통-패키지-변경-절차)
10. [코드 리뷰 기준](#10-코드-리뷰-기준)
11. [ESLint / Prettier 설정](#11-eslint--prettier-설정)
12. [금지 패턴 목록](#12-금지-패턴-목록)

---

## 1. 네이밍 규칙

### 1.1 파일 & 폴더

| 대상 | 규칙 | 예시 |
|------|------|------|
| React 컴포넌트 파일 | PascalCase | `ChatWidget.tsx`, `MessageBubble.tsx` |
| Hook 파일 | camelCase, `use` 접두사 | `useChatbot.ts`, `useScrollToBottom.ts` |
| 유틸·헬퍼 파일 | camelCase | `formatTimestamp.ts`, `maskPII.ts` |
| 클래스 파일 | PascalCase | `ChatEngine.ts`, `PromptGuard.ts` |
| 타입 전용 파일 | camelCase | `index.ts`, `chat.types.ts` |
| 스타일 파일 | kebab-case | `chatbot.css`, `message-bubble.module.css` |
| 테스트 파일 | 원본과 동일 + `.test` | `ChatWidget.test.tsx`, `PromptGuard.test.ts` |
| E2E 파일 | kebab-case + `.spec` | `chat-basic.spec.ts`, `tool-confirmation.spec.ts` |
| 폴더명 | kebab-case | `chatbot-core/`, `chat-history/` |
| 상수 파일 | camelCase | `constants.ts` |

### 1.2 변수 · 함수 · 클래스

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수·함수 | camelCase | `sessionId`, `sendMessage()` |
| 상수 (모듈 수준 고정값) | UPPER_SNAKE_CASE | `MAX_HISTORY_LENGTH`, `DEFAULT_TIMEOUT` |
| 클래스 | PascalCase | `ChatEngine`, `ToolRegistry` |
| 인터페이스 | PascalCase, `I` 접두사 없음 | `ChatbotConfig`, `ToolDefinition` |
| 타입 alias | PascalCase | `ChatMessage`, `ErrorCode` |
| Enum | PascalCase (값도 PascalCase) | `DangerLevel.High` |
| React 컴포넌트 | PascalCase | `ChatWidget`, `MessageBubble` |
| React Hook | camelCase, `use` 접두사 | `useChatbot`, `useChatStore` |
| Zustand 스토어 | camelCase, `use` + `Store` | `useChatStore` |
| 이벤트 핸들러 | `handle` 접두사 | `handleSend`, `handleClose` |
| boolean 변수 | `is` / `has` / `can` 접두사 | `isStreaming`, `hasError`, `canRetry` |

### 1.3 API Route 경로

```
/api/chat              ← 리소스명 소문자 복수형 불필요 (단수 유지)
/api/chat/history
/api/chat/reset
/api/chat/feedback
/api/rag/index
```

### 1.4 CSS 변수 · Tailwind 클래스

```css
/* CSS 변수: kebab-case, 챗봇 전용은 --chat- 접두사 */
--chat-bg
--bubble-user-bg
--input-border-focus

/* Tailwind 커스텀 애니메이션: kebab-case */
animate-chat-slide-in
animate-message-appear
animate-cursor-blink
```

### 1.5 환경 변수

```bash
# UPPER_SNAKE_CASE
# 서버 전용 → NEXT_PUBLIC_ 없음
ANTHROPIC_API_KEY
UPSTASH_REDIS_REST_URL

# 클라이언트 노출 허용 (민감 정보 절대 불가)
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_BOT_NAME
```

---

## 2. 폴더 및 파일 구조 규칙

### 2.1 `packages/chatbot-core` 구조 원칙

```
src/
├── engine/          ← 대화 흐름 관련 (ChatEngine, ContextBuilder, SessionManager)
├── llm/             ← LLM 프로바이더 관련 (LLMGateway, AnthropicAdapter)
├── rag/             ← RAG 관련 (RAGEngine, Embedder, VectorStore, DocumentIndexer)
├── tools/           ← Tool Calling 관련 (ToolRegistry, ToolExecutor, ConfirmationGate)
├── guard/           ← 보안 관련 (PromptGuard)
├── error/           ← 에러 처리 (ErrorHandler)
├── schemas/         ← Zod 스키마 (ChatRequestSchema 등)
└── types/           ← 타입 전용 (index.ts)
```

**규칙:**
- 각 폴더는 `index.ts`로 공개 API를 제한한다 (barrel export)
- 폴더 간 직접 의존은 `engine → llm → types` 방향만 허용
- 순환 의존 절대 금지

```typescript
// ✅ 올바른 import — 상위 index를 통해 참조
import { ChatEngine } from "../engine";

// ❌ 금지 — 내부 구현 파일 직접 참조
import { ChatEngine } from "../engine/ChatEngine";
```

### 2.2 `packages/chatbot-ui` 구조 원칙

```
src/
├── components/      ← UI 컴포넌트 (한 파일 = 한 컴포넌트)
├── store/           ← Zustand 스토어
├── hooks/           ← React Hooks
├── styles/          ← CSS 파일 (chatbot.css)
└── providers/       ← React Context / Provider
```

**규칙:**
- 컴포넌트 파일 하나에 하나의 컴포넌트만 정의
- 컴포넌트 내부에서만 사용하는 하위 컴포넌트는 같은 파일에 작성 가능 (단, 50줄 이하)
- 50줄 초과 시 별도 파일로 분리

### 2.3 `apps/*/` 구조 원칙

```
src/
├── app/             ← Next.js App Router (페이지·레이아웃·Route Handler)
│   └── api/chat/    ← API 라우트 (Next.js 컨벤션 준수)
├── chatbot/         ← 챗봇 관련 (config + 프로젝트 전용 tools)
│   ├── chatbot.config.ts
│   └── tools/
├── components/      ← 프로젝트 전용 컴포넌트
├── lib/             ← 유틸, 헬퍼 함수
└── types/           ← 프로젝트 전용 타입
```

### 2.4 `index.ts` (Barrel Export) 규칙

```typescript
// ✅ 공개할 것만 명시적으로 export
export { ChatEngine }      from "./ChatEngine";
export { ContextBuilder }  from "./ContextBuilder";
// 내부 구현 타입은 export 하지 않음

// ❌ 금지 — 전체 re-export (내부 구현 노출)
export * from "./ChatEngine";
```

---

## 3. TypeScript 코딩 규칙

### 3.1 타입 선언

```typescript
// ✅ interface — 객체 형태, 확장 가능한 구조
interface ChatbotConfig {
  projectId: string;
  llm: LLMConfig;
}

// ✅ type alias — union, intersection, 단순 alias
type ErrorCode = "LLM_ERROR" | "TOOL_ERROR" | "RAG_ERROR";
type ChatMessage = { id: string; role: "user" | "assistant" };

// ❌ any 사용 금지 — unknown 또는 명시적 타입 사용
const result: any = await tool.handler(args);  // ❌
const result: unknown = await tool.handler(args);  // ✅
```

### 3.2 함수 선언

```typescript
// ✅ 반환 타입 명시 (공개 API 함수는 필수)
async function sendMessage(text: string): Promise<ChatMessage> { ... }

// ✅ 화살표 함수 — 콜백·짧은 함수
const formatTime = (ts: number): string => new Date(ts).toLocaleTimeString();

// ✅ 옵셔널 체이닝 적극 활용
const namespace = config.rag?.vectorDbNamespace ?? "default";

// ❌ non-null assertion 남용 금지 — 명시적 체크 우선
const history = session!.messages;  // ❌
const history = session?.messages ?? [];  // ✅
```

### 3.3 비동기 처리

```typescript
// ✅ async/await 사용 (Promise.then 체인 지양)
const result = await ragEngine.search(query, config);

// ✅ try-catch 명시적 처리 (Route Handler 내)
try {
  const result = await tool.handler(args);
  return result;
} catch (err) {
  throw new ToolExecutionError(toolName, err);
}

// ❌ 에러 무시 금지
try {
  await something();
} catch (_) {}  // ❌ — 반드시 로깅 또는 처리
```

### 3.4 import 순서

ESLint `import/order` 규칙을 따르며 다음 순서를 지킨다.

```typescript
// 1. Node.js 내장 모듈
import path from "path";

// 2. 외부 라이브러리 (node_modules)
import { create } from "zustand";
import { useQuery } from "@tanstack/react-query";

// 3. 내부 패키지 (@company/*)
import type { ChatbotConfig } from "@company/chatbot-core";
import { useChatStore } from "@company/chatbot-ui";

// 4. 로컬 절대 경로 (@/*)
import { chatbotConfig } from "@/chatbot/chatbot.config";

// 5. 로컬 상대 경로 (./)
import { formatTimestamp } from "./utils";

// 6. 타입 import (type keyword)
import type { ChatMessage } from "@company/chatbot-core";
```

### 3.5 공통 패키지 타입 변경 규칙

```typescript
// ✅ Breaking Change — 기존 필드 타입 변경 시 주석 필수
interface ChatMessage {
  // v1.1: string → number (타임스탬프 정밀도 개선, 모든 앱 영향)
  timestamp: number;
}

// ✅ Non-breaking — optional 필드 추가 시 주석 권장
interface ChatMessage {
  sources?: RAGSource[];  // v1.2 추가: RAG 출처 표시용
}
```

---

## 4. React 컴포넌트 규칙

### 4.1 컴포넌트 파일 구조

```tsx
// 1. import
import { useState } from "react";
import { useChatStore } from "../store/chatStore";
import type { UIConfig } from "@company/chatbot-core";

// 2. 타입 정의 (컴포넌트 전용)
interface ChatWidgetProps {
  config: UIConfig;
  className?: string;
}

// 3. 컴포넌트 (named export 원칙)
export function ChatWidget({ config, className }: ChatWidgetProps) {
  // 3-1. 상태
  const [isOpen, setIsOpen] = useState(false);
  const { messages } = useChatStore();

  // 3-2. 파생 값
  const unreadCount = messages.filter((m) => !m.isRead).length;

  // 3-3. 이벤트 핸들러
  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  // 3-4. 렌더링
  return (
    <div className={className}>
      {/* ... */}
    </div>
  );
}

// 4. 서브 컴포넌트 (50줄 이하이고 외부에서 사용 안 할 때만)
function OnlineDot() {
  return <span style={{ background: "var(--green-400)" }} />;
}
```

### 4.2 Props 규칙

```tsx
// ✅ 구체적인 타입 — 필수/선택 명확히 구분
interface MessageBubbleProps {
  message:      ChatMessage;      // 필수
  showFeedback?: boolean;         // 선택 (기본값 false)
  onFeedback?:  (v: "up" | "down") => void;  // 선택
}

// ✅ 기본값은 구조 분해에서 지정
export function MessageBubble({
  message,
  showFeedback = false,
  onFeedback,
}: MessageBubbleProps) { ... }

// ❌ props spreading 남용 금지 (타입 추론 깨짐)
<Component {...props} />  // 필요 시에만 명시적으로
```

### 4.3 Server Component vs Client Component 구분

```tsx
// ✅ Server Component (기본) — 데이터 페칭, 초기 설정
// app/api/... Route Handler, 서버 렌더링 컴포넌트

// ✅ Client Component — 상태·이벤트·브라우저 API 사용 시만
"use client";
export function ChatWindow() { ... }

// 규칙
// - "use client" 선언은 필요한 최하위 컴포넌트에만 추가
// - ChatWidget은 "use client" 필수 (Zustand, 이벤트 핸들러)
// - ChatInitializer (초기 설정 로딩)는 Server Component
```

### 4.4 Hook 작성 규칙

```typescript
// ✅ 단일 책임 — 하나의 Hook은 하나의 관심사
export function useChatbot() { /* 스트리밍 전송만 */ }
export function useChatHistory() { /* 기록 조회만 */ }
export function useFeedback() { /* 피드백만 */ }

// ✅ 반환값 명시적 타입
export function useChatbot(): {
  messages:     ChatMessage[];
  isStreaming:  boolean;
  sendMessage:  (text: string) => Promise<void>;
  cancelStreaming: () => void;
} { ... }

// ❌ Hook 안에서 다른 Hook의 상태를 직접 수정 금지
// → Zustand 액션을 통해서만 상태 변경
```

---

## 5. 스타일링 규칙 (Tailwind + LUON AI)

### 5.1 기본 원칙

```tsx
// ✅ CSS 변수 참조 (LUON AI 토큰)
style={{ background: "var(--taupe-500)" }}
style={{ color: "var(--text-primary)" }}

// ✅ Tailwind utility — 레이아웃·간격은 Tailwind 우선
className="flex items-center gap-3 p-4"

// ❌ 하드코딩 색상 절대 금지
style={{ background: "#554940" }}   // ❌
className="bg-[#554940]"            // ❌

// ❌ LUON AI 팔레트 외 임의 색상 금지
className="bg-indigo-600"           // ❌
```

### 5.2 className 작성 순서 (Tailwind)

```tsx
// 권장 순서: 레이아웃 → 크기 → 간격 → 배경/테두리 → 텍스트 → 상태 → 애니메이션
className={cn(
  "flex items-center justify-between",   // 레이아웃
  "w-full h-14",                         // 크기
  "px-4",                                // 간격
  "bg-[--chat-header-bg] border-b",      // 배경·테두리
  "text-sm font-semibold",               // 텍스트
  "hover:bg-[--bg-subtle]",             // 상태
  "transition-colors duration-150",     // 애니메이션
  className,                            // 외부 주입 (항상 마지막)
)}
```

### 5.3 `cn()` 유틸 사용

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```tsx
// ✅ 조건부 클래스는 cn() 사용
className={cn(
  "bubble",
  message.role === "user" ? "bubble-user" : "bubble-bot",
  isStreaming && "opacity-80",
)}
```

### 5.4 금지 스타일 패턴

```tsx
// ❌ 인라인 스타일로 애니메이션
style={{ transition: "all 0.3s" }}

// ❌ 임의 z-index
style={{ zIndex: 9999 }}

// ❌ Sora를 본문 텍스트에 사용
style={{ fontFamily: "Sora" }}  // 헤더·타이틀에만 허용

// ❌ prefers-reduced-motion 미고려
className="animate-bounce"       // → motion-safe:animate-bounce
```

---

## 6. 커밋 메시지 규칙

[Conventional Commits](https://www.conventionalcommits.org/) 스펙을 따른다.

### 6.1 기본 형식

```
<type>(<scope>): <subject>

[body]          ← 선택, 변경 이유·상세 설명
[footer]        ← 선택, BREAKING CHANGE 또는 이슈 참조
```

### 6.2 type 목록

| type | 용도 |
|------|------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `style` | 코드 포맷·스타일 변경 (동작 변경 없음) |
| `test` | 테스트 추가·수정 |
| `docs` | 문서 추가·수정 |
| `chore` | 빌드·설정·의존성 변경 |
| `perf` | 성능 개선 |
| `ci` | CI/CD 파이프라인 변경 |
| `revert` | 이전 커밋 되돌리기 |

### 6.3 scope 목록

| scope | 대상 |
|-------|------|
| `core` | `packages/chatbot-core` |
| `ui` | `packages/chatbot-ui` |
| `saas` | `apps/saas` |
| `support` | `apps/customer-support` |
| `internal` | `apps/internal-tool` |
| `types` | 타입 정의 변경 |
| `rag` | RAG 관련 |
| `tools` | Tool Calling 관련 |
| `api` | Route Handler |
| `config` | 설정 파일 |
| `deps` | 의존성 변경 |

### 6.4 커밋 메시지 예시

```bash
# ✅ 기능 추가
feat(core): add PromptGuard injection pattern detection

# ✅ 버그 수정
fix(ui): resolve streaming cursor disappears before done event

# ✅ Breaking Change (공통 타입 변경)
feat(types)!: change timestamp field from string to number

BREAKING CHANGE: ChatMessage.timestamp is now number (Unix ms).
Update all usages: new Date(message.timestamp)

Affects: apps/saas, apps/customer-support, apps/internal-tool

# ✅ 문서
docs(core): add ToolRegistry usage examples to README

# ✅ 리팩토링
refactor(ui): extract MarkdownRenderer from MessageBubble

# ✅ 테스트
test(core): add PromptGuard injection pattern unit tests

# ✅ 의존성
chore(deps): upgrade @anthropic-ai/sdk to 0.28.0

# ❌ 금지 — 모호한 메시지
fix: bug fix
update: update code
작업중
```

### 6.5 커밋 단위 원칙

```
✅ 하나의 커밋 = 하나의 논리적 변경
✅ 빌드·테스트가 통과하는 상태에서만 커밋
✅ WIP(작업 중) 커밋은 PR 전에 squash

❌ 여러 기능을 한 커밋에 묶기
❌ 관련 없는 파일을 같이 커밋
```

---

## 7. 브랜치 전략

### 7.1 브랜치 구조

```
main                    ← 프로덕션 배포 브랜치 (직접 push 금지)
├── develop             ← 통합 개발 브랜치 (PR merge 대상)
│   ├── feat/...        ← 기능 개발
│   ├── fix/...         ← 버그 수정
│   ├── refactor/...    ← 리팩토링
│   ├── docs/...        ← 문서
│   └── chore/...       ← 설정·의존성
└── hotfix/...          ← 프로덕션 긴급 수정 (main에서 분기)
```

### 7.2 브랜치 네이밍

```bash
# feat/<scope>/<short-description>
feat/core/prompt-guard
feat/ui/typing-indicator
feat/saas/db-query-tool

# fix/<scope>/<short-description>
fix/ui/streaming-cursor-blink
fix/core/redis-session-ttl

# refactor/<scope>/<short-description>
refactor/ui/extract-markdown-renderer

# docs/<scope>
docs/api-spec-update

# chore/<scope>/<description>
chore/deps/upgrade-anthropic-sdk
```

### 7.3 브랜치 규칙

```
✅ main, develop 브랜치 직접 push 금지 → 반드시 PR
✅ 브랜치는 최신 develop에서 분기
✅ 작업 완료 후 develop으로 PR → 머지 후 브랜치 삭제
✅ 핫픽스는 main에서 분기 → main · develop 양쪽으로 PR
```

---

## 8. PR (Pull Request) 규칙

### 8.1 PR 제목

커밋 메시지와 동일한 형식 사용:

```
feat(core): add PromptGuard injection pattern detection
fix(ui): resolve streaming cursor disappears on error
feat(types)!: change timestamp to number [BREAKING]
```

### 8.2 PR 설명 템플릿

```markdown
## 변경 내용
<!-- 무엇을 변경했는지 간략히 설명 -->

## 변경 이유
<!-- 왜 이 변경이 필요한지 -->

## 영향 범위
<!-- 어떤 패키지·앱이 영향받는지 -->
- [ ] `@company/chatbot-core`
- [ ] `@company/chatbot-ui`
- [ ] `apps/saas`
- [ ] `apps/customer-support`
- [ ] `apps/internal-tool`

## 테스트
<!-- 어떤 테스트를 실행했는지 -->
- [ ] 단위 테스트 통과 (`pnpm test:unit`)
- [ ] 컴포넌트 테스트 통과 (`pnpm test:component`)
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 확인 (필요 시)
- [ ] 수동 테스트 화면 캡처 첨부

## Breaking Change
<!-- Breaking Change가 있다면 명시 -->
없음 / 있음: (구체적인 내용)

## 참고
<!-- 관련 이슈, 문서, 디자인 링크 -->
```

### 8.3 PR 규모 기준

| PR 규모 | 변경 라인 수 | 리뷰 시간 목표 |
|---------|-----------|-------------|
| Small | < 200줄 | 당일 |
| Medium | 200~500줄 | 1~2일 |
| Large | 500줄 초과 | 분할 권장 |

**500줄 초과 PR은 반드시 분할 후 제출 (공통 패키지 변경 포함 시 더 엄격 적용)**

### 8.4 PR 머지 조건

```
✅ 리뷰어 1명 이상 Approve
✅ 모든 CI 체크 통과 (lint · typecheck · test)
✅ 충돌 해결 완료
✅ Breaking Change 있을 경우 리뷰어 2명 Approve
```

### 8.5 머지 방식

```
일반 PR    → Squash and Merge  (커밋 히스토리 깔끔하게 유지)
핫픽스     → Merge Commit      (히스토리 추적 용이)
공통 패키지 변경 → Squash and Merge + 버전 태그
```

---

## 9. 공통 패키지 변경 절차

`chatbot-core`와 `chatbot-ui`는 3개 앱이 공유하므로 변경 시 반드시 아래 절차를 따른다.

### 9.1 Non-Breaking Change (optional 필드 추가, 새 기능 추가)

```
1. 브랜치 생성
   feat/core/add-rag-reranking

2. 변경 사항 구현
   - 코드 작성
   - 단위 테스트 추가

3. 영향 범위 확인
   pnpm typecheck  ← 모든 앱에서 타입 오류 없는지 확인

4. PR 제출 → 리뷰어 1명 이상 Approve

5. develop 머지
   pnpm build:pkgs  ← 빌드 확인

6. 버전 업데이트 (package.json)
   "version": "0.1.0" → "0.2.0"  (Minor 버전 업)
```

### 9.2 Breaking Change (필드 타입 변경, 필수 필드 추가, 삭제)

```
1. 사전 협의
   - Slack/채널에 변경 내용 공유 (최소 1일 전)
   - 영향받는 앱 담당자 확인

2. 브랜치 생성
   feat/types/change-timestamp-to-number

3. 변경 구현
   - 타입 변경
   - 마이그레이션 가이드 주석 추가
   - 단위 테스트 업데이트

4. 영향 앱 동시 수정
   - 같은 PR 또는 연관 PR로 모든 앱 함께 수정
   - PR 제목에 [BREAKING] 명시

5. 리뷰
   - 리뷰어 2명 이상 Approve 필요
   - 영향받는 앱 담당자 반드시 포함

6. 버전 업데이트
   "version": "0.1.0" → "1.0.0"  (Major 버전 업)

7. 머지 및 공지
   - develop 머지 후 팀 채널 공지
   - 변경 내용 · 마이그레이션 방법 명시
```

### 9.3 Breaking Change 커밋 형식

```bash
# 반드시 ! 표기 + BREAKING CHANGE footer
feat(types)!: change ChatMessage.timestamp from string to number

BREAKING CHANGE: timestamp is now Unix milliseconds (number).
Migration: new Date(message.timestamp) → timestamp 직접 사용

Before: message.timestamp = "2026-03-29T10:00:00Z"
After:  message.timestamp = 1743210000000

Affects: apps/saas, apps/customer-support, apps/internal-tool
```

### 9.4 버전 규칙 요약

| 변경 종류 | 버전 업 | 예시 |
|---------|-------|------|
| 오류 수정 | Patch (`0.1.0 → 0.1.1`) | 버그 픽스 |
| 기능 추가 (Non-breaking) | Minor (`0.1.0 → 0.2.0`) | optional 필드 추가 |
| Breaking Change | Major (`0.1.0 → 1.0.0`) | 타입 변경, 필드 삭제 |

---

## 10. 코드 리뷰 기준

### 10.1 리뷰어 체크 항목

```
기능·로직
  □ 요구사항 충족 여부
  □ 에러 케이스 처리 (특히 LLM/Tool/RAG 오류)
  □ 보안 취약점 (API Key 노출, Prompt Injection 방어 등)

타입 안전성
  □ any 사용 여부
  □ non-null assertion(!) 남용 여부
  □ 공통 타입 명세와 일치 여부

디자인 시스템
  □ 하드코딩 색상·폰트 사용 여부
  □ LUON AI 토큰 외 임의 값 사용 여부

공통 패키지 영향
  □ Breaking Change 여부 확인 및 절차 준수
  □ 모든 앱 typecheck 통과 확인

테스트
  □ 단위 테스트 추가 여부 (새 기능·버그 수정 시 필수)
  □ 테스트 커버리지 유지 (80% 이상)

접근성
  □ aria-* 속성 누락 여부
  □ role 속성 올바른 사용 여부
```

### 10.2 리뷰 코멘트 레벨

| 레벨 | 표기 | 의미 |
|------|------|------|
| 필수 | `[MUST]` | 머지 전 반드시 수정 |
| 권장 | `[SUGGEST]` | 수정 권장 (머지 가능) |
| 질문 | `[Q]` | 이해를 위한 질문 |
| 칭찬 | `[NICE]` | 좋은 코드 표시 |
| 비유 논의 | `[DISCUSS]` | 방향 논의 필요 |

```
// 예시
[MUST] API Key가 클라이언트에 노출될 수 있습니다. NEXT_PUBLIC_ 제거 필요.
[SUGGEST] 이 조건은 ?? 연산자로 단순화할 수 있습니다.
[Q] 이 함수가 비동기인 이유가 있나요?
[NICE] 에러 처리가 깔끔합니다 👍
```

---

## 11. ESLint / Prettier 설정

### 11.1 루트 `.eslintrc.json`

```json
{
  "root": true,
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "import"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
      "newlines-between": "always",
      "alphabetize": { "order": "asc" }
    }],
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": ["dist/", ".next/", "node_modules/"]
}
```

### 11.2 루트 `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 11.3 루트 `.prettierignore`

```
dist/
.next/
node_modules/
pnpm-lock.yaml
*.md
```

### 11.4 VSCode 설정 (`.vscode/settings.json`)

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### 11.5 `package.json` scripts 추가 (루트)

```json
{
  "scripts": {
    "lint":         "pnpm --recursive run lint",
    "lint:fix":     "pnpm --recursive run lint -- --fix",
    "format":       "prettier --write \"**/*.{ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,css,md}\""
  }
}
```

---

## 12. 금지 패턴 목록

코드 리뷰에서 자동 차단해야 하는 패턴 목록.

### 12.1 보안

```typescript
// ❌ API Key 클라이언트 노출
const key = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;

// ❌ 민감 정보 로그 출력
console.log("session:", JSON.stringify(session));  // PII 포함 가능

// ❌ SQL Injection 가능성
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

### 12.2 타입 안전성

```typescript
// ❌ any 사용
const result: any = await fetch(...);

// ❌ as 타입 단언 남용
const config = value as ChatbotConfig;  // 검증 없이 단언

// ❌ // @ts-ignore
// @ts-ignore
someFunction(wrongType);
```

### 12.3 스타일

```tsx
// ❌ 하드코딩 색상
style={{ color: "#554940" }}
className="bg-[#879a77]"

// ❌ 인라인 style로 레이아웃
style={{ display: "flex", gap: "8px" }}  // → Tailwind 사용

// ❌ 임의 z-index
style={{ zIndex: 9999 }}
```

### 12.4 공통 패키지

```typescript
// ❌ 내부 구현 파일 직접 import
import { ChatEngine } from "@company/chatbot-core/engine/ChatEngine";

// ❌ chatbot-ui에서 chatbot-core 내부 구현 직접 접근
import { AnthropicAdapter } from "@company/chatbot-core/llm/AnthropicAdapter";

// ❌ Breaking Change 사전 협의 없이 PR 제출
// (타입 필드 삭제·변경, 필수 필드 추가)
```

### 12.5 Next.js / React

```tsx
// ❌ Client Component에서 서버 전용 모듈 import
"use client";
import { ANTHROPIC_API_KEY } from "@/lib/server-config";  // 클라이언트에 노출

// ❌ useEffect 의존성 배열 빈 채로 변수 사용
useEffect(() => {
  doSomething(value);
}, []);  // value가 의존성에 없음

// ❌ key prop 미사용
{messages.map((msg) => <MessageBubble message={msg} />)}  // key 없음
```

### 12.6 환경 변수

```bash
# ❌ 민감 정보를 .env (git 커밋 파일)에 저장
# .env
ANTHROPIC_API_KEY=sk-ant-...  # ❌

# ✅ .env.local (git 제외)에만 저장
```

---

*이 문서는 2026-03-29 기준이며, 팀 논의를 통해 업데이트됩니다.
규칙 변경 제안은 PR로 제출하고 팀 리뷰를 거쳐 반영합니다.*
