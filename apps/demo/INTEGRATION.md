# 외부 서비스 챗봇 연동 가이드

## 아키텍처

```
[서비스 A]  ─── ChatWidget ──→ ┌──────────────────────┐
[서비스 B]  ─── ChatWidget ──→ │  중앙 챗봇 서버       │
[서비스 C]  ─── ChatWidget ──→ │  (이 앱)              │
                               └──────────────────────┘
```

각 서비스는 `@company/chatbot-ui` 패키지만 설치하고, 중앙 서버의 API를 가리키면 됩니다.

---

## 1. 패키지 설치 (외부 서비스)

```bash
npm install @company/chatbot-ui @company/chatbot-core
```

## 2. 위젯 삽입 (React)

```tsx
import { ChatWidget } from "@company/chatbot-ui";
import "@company/chatbot-ui/styles.css";

function App() {
  return (
    <ChatWidget
      config={{
        projectId: "esg-on",
        ui: {
          botName: "ESG 어시스턴트",
          theme: "auto",
          position: "bottom-right",
          placeholder: "질문을 입력하세요...",
        },
        conversation: {
          welcomeMessage: "안녕하세요! 무엇을 도와드릴까요?",
        },
      }}
      apiPath="https://chatbot.luon.com/api/chat"
      confirmPath="https://chatbot.luon.com/api/chat/confirm"
      getAccessToken={() => localStorage.getItem("chat-token")}
      onUnauthorized={() => {
        localStorage.removeItem("chat-token");
        window.location.href = "/login";
      }}
    />
  );
}
```

## 3. 인증 (JWT Bearer)

중앙 서버는 `Authorization: Bearer <token>` 헤더로 인증합니다.

### 토큰 발급 (서비스 백엔드)

서비스 백엔드에서 중앙 서버와 공유하는 시크릿(`CHAT_JWT_SECRET`)으로 JWT를 서명합니다.

```typescript
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.CHAT_JWT_SECRET);

async function issueChatToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}
```

### 클라이언트에서 토큰 전달

```tsx
<ChatWidget
  getAccessToken={() => localStorage.getItem("chat-token")}
  // ...
/>
```

## 4. 중앙 서버 설정

### 4-1. CORS 허용 오리진 등록

`.env.local`에 서비스 도메인을 추가합니다.

```bash
CHAT_ALLOWED_ORIGINS=https://esg.luon.com,https://mes.luon.com
```

### 4-2. 서비스 등록 (services.json)

`config/services.json`에 새 서비스 항목을 추가합니다.

```json
{
  "id": "new-service",
  "label": "새 서비스",
  "description": "서비스 설명",
  "config": {
    "projectId": "new-service",
    "llm": { "provider": "anthropic", "model": "claude-sonnet-4-20250514", "maxTokens": 2048, "temperature": 0.3 },
    "systemPrompt": "당신은 ...",
    "conversation": { "maxHistoryLength": 12, "sessionTimeout": 1800000, "historyStrategy": "sliding", "welcomeMessage": "안녕하세요." },
    "ui": { "theme": "auto", "botName": "어시스턴트", "position": "bottom-right" }
  }
}
```

### 4-3. 설정 리로드 (서버 재시작 없이)

```bash
curl -X POST https://chatbot.luon.com/api/config/reload \
  -H "Authorization: Bearer <admin-token>"
```

### 4-4. LLM 설정

- `ANTHROPIC_API_KEY`: Claude 스트리밍
- `OPENAI_API_KEY`: GPT 스트리밍 (config에서 `provider: "openai"` 설정 시)
- 키 없으면 자동으로 플레이스홀더 모드
- 상태 확인: `GET /api/config/llm-status`

## 5. ChatWidget Props 레퍼런스

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `config` | `ChatWidgetConfig \| ChatbotConfig` | O | 프로젝트 ID + UI 설정 |
| `apiPath` | `string` | - | 채팅 API URL (기본: `/api/chat`) |
| `confirmPath` | `string` | - | 도구 확인 API URL |
| `getAccessToken` | `() => string \| null` | - | Bearer 토큰 반환 함수 |
| `onUnauthorized` | `() => void` | - | 401 응답 시 콜백 |
| `mockResponses` | `boolean` | - | API 없이 UI 데모 |

## 6. ChatWidgetConfig (경량 타입)

외부 서비스에서는 서버 전용 필드가 필요 없습니다.

```typescript
interface ChatWidgetConfig {
  projectId: string;
  ui: {
    botName: string;         // 필수
    theme?: "light" | "dark" | "auto";
    position?: "bottom-right" | "bottom-left";
    primaryColor?: string;
    placeholder?: string;
  };
  features?: { feedback?: boolean; exportHistory?: boolean; };
  conversation?: { welcomeMessage?: string; };
}
```

## 7. 운영

- **Redis** (다중 인스턴스): `UPSTASH_REDIS_REST_*` 설정 시 세션/rate limit 공유
- **Rate Limit**: projectId별 독립 적용 (30 req/min per user 기본)
- **CI**: `npm run build:packages && npm test && npm run build -w demo`

## 8. 체크리스트

- [ ] `@company/chatbot-ui` 설치됨
- [ ] `@company/chatbot-ui/styles.css` import됨
- [ ] `projectId`가 중앙 서버의 `services.json`에 등록됨
- [ ] 서비스 도메인이 `CHAT_ALLOWED_ORIGINS`에 추가됨
- [ ] JWT 시크릿(`CHAT_JWT_SECRET`)이 서비스 ↔ 중앙서버 간 공유됨
- [ ] `getAccessToken`이 유효한 JWT를 반환함
- [ ] `GET /api/config/projects`에서 등록된 projectId 확인됨
