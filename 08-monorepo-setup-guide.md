# 🏗️ Monorepo 초기 세팅 가이드

> **버전:** v1.0
> **기준 스택:** pnpm workspaces + Next.js 14 (App Router) + TypeScript 5.6
> **작성일:** 2026-03-29
> **소요 시간:** 약 1~2시간 (초기 세팅 완료 기준)

> **목적:** 개발자가 Day 1에 막힘 없이 시작할 수 있도록,
> Monorepo 환경 구성 전 과정을 단계별로 정의한다.

---

## 목차

1. [전체 구조 개요](#1-전체-구조-개요)
2. [사전 요구사항](#2-사전-요구사항)
3. [루트 초기화](#3-루트-초기화)
4. [패키지 구성 — chatbot-core](#4-패키지-구성--chatbot-core)
5. [패키지 구성 — chatbot-ui](#5-패키지-구성--chatbot-ui)
6. [앱 구성 — Next.js 프로젝트](#6-앱-구성--nextjs-프로젝트)
7. [TypeScript 공통 설정](#7-typescript-공통-설정)
8. [Tailwind & shadcn/ui 공통 설정](#8-tailwind--shadcnui-공통-설정)
9. [빌드 파이프라인](#9-빌드-파이프라인)
10. [개발 서버 실행](#10-개발-서버-실행)
11. [환경 변수 구성](#11-환경-변수-구성)
12. [패키지 간 의존성 추가 방법](#12-패키지-간-의존성-추가-방법)
13. [초기 세팅 완료 체크리스트](#13-초기-세팅-완료-체크리스트)
14. [트러블슈팅](#14-트러블슈팅)

---

## 1. 전체 구조 개요

```
luon-chatbot/                        ← 루트 (Monorepo)
├── packages/
│   ├── chatbot-core/                ← 서버 공통 로직 (@company/chatbot-core)
│   │   ├── src/
│   │   │   ├── engine/              ← ChatEngine, ContextBuilder, SessionManager
│   │   │   ├── llm/                 ← LLMGateway, AnthropicAdapter
│   │   │   ├── rag/                 ← RAGEngine, Embedder, VectorStore, DocumentIndexer
│   │   │   ├── tools/               ← ToolRegistry, ToolExecutor, ConfirmationGate
│   │   │   ├── guard/               ← PromptGuard
│   │   │   ├── error/               ← ErrorHandler
│   │   │   └── types/               ← index.ts (공통 타입)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── chatbot-ui/                  ← React UI 공통 컴포넌트 (@company/chatbot-ui)
│       ├── src/
│       │   ├── components/          ← ChatWidget, MessageBubble, ToolResultCard 등
│       │   ├── store/               ← chatStore.ts (Zustand)
│       │   ├── hooks/               ← useChatbot, useChatHistory, useFeedback 등
│       │   └── styles/              ← chatbot.css (LUON AI 토큰 alias)
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── saas/                        ← SaaS 프로젝트 (Next.js 14)
│   ├── customer-support/            ← 고객지원 프로젝트 (Next.js 14)
│   └── internal-tool/               ← 사내도구 프로젝트 (Next.js 14)
│
├── .npmrc                           ← pnpm 설정
├── pnpm-workspace.yaml              ← workspace 패키지 경로 정의
├── package.json                     ← 루트 package.json (scripts만)
└── tsconfig.base.json               ← 공통 TypeScript 설정
```

---

## 2. 사전 요구사항

아래 도구가 설치되어 있는지 확인한다.

```bash
# Node.js 버전 확인 (18.17 이상 필요)
node -v   # v20.x.x 권장

# pnpm 설치 (없는 경우)
npm install -g pnpm

# pnpm 버전 확인 (8.x 이상)
pnpm -v

# Git 확인
git --version
```

---

## 3. 루트 초기화

### 3.1 루트 디렉토리 생성 및 Git 초기화

```bash
mkdir luon-chatbot && cd luon-chatbot
git init
```

### 3.2 `.npmrc` 생성

```ini
# .npmrc
shamefully-hoist=false
strict-peer-dependencies=false
auto-install-peers=true
```

### 3.3 `pnpm-workspace.yaml` 생성

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
  - "apps/*"
```

### 3.4 루트 `package.json` 생성

```json
{
  "name": "luon-chatbot",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev":             "pnpm --parallel --filter './apps/*' dev",
    "dev:saas":        "pnpm --filter saas dev",
    "dev:support":     "pnpm --filter customer-support dev",
    "dev:internal":    "pnpm --filter internal-tool dev",
    "build":           "pnpm --filter './packages/*' build && pnpm --filter './apps/*' build",
    "build:pkgs":      "pnpm --filter './packages/*' build",
    "test":            "pnpm --recursive run test",
    "test:unit":       "pnpm --filter chatbot-core test",
    "test:component":  "pnpm --filter chatbot-ui test",
    "test:e2e":        "pnpm --filter saas test:e2e",
    "lint":            "pnpm --recursive run lint",
    "typecheck":       "pnpm --recursive run typecheck",
    "clean":           "pnpm --recursive run clean && rm -rf node_modules"
  },
  "engines": {
    "node": ">=18.17.0",
    "pnpm": ">=8.0.0"
  },
  "devDependencies": {
    "typescript": "5.6.3"
  }
}
```

### 3.5 `.gitignore` 생성

```gitignore
# .gitignore

# dependencies
node_modules/
.pnpm-store/

# Next.js
.next/
out/

# Build
dist/
build/

# env
.env
.env.local
.env.*.local

# logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Test
coverage/
playwright-report/
test-results/
```

---

## 4. 패키지 구성 — chatbot-core

### 4.1 디렉토리 생성

```bash
mkdir -p packages/chatbot-core/src/{engine,llm,rag,tools,guard,error,types,schemas}
```

### 4.2 `packages/chatbot-core/package.json`

```json
{
  "name": "@company/chatbot-core",
  "version": "0.1.0",
  "private": true,
  "description": "AI Chatbot 공통 서버 로직 — LLM Gateway, RAG Engine, Tool Registry",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".":          { "import": "./dist/index.js",          "types": "./dist/index.d.ts" },
    "./engine":   { "import": "./dist/engine/index.js",   "types": "./dist/engine/index.d.ts" },
    "./llm":      { "import": "./dist/llm/index.js",      "types": "./dist/llm/index.d.ts" },
    "./rag":      { "import": "./dist/rag/index.js",      "types": "./dist/rag/index.d.ts" },
    "./tools":    { "import": "./dist/tools/index.js",    "types": "./dist/tools/index.d.ts" },
    "./guard":    { "import": "./dist/guard/index.js",    "types": "./dist/guard/index.d.ts" },
    "./error":    { "import": "./dist/error/index.js",    "types": "./dist/error/index.d.ts" },
    "./schemas":  { "import": "./dist/schemas/index.js",  "types": "./dist/schemas/index.d.ts" },
    "./types":    { "import": "./dist/types/index.js",    "types": "./dist/types/index.d.ts" }
  },
  "scripts": {
    "build":      "tsc --project tsconfig.json",
    "build:watch":"tsc --project tsconfig.json --watch",
    "typecheck":  "tsc --noEmit",
    "test":       "vitest run",
    "test:watch": "vitest",
    "lint":       "eslint src --ext .ts",
    "clean":      "rm -rf dist"
  },
  "dependencies": {
    "@anthropic-ai/sdk":             "^0.27.0",
    "@pinecone-database/pinecone":   "^3.0.0",
    "@upstash/redis":                "^1.34.0",
    "@upstash/ratelimit":            "^2.0.0",
    "openai":                        "^4.67.0",
    "zod":                           "^3.23.8",
    "pdf-parse":                     "^1.1.1",
    "mammoth":                       "^1.8.0"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "vitest":     "^2.1.0",
    "@types/node":"^22.0.0",
    "@types/pdf-parse": "^1.1.4"
  }
}
```

### 4.3 `packages/chatbot-core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir":    "./src",
    "outDir":     "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap":  true
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

### 4.4 `packages/chatbot-core/src/types/index.ts` — 초기 파일

```typescript
// ============================================================
// @company/chatbot-core — 공통 타입 정의 v1.0
// ⚠️  변경 시 모든 프로젝트 영향도 검토 필수
// ============================================================

export type ErrorCode =
  | "AUTH_ERROR" | "FORBIDDEN" | "INVALID_INPUT"
  | "PROMPT_INJECTION" | "INPUT_TOO_LONG" | "RATE_LIMIT"
  | "LLM_ERROR" | "TOOL_ERROR" | "RAG_ERROR"
  | "NETWORK_ERROR" | "INTERNAL_ERROR";

export type ChatError = {
  code:        ErrorCode;
  message:     string;
  retryable:   boolean;
  retryAfter?: number;
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

export type RAGSource = {
  title:  string;
  url?:   string;
  score:  number;
  chunk?: string;
};

export type SSEEvent =
  | { type: "chunk";       content: string }
  | { type: "tool_start";  toolName: string }
  | { type: "tool_result"; toolName: string; result: unknown }
  | { type: "done";        messageId: string }
  | { type: "error" } & ChatError;

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolInputSchema {
  type:       "object";
  properties: Record<string, { type: string; description: string; enum?: string[] }>;
  required?:  string[];
}

export interface ToolDefinition {
  name:                  string;
  description:           string;
  inputSchema:           ToolInputSchema;
  handler:               ToolHandler;
  requiresConfirmation?: boolean;
  dangerLevel?:          "low" | "medium" | "high";
}

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

export interface ChatSession {
  sessionId:  string;
  userId:     string;
  projectId:  string;
  messages:   ChatMessage[];
  createdAt:  number;
  updatedAt:  number;
  summary?:   string;
}

export interface FeedbackPayload {
  messageId: string;
  sessionId: string;
  feedback:  "up" | "down";
  reason?:   string;
}

export interface RAGSearchResult {
  sources:    RAGSource[];
  context:    string;
  hasResults: boolean;
}
```

### 4.5 `packages/chatbot-core/src/index.ts`

```typescript
// 진입점 — 외부 노출 항목
export * from "./types";
export * from "./schemas";
```

---

## 5. 패키지 구성 — chatbot-ui

### 5.1 디렉토리 생성

```bash
mkdir -p packages/chatbot-ui/src/{components,store,hooks,styles,providers}
```

### 5.2 `packages/chatbot-ui/package.json`

```json
{
  "name": "@company/chatbot-ui",
  "version": "0.1.0",
  "private": true,
  "description": "AI Chatbot 공통 React UI — LUON AI Design System 기반",
  "main":  "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".":            "./src/index.ts",
    "./styles/*":   "./src/styles/*",
    "./providers":  "./src/providers/index.ts"
  },
  "scripts": {
    "typecheck":  "tsc --noEmit",
    "test":       "vitest run",
    "test:watch": "vitest",
    "lint":       "eslint src --ext .ts,.tsx",
    "clean":      "rm -rf dist"
  },
  "peerDependencies": {
    "react":     ">=18",
    "react-dom": ">=18",
    "next":      ">=14"
  },
  "dependencies": {
    "@company/chatbot-core": "workspace:*",
    "zustand":                "^5.0.0",
    "@tanstack/react-query":  "^5.59.0",
    "react-markdown":         "^9.0.0",
    "remark-gfm":             "^4.0.0",
    "recharts":               "^2.13.0",
    "nanoid":                 "^5.0.0"
  },
  "devDependencies": {
    "typescript":                  "5.6.3",
    "vitest":                      "^2.1.0",
    "@vitejs/plugin-react":        "^4.3.0",
    "@testing-library/react":      "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@testing-library/jest-dom":   "^6.5.0",
    "msw":                         "^2.4.0",
    "@types/react":                "^18.3.0",
    "@types/react-dom":            "^18.3.0"
  }
}
```

> **Note:** `chatbot-ui`는 Next.js App Router 환경에서 소스 코드를 직접 참조(`src/index.ts`)하므로
> 별도 빌드 없이 사용한다. TypeScript 컴파일은 각 앱의 Next.js 빌드에 위임한다.

### 5.3 `packages/chatbot-ui/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 5.4 `packages/chatbot-ui/src/index.ts`

```typescript
// 외부 노출 컴포넌트 & 훅
export { ChatWidget }           from "./components/ChatWidget";
export { ChatWindow }           from "./components/ChatWindow";
export { MessageBubble }        from "./components/MessageBubble";
export { MessageInput }         from "./components/MessageInput";
export { ToolResultCard }       from "./components/ToolResultCard";
export { ConfirmationDialog }   from "./components/ConfirmationDialog";
export { ErrorMessage }         from "./components/ErrorMessage";
export { FeedbackButtons }      from "./components/FeedbackButtons";
export { DataChart }            from "./components/DataChart";
export { MarkdownRenderer }     from "./components/MarkdownRenderer";
export { TypingIndicator }      from "./components/TypingIndicator";

export { useChatbot }           from "./hooks/useChatbot";
export { useChatHistory }       from "./hooks/useChatHistory";
export { useFeedback }          from "./hooks/useFeedback";
export { useScrollToBottom }    from "./hooks/useScrollToBottom";

export { useChatStore }         from "./store/chatStore";
```

### 5.5 `packages/chatbot-ui/src/styles/chatbot.css`

```css
/* LUON AI 디자인 토큰 → 챗봇 컨텍스트 alias
   04-design-system-spec-v2.md 기준 */
:root {
  --chat-bg:             var(--bg-surface);
  --chat-header-bg:      var(--bg-subtle);
  --chat-header-border:  var(--border-subtle);
  --chat-footer-bg:      var(--bg-surface);
  --chat-footer-border:  var(--border-subtle);

  --bubble-user-bg:      var(--taupe-500);
  --bubble-user-text:    var(--text-inverse);
  --bubble-user-radius:  var(--radius-lg);

  --bubble-bot-bg:       var(--bg-subtle);
  --bubble-bot-text:     var(--text-primary);
  --bubble-bot-radius:   var(--radius-lg);

  --bubble-tool-bg:      var(--bg-surface);
  --bubble-tool-border:  var(--border-subtle);
  --bubble-tool-radius:  var(--radius-md);

  --input-bg:            var(--bg-surface);
  --input-border:        var(--border-default);
  --input-border-focus:  var(--taupe-500);
  --input-shadow-focus:  rgba(85,73,64,0.12);
  --input-text:          var(--text-primary);
  --input-placeholder:   var(--text-tertiary);
  --input-radius:        var(--radius-sm);

  --chat-text-muted:     var(--text-tertiary);
  --chat-error-bg:       #fef2f2;
  --chat-error-border:   #fecaca;
  --chat-error-text:     var(--color-error);

  --chat-fab-bg:         var(--taupe-500);
  --chat-fab-bg-hover:   var(--taupe-600);
  --chat-fab-icon:       var(--text-inverse);
  --chat-fab-shadow:     var(--shadow-lg);

  --chat-widget-width:        400px;
  --chat-widget-height:       600px;
  --chat-header-height:       56px;
  --chat-input-min-height:    52px;
  --chat-fab-size:            56px;
  --chat-fab-bottom:          24px;
  --chat-fab-right:           24px;
  --chat-z-index:             50;
  --chat-widget-width-mobile:  100vw;
  --chat-widget-height-mobile: 100dvh;
}

.dark {
  --chat-bg:            #2b2b2b;
  --chat-header-bg:     #1f1b18;
  --chat-header-border: #444444;
  --chat-footer-bg:     #2b2b2b;
  --chat-footer-border: #444444;
  --bubble-bot-bg:      #1f1b18;
  --bubble-bot-text:    #ffffff;
  --bubble-tool-bg:     #2b2b2b;
  --bubble-tool-border: #444444;
  --input-bg:           #2b2b2b;
  --input-border:       #555555;
  --input-text:         #ffffff;
  --input-placeholder:  #b3b3b3;
  --chat-text-muted:    #b3b3b3;
  --chat-error-bg:      #450a0a;
  --chat-error-border:  #7f1d1d;
}

@media (prefers-reduced-motion: reduce) {
  .chat-widget *, .chat-widget *::before, .chat-widget *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 5.6 `packages/chatbot-ui/src/providers/index.tsx`

```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60 * 5, retry: 1 },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

---

## 6. 앱 구성 — Next.js 프로젝트

3개 앱을 동일한 방식으로 생성한다. 아래는 `saas` 기준이며, `customer-support` / `internal-tool`은 `saas` 자리만 교체한다.

### 6.1 Next.js 앱 생성

```bash
cd apps

# saas 앱 생성
pnpm create next-app@14 saas \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git

# 나머지 앱 동일하게 생성
pnpm create next-app@14 customer-support --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
pnpm create next-app@14 internal-tool    --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

### 6.2 `apps/saas/package.json` 수정

```json
{
  "name": "saas",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":       "next dev --port 3001",
    "build":     "next build",
    "start":     "next start",
    "lint":      "next lint",
    "typecheck": "tsc --noEmit",
    "test":      "vitest run",
    "test:e2e":  "playwright test"
  },
  "dependencies": {
    "@company/chatbot-core": "workspace:*",
    "@company/chatbot-ui":   "workspace:*",
    "next":                  "14.2.0",
    "react":                 "^18.3.0",
    "react-dom":             "^18.3.0",
    "@anthropic-ai/sdk":     "^0.27.0",
    "@upstash/redis":        "^1.34.0",
    "@upstash/ratelimit":    "^2.0.0",
    "zod":                   "^3.23.8",
    "next-auth":             "^4.24.0"
  },
  "devDependencies": {
    "typescript":            "5.6.3",
    "@types/node":           "^22.0.0",
    "@types/react":          "^18.3.0",
    "@types/react-dom":      "^18.3.0",
    "vitest":                "^2.1.0",
    "@playwright/test":      "^1.48.0",
    "eslint":                "^8.57.0",
    "eslint-config-next":    "14.2.0"
  }
}
```

> **포트 규칙:**
> - `saas`: 3001
> - `customer-support`: 3002
> - `internal-tool`: 3003

### 6.3 `apps/saas/tsconfig.json` 수정

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 6.4 `apps/saas/src/` 기본 구조

```bash
mkdir -p apps/saas/src/{app/api/chat/{history,reset,feedback},app/api/rag/index,chatbot/tools}
```

```
apps/saas/src/
├── app/
│   ├── layout.tsx             ← QueryProvider + ChatWidget 마운트
│   ├── page.tsx
│   └── api/
│       ├── chat/
│       │   ├── route.ts       ← POST: 스트리밍
│       │   ├── history/
│       │   │   └── route.ts   ← GET: 기록 조회
│       │   ├── reset/
│       │   │   └── route.ts   ← POST: 초기화
│       │   └── feedback/
│       │       └── route.ts   ← POST: 피드백
│       └── rag/
│           └── index/
│               └── route.ts   ← POST: 문서 인덱싱 (관리자)
├── chatbot/
│   ├── chatbot.config.ts      ← 챗봇 설정 파일
│   └── tools/
│       └── index.ts           ← 프로젝트별 Tool 정의
└── globals.css                ← LUON AI 토큰 + shadcn/ui 오버라이드
```

### 6.5 `apps/saas/src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { QueryProvider } from "@company/chatbot-ui/providers";
import { chatbotConfig } from "@/chatbot/chatbot.config";
import "@company/chatbot-ui/styles/chatbot.css";
import "./globals.css";

const ChatWidget = dynamic(
  () => import("@company/chatbot-ui").then((m) => m.ChatWidget),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "SaaS — LUON AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>
          {children}
          <ChatWidget config={chatbotConfig.ui} />
        </QueryProvider>
      </body>
    </html>
  );
}
```

### 6.6 `apps/saas/src/chatbot/chatbot.config.ts`

```typescript
import type { ChatbotConfig } from "@company/chatbot-core";

export const chatbotConfig: ChatbotConfig = {
  projectId: "saas",
  llm: {
    provider:    "anthropic",
    model:       "claude-sonnet-4-20250514",
    maxTokens:   2048,
    temperature: 0.3,
  },
  systemPrompt: `
    당신은 SaaS 서비스의 AI 어시스턴트입니다.
    - 데이터 변경 전 반드시 사용자 확인을 요청합니다.
    - 조회 결과는 표 또는 차트로 정리합니다.
    - 모호한 요청은 되물어봅니다.
  `,
  conversation: {
    maxHistoryLength: 10,
    sessionTimeout:   30 * 60 * 1000,
    historyStrategy:  "sliding",
    welcomeMessage:   "안녕하세요! 무엇을 도와드릴까요?",
  },
  ui: {
    theme:    "light",
    botName:  "AI 어시스턴트",
    position: "bottom-right",
    placeholder: "메시지를 입력하세요...",
  },
  rag:      { enabled: false },
  tools:    [],
  features: { feedback: true, exportHistory: true, streaming: true },
};
```

---

## 7. TypeScript 공통 설정

### 7.1 `tsconfig.base.json` (루트)

```json
{
  "compilerOptions": {
    "target":              "ES2020",
    "module":              "ESNext",
    "moduleResolution":    "bundler",
    "lib":                 ["ES2020", "dom"],
    "strict":              true,
    "esModuleInterop":     true,
    "skipLibCheck":        true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule":   true,
    "isolatedModules":     true,
    "allowImportingTsExtensions": false,
    "paths": {
      "@company/chatbot-core":          ["./packages/chatbot-core/src"],
      "@company/chatbot-core/*":        ["./packages/chatbot-core/src/*"],
      "@company/chatbot-ui":            ["./packages/chatbot-ui/src"],
      "@company/chatbot-ui/*":          ["./packages/chatbot-ui/src/*"],
      "@company/chatbot-ui/styles/*":   ["./packages/chatbot-ui/src/styles/*"],
      "@company/chatbot-ui/providers":  ["./packages/chatbot-ui/src/providers"]
    }
  }
}
```

---

## 8. Tailwind & shadcn/ui 공통 설정

### 8.1 각 앱의 `tailwind.config.ts`

```typescript
// apps/saas/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    // ⬇️ 공통 UI 패키지 경로 추가 (필수)
    "../../packages/chatbot-ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "chat-slide-in":  {
          from: { opacity: "0", transform: "translateX(100%)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "message-appear": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "cursor-blink": {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0" },
        },
        "dot-bounce": {
          "0%,100%": { transform: "translateY(0)" },
          "50%":     { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "chat-slide-in":  "chat-slide-in 250ms cubic-bezier(0.16,1,0.3,1)",
        "message-appear": "message-appear 150ms cubic-bezier(0.16,1,0.3,1)",
        "cursor-blink":   "cursor-blink 600ms step infinite",
        "dot-bounce":     "dot-bounce 600ms ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

### 8.2 각 앱의 `globals.css`

```css
/* apps/saas/src/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── LUON AI 디자인 토큰 ── */
:root {
  --taupe-50:  #f5f0ec; --taupe-100: #e8ddd6; --taupe-200: #d4c0b3;
  --taupe-300: #bfa091; --taupe-400: #8a6e62; --taupe-500: #554940;
  --taupe-600: #433a33; --taupe-700: #312b27; --taupe-800: #1f1b18;

  --green-50:  #f0f3ee; --green-200: #bbc9b3; --green-400: #879a77;
  --green-500: #6e8060; --green-600: #55654a; --green-700: #3d4a35;

  --gray-100: #eceae7; --gray-200: #dddbd7; --gray-300: #c5c6c7;
  --gray-400: #a8a9aa; --gray-500: #73787c;

  --color-error:   #dc2626;
  --color-success: #879a77;
  --color-warning: #c9ad93;

  --bg-page:    #f5f4f2;
  --bg-surface: #ffffff;
  --bg-subtle:  #eceae7;

  --text-primary:   #000000;
  --text-secondary: #73787c;
  --text-tertiary:  #a8a9aa;
  --text-inverse:   #ffffff;

  --border-subtle:  #dddbd7;
  --border-default: #c5c6c7;

  --radius-xs:   4px; --radius-sm: 6px;  --radius-md: 10px;
  --radius-lg:   16px;--radius-xl: 24px; --radius-full: 9999px;

  --shadow-sm: 0 1px 3px rgba(85,73,64,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(85,73,64,0.12), 0 2px 4px rgba(0,0,0,0.05);
  --shadow-lg: 0 12px 32px rgba(85,73,64,0.16), 0 4px 8px rgba(0,0,0,0.06);
  --shadow-xl: 0 24px 64px rgba(85,73,64,0.20), 0 8px 16px rgba(0,0,0,0.08);

  /* shadcn/ui 변수 → LUON AI 토큰 매핑 */
  --primary:             var(--taupe-500);
  --primary-foreground:  white;
  --secondary:           var(--green-50);
  --secondary-foreground:var(--green-700);
  --accent:              var(--bg-subtle);
  --accent-foreground:   var(--text-primary);
  --destructive:         var(--color-error);
  --border:              var(--border-default);
  --ring:                var(--taupe-500);
  --radius:              var(--radius-sm);
  --background:          var(--bg-surface);
  --foreground:          var(--text-primary);
  --muted:               var(--bg-subtle);
  --muted-foreground:    var(--text-secondary);
}

.dark {
  --bg-page:    #1f1b18;
  --bg-surface: #2b2b2b;
  --bg-subtle:  #333333;
  --text-primary:   #ffffff;
  --text-secondary: #d4d4d4;
  --text-tertiary:  #b3b3b3;
  --border-subtle:  #444444;
  --border-default: #555555;
  --background:     var(--bg-surface);
  --foreground:     var(--text-primary);
  --border:         var(--border-default);
  --muted:          var(--bg-subtle);
  --muted-foreground: var(--text-secondary);
}

body {
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: 'Pretendard', -apple-system, sans-serif;
}
```

### 8.3 shadcn/ui 초기화

```bash
# 각 앱에서 실행
cd apps/saas
pnpm dlx shadcn-ui@latest init

# 챗봇에 필요한 컴포넌트 추가
pnpm dlx shadcn-ui@latest add sheet drawer alert-dialog button textarea input badge avatar skeleton
```

---

## 9. 빌드 파이프라인

### 9.1 빌드 순서

```
루트에서 실행:
  pnpm build

내부 실행 순서:
  1. packages/chatbot-core  → tsc 빌드 (dist/ 생성)
  2. packages/chatbot-ui    → 빌드 없음 (소스 직접 참조)
  3. apps/*                 → next build
```

### 9.2 `chatbot-core` 빌드 확인

```bash
# 패키지 빌드
pnpm --filter @company/chatbot-core build

# 빌드 결과 확인
ls packages/chatbot-core/dist/
# → index.js  index.d.ts  types/  engine/  ...
```

### 9.3 타입 체크 (전체)

```bash
# 모든 패키지·앱 타입 체크
pnpm typecheck

# 특정 패키지만
pnpm --filter @company/chatbot-core typecheck
pnpm --filter saas typecheck
```

### 9.4 Vitest 설정 (루트)

```typescript
// vitest.config.ts (루트)
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment:  "jsdom",
    globals:      true,
    setupFiles:   ["./tests/setup.ts"],
    coverage: {
      provider:   "v8",
      reporter:   ["text", "html"],
      thresholds: { lines: 80, functions: 80, branches: 75 },
      include: [
        "packages/chatbot-core/src/**",
        "packages/chatbot-ui/src/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@company/chatbot-core": path.resolve(__dirname, "./packages/chatbot-core/src"),
      "@company/chatbot-ui":   path.resolve(__dirname, "./packages/chatbot-ui/src"),
    },
  },
});
```

```typescript
// tests/setup.ts
import "@testing-library/jest-dom";
```

---

## 10. 개발 서버 실행

### 10.1 전체 설치 및 첫 실행

```bash
# 루트에서 전체 의존성 설치
pnpm install

# chatbot-core 빌드 (최초 1회 필수)
pnpm build:pkgs

# 전체 앱 개발 서버 동시 실행
pnpm dev
```

### 10.2 단일 앱만 실행

```bash
pnpm dev:saas        # localhost:3001
pnpm dev:support     # localhost:3002
pnpm dev:internal    # localhost:3003
```

### 10.3 `chatbot-core` 변경 시 워크플로

```bash
# packages/chatbot-core 코드 수정 후
pnpm build:pkgs      # 재빌드
# 앱 dev 서버가 자동 감지 (Next.js HMR)
```

> **Tip:** `chatbot-core`를 자주 수정하는 개발 단계에서는 watch 모드 사용
>
> ```bash
> # 터미널 1
> pnpm --filter @company/chatbot-core build:watch
>
> # 터미널 2
> pnpm dev:saas
> ```

---

## 11. 환경 변수 구성

### 11.1 파일 위치 및 우선순위

```
apps/saas/
├── .env               ← 공통 (git 커밋 — 민감 정보 없음)
├── .env.local         ← 로컬 개발용 (git 제외) ← 최우선
├── .env.development   ← 개발 환경
├── .env.staging       ← 스테이징 (Vercel 환경 변수로 관리)
└── .env.production    ← 프로덕션 (Vercel 환경 변수로 관리)
```

### 11.2 `apps/saas/.env` (git 커밋 가능 — 비밀 아닌 값만)

```bash
# .env
NEXT_PUBLIC_APP_NAME=LUON AI SaaS
NEXT_PUBLIC_BOT_NAME=AI 어시스턴트
```

### 11.3 `apps/saas/.env.local` (git 제외 — 민감 정보)

```bash
# .env.local — 절대 커밋 금지

# LLM
ANTHROPIC_API_KEY=sk-ant-api03-...

# Redis
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# 인증
NEXTAUTH_SECRET=your-32-char-random-secret
NEXTAUTH_URL=http://localhost:3001

# RAG (사용 시)
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
OPENAI_API_KEY=sk-proj-...

# 모니터링 (선택)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### 11.4 환경 변수 타입 정의

```typescript
// apps/saas/src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    ANTHROPIC_API_KEY:       string;
    UPSTASH_REDIS_REST_URL:  string;
    UPSTASH_REDIS_REST_TOKEN:string;
    NEXTAUTH_SECRET:         string;
    NEXTAUTH_URL:            string;
    PINECONE_API_KEY?:       string;
    PINECONE_ENVIRONMENT?:   string;
    OPENAI_API_KEY?:         string;
    SENTRY_DSN?:             string;
  }
}
```

---

## 12. 패키지 간 의존성 추가 방법

### 12.1 공통 패키지에 의존성 추가

```bash
# chatbot-core에 패키지 추가
pnpm --filter @company/chatbot-core add some-package

# chatbot-ui에 패키지 추가
pnpm --filter @company/chatbot-ui add some-package

# 특정 앱에만 추가
pnpm --filter saas add some-package
```

### 12.2 전체 공통 devDependency 추가 (루트)

```bash
pnpm add -D some-dev-package -w   # -w = workspace root
```

### 12.3 앱에서 공통 패키지 참조 확인

```bash
# 의존성 그래프 확인
pnpm why @company/chatbot-core --filter saas
```

---

## 13. 초기 세팅 완료 체크리스트

```
루트 설정
  □ luon-chatbot/ 디렉토리 생성 및 git init
  □ .npmrc, pnpm-workspace.yaml 생성
  □ 루트 package.json (scripts 포함)
  □ tsconfig.base.json (paths 포함)
  □ .gitignore

chatbot-core 패키지
  □ packages/chatbot-core/package.json
  □ packages/chatbot-core/tsconfig.json
  □ src/types/index.ts (전체 타입 정의)
  □ src/index.ts (진입점)
  □ pnpm build 성공 확인

chatbot-ui 패키지
  □ packages/chatbot-ui/package.json
  □ packages/chatbot-ui/tsconfig.json
  □ src/index.ts (진입점)
  □ src/styles/chatbot.css (LUON AI 토큰 alias)
  □ src/providers/index.tsx (QueryProvider)

saas 앱
  □ next-app 생성 (포트 3001)
  □ package.json 수정 (workspace:* 의존성 포함)
  □ tsconfig.json 수정
  □ tailwind.config.ts (chatbot-ui 경로 포함)
  □ globals.css (LUON AI 토큰 + shadcn 오버라이드)
  □ shadcn/ui 초기화 및 필요 컴포넌트 추가
  □ src/ 디렉토리 구조 생성
  □ chatbot.config.ts 작성
  □ app/layout.tsx (QueryProvider + ChatWidget)
  □ .env.local 생성

customer-support 앱 (포트 3002)
  □ (saas와 동일 절차)

internal-tool 앱 (포트 3003)
  □ (saas와 동일 절차)

전체 검증
  □ pnpm install 성공
  □ pnpm build:pkgs 성공 (chatbot-core dist/ 생성)
  □ pnpm typecheck 오류 없음
  □ pnpm dev:saas → localhost:3001 접속 확인
  □ ChatWidget FAB 화면에 표시 확인
```

---

## 14. 트러블슈팅

### `Cannot find module '@company/chatbot-core'`

```bash
# 원인: chatbot-core 빌드 안 됨
pnpm build:pkgs

# tsconfig paths 누락 확인
# tsconfig.base.json의 paths에 @company/* 포함 여부 체크
```

### `chatbot-ui` 컴포넌트 Tailwind 스타일 미적용

```bash
# 원인: tailwind.config.ts content에 chatbot-ui 경로 누락
# 해결: 아래 경로 추가
"../../packages/chatbot-ui/src/**/*.{ts,tsx}"
```

### `pnpm install` 후 peer dependency 경고

```ini
# .npmrc에 추가
auto-install-peers=true
strict-peer-dependencies=false
```

### `chatbot-core` 수정 후 앱에 반영 안 됨

```bash
# chatbot-core 재빌드 필요
pnpm --filter @company/chatbot-core build
# Next.js 개발 서버 재시작
```

### `dark:` Tailwind 클래스 미작동

```javascript
// tailwind.config.ts
const config = {
  darkMode: ["class"],  // ← class 방식으로 설정
  ...
}
```

---

*이 문서는 2026-03-29 기준이며, 패키지 버전 업데이트 시 함께 갱신합니다.*
