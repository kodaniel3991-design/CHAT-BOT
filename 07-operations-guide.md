# 🛠️ 운영 가이드

> **버전:** v1.0  
> **작성일:** 2026-03-29  
> **대상:** 챗봇 시스템을 운영·관리하는 담당자

> **목적:** 배포 후 챗봇 시스템이 안정적으로 운영되도록 비용 관리, 모니터링,  
> 장애 대응, RAG 문서 관리, 성능 최적화 방법을 정의한다.

---

## 목차

1. [배포 전 체크리스트](#1-배포-전-체크리스트)
2. [환경별 인프라 구성](#2-환경별-인프라-구성)
3. [비용 관리](#3-비용-관리)
4. [모니터링 설정](#4-모니터링-설정)
5. [알림 설정](#5-알림-설정)
6. [장애 대응 Runbook](#6-장애-대응-runbook)
7. [RAG 문서 관리](#7-rag-문서-관리)
8. [성능 최적화](#8-성능-최적화)
9. [보안 운영](#9-보안-운영)
10. [정기 점검 항목](#10-정기-점검-항목)

---

## 1. 배포 전 체크리스트

```
인프라
  □ 환경 변수 전체 항목 Vercel/서버에 등록 완료
  □ Upstash Redis 인스턴스 생성 및 연결 확인
  □ Pinecone 인덱스 생성 (RAG 사용 시)
  □ Sentry 프로젝트 생성 및 DSN 등록

보안
  □ ANTHROPIC_API_KEY 서버 전용 환경 변수 확인 (NEXT_PUBLIC_ 없음)
  □ NEXTAUTH_SECRET 충분한 랜덤 값 설정 (32자 이상)
  □ Rate Limiting 설정 확인 (프로젝트별 한도)
  □ Prompt Injection 방어 동작 확인

데이터
  □ RAG 문서 최초 인덱싱 완료 (RAG 사용 시)
  □ Redis TTL 설정 확인 (세션 만료 시간)

모니터링
  □ Sentry 에러 알림 Slack 연동
  □ 응답 지연 알림 설정
  □ 토큰 사용량 일일 한도 알림 설정

기능
  □ 스테이징에서 기본 대화 플로우 검증
  □ 에러 시나리오 수동 테스트 완료
  □ 모바일 레이아웃 검증
```

---

## 2. 환경별 인프라 구성

| 리소스 | Development | Staging | Production |
|--------|-------------|---------|------------|
| **LLM** | Anthropic (개발 Key, 낮은 한도) | Anthropic (스테이징 Key) | Anthropic (운영 Key) |
| **Redis** | 로컬 Redis (Docker) | Upstash Dev 인스턴스 | Upstash Prod 인스턴스 |
| **Vector DB** | Pinecone Dev 인덱스 | Pinecone Staging 인덱스 | Pinecone Prod 인덱스 |
| **세션 TTL** | 10분 | 30분 | 프로젝트별 설정 |
| **Rate Limit** | 100회/분 (제한 없음 수준) | 실제 한도와 동일 | 프로젝트별 한도 |
| **Sentry** | 비활성 | 활성 (별도 프로젝트) | 활성 |

### Docker Compose (개발 환경 Redis)

```yaml
# docker-compose.dev.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

```bash
# 개발 환경 Redis 시작
docker compose -f docker-compose.dev.yml up -d
```

---

## 3. 비용 관리

### 3.1 Anthropic API 비용 구조

| 모델 | Input (1M 토큰) | Output (1M 토큰) |
|------|----------------|----------------|
| claude-sonnet-4 | $3.00 | $15.00 |

### 3.2 프로젝트별 일일 토큰 예산

| 프로젝트 | 예상 일일 요청 | 평균 토큰/요청 | 일일 예산 |
|---------|------------|-------------|---------|
| SaaS | 1,000회 | 2,000 토큰 | $6 |
| 고객 지원 | 3,000회 | 1,500 토큰 | $7 |
| 사내 도구 | 500회 | 2,500 토큰 | $2 |

> **기준:** 80% 도달 시 이메일 알림, 100% 도달 시 Slack + 이메일 동시 알림.

### 3.3 토큰 절감 전략

#### 히스토리 길이 제어

```typescript
// chatbot.config.ts — 토큰 절감 설정 예시
conversation: {
  maxHistoryLength: 10,        // 기본값보다 줄이면 비용 절감
  historyStrategy: "sliding",  // "summarize"보다 비용 낮음
}
```

#### RAG topK 최적화

```typescript
rag: {
  topK: 3,       // 5→3으로 줄이면 Context 토큰 약 40% 감소
  minScore: 0.80, // 높일수록 검색 결과 수 감소 → 토큰 절감
}
```

#### maxTokens 제한

```typescript
llm: {
  maxTokens: 1024,  // 2048→1024로 낮추면 최대 비용 절반
}
```

### 3.4 토큰 사용량 로깅

```typescript
// Route Handler — 토큰 사용량 기록
const response = await anthropic.messages.create({ ... });

// 사용량 로그 (DB 또는 로그 수집 시스템에 저장)
await logUsage({
  projectId:    config.projectId,
  sessionId,
  inputTokens:  response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  totalCost:    calculateCost(response.usage),
  timestamp:    new Date().toISOString(),
});
```

### 3.5 월별 비용 리포트 쿼리 예시

```sql
-- 프로젝트별 월간 토큰 사용량 및 비용
SELECT
  project_id,
  DATE_TRUNC('month', timestamp) AS month,
  SUM(input_tokens)  AS total_input,
  SUM(output_tokens) AS total_output,
  SUM(total_cost)    AS total_cost_usd
FROM chatbot_usage_logs
WHERE timestamp >= DATE_TRUNC('month', NOW())
GROUP BY project_id, month
ORDER BY total_cost_usd DESC;
```

---

## 4. 모니터링 설정

### 4.1 수집 메트릭 목록

| 메트릭 | 수집 방법 | 용도 |
|--------|---------|------|
| **응답 지연 (p50/p95/p99)** | Route Handler 타이머 | 성능 이상 탐지 |
| **에러율** | 에러 코드별 카운트 | 안정성 모니터링 |
| **토큰 사용량** | Anthropic 응답 `usage` 필드 | 비용 추적 |
| **RAG 검색 점수** | Vector DB 응답 score | RAG 품질 측정 |
| **Tool 실행 성공/실패율** | ToolExecutor 결과 | Tool 안정성 |
| **피드백 비율 (👍/👎)** | 피드백 API 수집 | 응답 품질 |
| **세션 수** | Redis 키 카운트 | 사용량 추적 |
| **Rate Limit 발생 횟수** | 429 응답 카운트 | 한도 적정성 검토 |

### 4.2 로그 구조

```typescript
// 모든 요청에 대해 아래 구조로 로그 기록
interface ChatRequestLog {
  timestamp:     string;    // ISO 8601
  projectId:     string;
  sessionId:     string;
  userId:        string;
  inputTokens:   number;
  outputTokens:  number;
  latencyMs:     number;    // 전체 응답 시간
  ragUsed:       boolean;
  ragScores:     number[];  // RAG 검색 결과 score 배열
  toolsCalled:   string[];  // 실행된 Tool 이름 목록
  errorCode?:    string;    // 에러 발생 시
  totalCostUsd:  number;
}
```

### 4.3 Sentry 설정

```typescript
// app/layout.tsx (서버 컴포넌트)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% 트레이스 샘플링 (비용 절감)

  // 챗봇 관련 에러 우선순위 설정
  beforeSend(event) {
    // LLM/Tool 에러는 항상 캡처
    if (event.tags?.errorCode === "LLM_ERROR" || event.tags?.errorCode === "TOOL_ERROR") {
      return event;
    }
    return event;
  },
});
```

### 4.4 자체 모니터링 대시보드 데이터 소스

```
대시보드 패널 구성

┌─────────────────────────────────────────────────────────┐
│  📊 챗봇 운영 대시보드                                    │
├──────────────┬──────────────┬──────────────┬────────────┤
│ 오늘 요청 수  │ 평균 응답 지연│  에러율       │ 오늘 비용   │
│   1,234      │    2.3s      │   0.8%       │  $4.20     │
├──────────────┴──────────────┴──────────────┴────────────┤
│  프로젝트별 토큰 사용량 (시간대별 막대 차트)               │
│  [SaaS ■] [고객지원 ■] [사내도구 ■]                      │
├─────────────────────────────────────────────────────────┤
│  응답 품질 (피드백 비율 추이)                             │
│  👍 94.2%  👎 5.8%                                      │
├─────────────────────────────────────────────────────────┤
│  RAG 검색 품질 (평균 유사도 점수)                         │
│  고객지원: 0.82  사내도구: 0.79                           │
├─────────────────────────────────────────────────────────┤
│  최근 에러 목록                                           │
│  [LLM_ERROR] 2분 전  [TOOL_ERROR] 15분 전               │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 알림 설정

### 5.1 알림 임계값 및 채널

| 지표 | 경고 임계값 | 위험 임계값 | 채널 |
|------|----------|----------|------|
| 에러율 | > 3% | > 5% | Slack |
| 응답 지연 P95 | > 7초 | > 10초 | Slack |
| 일일 토큰 비용 | 예산 80% | 예산 100% | 이메일 + Slack |
| Rate Limit 발생 | > 30회/시간 | > 50회/시간 | Slack |
| RAG 평균 score | < 0.72 | < 0.65 | 이메일 |
| 피드백 👎 비율 | > 15% | > 25% | 이메일 |

### 5.2 Slack 알림 메시지 형식

```
🚨 [위험] AI 챗봇 에러율 초과
프로젝트: 고객지원
에러율: 7.2% (임계값: 5%)
시간: 2026-03-29 14:32 KST
에러 분포:
  - LLM_ERROR: 45건
  - TOOL_ERROR: 12건
Sentry 확인: https://sentry.io/...
```

### 5.3 비용 초과 알림 예시

```
⚠️ [경고] 챗봇 일일 토큰 비용 80% 도달
프로젝트: SaaS
현재 비용: $4.82 / $6.00 (80.3%)
남은 예산: $1.18
예상 소진 시간: 약 3시간 후
조치 방법: maxTokens 또는 Rate Limit 조정 검토
```

---

## 6. 장애 대응 Runbook

### 6.1 장애 등급 정의

| 등급 | 기준 | 대응 시간 |
|------|------|---------|
| **P1 (긴급)** | 챗봇 전체 불가, 에러율 > 50% | 즉시 (15분 내) |
| **P2 (높음)** | 특정 프로젝트 불가, 에러율 > 20% | 30분 내 |
| **P3 (중간)** | 성능 저하, 에러율 > 5% | 2시간 내 |
| **P4 (낮음)** | 품질 저하 (피드백 👎 증가) | 당일 내 |

---

### 6.2 장애 유형별 대응 절차

#### 🔴 Anthropic API 전체 장애 (LLM_ERROR 급증)

```
1. Anthropic Status 페이지 확인
   https://status.anthropic.com

2. 에러 발생 확인
   - Sentry: LLM_ERROR 건수 급증 여부
   - 로그: "Anthropic API Error" 메시지

3. 즉각 대응
   □ chatbot.config.ts의 llm.provider를 "openai"로 임시 변경
   □ OPENAI_API_KEY 환경 변수 확인
   □ 배포 (Vercel: 환경 변수 변경 후 Redeploy)

4. 복구 확인
   - 기본 대화 테스트
   - 에러율 정상화 확인

5. 원복
   - Anthropic 서비스 복구 후 provider를 "anthropic"으로 원복
```

#### 🔴 Redis 연결 장애 (세션 저장 불가)

```
1. Upstash 대시보드 확인
   https://console.upstash.com

2. 증상 확인
   - 오류 로그: "Redis connection failed"
   - 증상: 대화 히스토리가 유지되지 않음

3. 즉각 대응
   옵션 A: Upstash 인스턴스 재시작
   옵션 B: 백업 Redis 인스턴스로 환경 변수 교체
     UPSTASH_REDIS_REST_URL=<백업 URL>
     UPSTASH_REDIS_REST_TOKEN=<백업 토큰>

4. 임시 Fallback (히스토리 없이 단발성 응답)
   - SessionManager에 메모리 폴백 모드 활성화
   - 사용자에게 "일시적으로 대화 기록이 유지되지 않을 수 있습니다" 안내

5. 복구 후 확인
   - 세션 저장/조회 정상 동작 확인
```

#### 🟡 RAG 검색 품질 저하 (score 급락)

```
1. 증상 확인
   - 모니터링: RAG 평균 score < 0.65
   - 사용자 피드백 👎 증가

2. 원인 분석
   □ 최근 문서 인덱싱 오류 여부 확인
   □ 쿼리 언어와 문서 언어 불일치 여부
   □ Pinecone 인덱스 벡터 수 확인

3. 대응
   원인 A (인덱싱 오류): 문서 재인덱싱 실행
     POST /api/rag/index (관리자 토큰 사용)

   원인 B (minScore 너무 높음): 임시 완화
     rag.minScore: 0.75 → 0.65로 낮춤

   원인 C (문서 구조 변경): 청킹 전략 재검토
```

#### 🟡 Rate Limit 초과 급증

```
1. 증상: 429 응답 비율 > 10%

2. 원인 분석
   □ 특정 사용자 비정상 요청 (bot traffic)
   □ 설정된 한도가 실제 사용 패턴에 비해 낮음

3. 대응
   원인 A (bot traffic):
     □ 해당 userId Rate Limit 강화 또는 차단
     □ CAPTCHA 도입 검토

   원인 B (한도 조정 필요):
     □ config에서 Rate Limit 한도 상향
     □ 상향 전 Anthropic 비용 영향도 계산
```

#### 🟡 토큰 비용 예산 초과

```
1. 즉각 조치 (예산 100% 초과 시)
   □ maxTokens 일시적으로 낮춤 (2048 → 1024)
   □ maxHistoryLength 줄임 (10 → 5)
   □ RAG topK 줄임 (5 → 3)

2. 근본 원인 분석
   □ 특정 프로젝트의 비정상적 사용 여부
   □ 긴 대화 세션 비율 확인
   □ Tool Calling 과다 실행 여부

3. 중장기 조치
   □ 히스토리 요약 전략 도입 (sliding → summarize)
   □ FAQ 캐싱 도입 (반복 질문 Redis 캐싱)
```

---

## 7. RAG 문서 관리

### 7.1 문서 인덱싱 절차

#### 최초 인덱싱

```bash
# 1. 관리자 토큰 발급 (NextAuth admin role)
# 2. 문서 준비 (PDF, Markdown, 텍스트)
# 3. 인덱싱 스크립트 실행

node scripts/index-documents.js \
  --project customer-support \
  --source ./docs/faq \
  --admin-token $ADMIN_TOKEN
```

#### 문서 수정 시

```bash
# 특정 문서만 재인덱싱 (updatedAt 기반 자동 감지)
node scripts/index-documents.js \
  --project customer-support \
  --source ./docs/faq/refund-policy.md \
  --update-only

# 전체 재인덱싱 (주의: 기존 벡터 모두 삭제 후 재생성)
node scripts/index-documents.js \
  --project internal-tool \
  --source ./docs \
  --full-reindex
```

#### 문서 삭제 시

```bash
# 특정 문서 벡터 삭제
node scripts/delete-document.js \
  --project customer-support \
  --source "https://docs.example.com/old-policy"
```

### 7.2 문서 품질 관리 기준

| 기준 | 권장값 | 이유 |
|------|------|------|
| 청크 크기 | 500~800 토큰 | 너무 작으면 컨텍스트 부족, 너무 크면 검색 정확도 저하 |
| 청크 오버랩 | 100 토큰 | 청크 경계에서 정보 손실 방지 |
| 최소 문서 길이 | 100자 이상 | 너무 짧은 청크 제외 |
| 문서 언어 | 한국어 (서비스 언어와 동일) | 임베딩 모델 언어 불일치 방지 |
| 업데이트 주기 | 변경 즉시 | 오래된 정보로 인한 오답 방지 |

### 7.3 인덱싱 현황 모니터링

```typescript
// 인덱싱 현황 조회 (관리자 대시보드용)
const stats = await pinecone.index("chatbot-index").describeIndexStats();

console.log({
  namespace:   "customer-support-docs",
  vectorCount: stats.namespaces?.["customer-support-docs"]?.vectorCount,
  dimension:   stats.dimension,
});
```

### 7.4 프로젝트별 문서 업데이트 주기

| 프로젝트 | 업데이트 트리거 | 자동화 방법 |
|---------|-------------|-----------|
| SaaS | 릴리즈 배포 시 | GitHub Actions (배포 파이프라인 연동) |
| 고객 지원 | FAQ 문서 수정 시 | 관리자 수동 + 주간 배치 |
| 사내 도구 | Confluence/Notion 문서 변경 시 | 웹훅 → 자동 재인덱싱 |

---

## 8. 성능 최적화

### 8.1 응답 지연 최적화 목표

| 단계 | 목표 지연 | 현재 병목 |
|------|---------|---------|
| 첫 청크 수신 | < 1.5초 | Anthropic API 응답 시작 |
| 전체 응답 완료 | < 8초 | 응답 길이에 비례 |
| Tool 실행 포함 | < 12초 | Tool 외부 API 호출 시간 |

### 8.2 Redis 세션 캐싱 최적화

```typescript
// SessionManager.ts — 세션 캐시 TTL 최적화
class SessionManager {
  // 세션 로드: 캐시 히트 시 ~1ms, 미스 시 ~50ms
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const cached = await redis.get(`session:${sessionId}`);
    if (cached) return JSON.parse(cached);
    return [];
  }

  // 저장 시 TTL 자동 갱신
  async appendHistory(sessionId: string, message: ChatMessage, ttl: number) {
    const current = await this.getHistory(sessionId);
    const updated = [...current, message].slice(-maxHistoryLength * 2);
    await redis.setex(`session:${sessionId}`, ttl / 1000, JSON.stringify(updated));
  }
}
```

### 8.3 FAQ 캐싱 (반복 질문 최적화)

```typescript
// 자주 묻는 질문 캐싱 — RAG 검색 + LLM 호출 생략
class FAQCache {
  private readonly TTL = 60 * 60 * 6; // 6시간

  async get(question: string): Promise<string | null> {
    const key = `faq:${this.hashQuestion(question)}`;
    return redis.get(key);
  }

  async set(question: string, answer: string) {
    const key = `faq:${this.hashQuestion(question)}`;
    await redis.setex(key, this.TTL, answer);
  }

  private hashQuestion(q: string): string {
    // 질문을 정규화 후 해싱 (공백 제거, 소문자화 등)
    return createHash("md5").update(q.trim().toLowerCase()).digest("hex");
  }
}
```

### 8.4 Next.js 번들 최적화

```typescript
// ChatWidget lazy load — 초기 번들에서 제외
const ChatWidget = dynamic(
  () => import("@company/chatbot-ui").then(m => m.ChatWidget),
  {
    ssr: false,
    loading: () => null,  // 로딩 중 렌더링 없음
  }
);
```

### 8.5 Vercel 배포 최적화

```json
// vercel.json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 30,     // 스트리밍 응답을 위한 타임아웃 연장
      "memory": 512
    },
    "app/api/rag/index/route.ts": {
      "maxDuration": 60,     // 인덱싱은 더 긴 타임아웃 필요
      "memory": 1024
    }
  }
}
```

---

## 9. 보안 운영

### 9.1 API Key 순환 주기

| Key | 순환 주기 | 방법 |
|-----|---------|------|
| `ANTHROPIC_API_KEY` | 90일 | Anthropic 콘솔 → 새 Key 발급 → Vercel 환경변수 교체 → 구 Key 폐기 |
| `NEXTAUTH_SECRET` | 1년 | 새 랜덤 값 생성 → 배포 (활성 세션 강제 만료 발생) |
| `PINECONE_API_KEY` | 90일 | Pinecone 콘솔에서 순환 |
| `UPSTASH_REDIS_REST_TOKEN` | 90일 | Upstash 콘솔에서 재생성 |

### 9.2 보안 감사 로그 (사내 도구)

```typescript
// 사내 도구 전용 — 모든 대화 요청에 감사 로그 기록
interface AuditLog {
  timestamp:   string;
  userId:      string;
  employeeId:  string;
  projectId:   string;
  sessionId:   string;
  action:      "message_sent" | "tool_executed" | "document_accessed";
  details:     string;   // 민감 정보 마스킹 후 기록
  ipAddress:   string;
}

// 보존 기간: 1년 (보안 팀 요청 대응)
```

### 9.3 개인정보 처리 주기

| 데이터 | 저장 위치 | 보존 기간 | 삭제 방법 |
|--------|---------|---------|---------|
| 세션 대화 기록 | Redis | TTL 자동 만료 | 설정된 TTL 도달 시 자동 삭제 |
| 영구 대화 기록 | DB (optional) | 6개월 (고객지원) / 1년 (사내) | 배치 삭제 또는 사용자 요청 |
| 피드백 데이터 | DB | 1년 | 배치 삭제 |
| 감사 로그 | DB | 1년 | 배치 삭제 |
| 토큰 사용량 로그 | DB | 3년 | 배치 삭제 |

### 9.4 PII 마스킹

```typescript
// 로그 저장 전 PII 마스킹
function maskPII(text: string): string {
  return text
    .replace(/\d{6}-\d{7}/g, "******-*******")         // 주민번호
    .replace(/\d{4}-\d{4}-\d{4}-\d{4}/g, "****-****-****-****")  // 카드번호
    .replace(/01[0-9]-\d{3,4}-\d{4}/g, "010-****-****")  // 전화번호
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, "****@****.***");   // 이메일
}
```

---

## 10. 정기 점검 항목

### 10.1 일일 점검 (자동화 권장)

```
매일 09:00 자동 체크 (알림봇)
  □ 전일 에러율 확인 (목표: < 2%)
  □ 전일 평균 응답 지연 확인 (목표: < 5초)
  □ 전일 토큰 비용 확인 (예산 대비)
  □ Rate Limit 초과 빈도 확인
  □ 피드백 👎 비율 확인 (목표: < 10%)
```

### 10.2 주간 점검

```
매주 월요일
  □ RAG 검색 품질 리포트 확인 (평균 score 추이)
  □ 주간 에러 패턴 분석 (반복 에러 근본 원인 파악)
  □ 문서 인덱싱 최신화 확인 (고객지원 FAQ 등)
  □ Sentry 미해결 이슈 검토
  □ Anthropic/Pinecone/Upstash 서비스 공지 확인
```

### 10.3 월간 점검

```
매월 첫째 주
  □ 프로젝트별 월간 토큰 비용 리포트 작성
  □ API Key 순환 일정 확인 (90일 주기)
  □ 피드백 데이터 분석 → 시스템 프롬프트 개선 검토
  □ RAG 문서 전체 검토 (오래된 정보 업데이트)
  □ Rate Limit 한도 적정성 검토 (사용 패턴 기반)
  □ 의존 패키지 보안 취약점 확인 (pnpm audit)
  □ 개인정보 보존 기간 도달 데이터 삭제 실행
```

### 10.4 분기 점검

```
매 분기
  □ 전체 E2E 테스트 수동 실행 (모든 프로젝트)
  □ 접근성 자동 검사 실행 (axe)
  □ API Key 순환 실행 (90일 주기 도달 시)
  □ Anthropic 신규 모델 검토 (성능/비용 비교)
  □ RAG 임베딩 모델 업그레이드 검토
  □ 보안 취약점 스캔 (전체 의존성)
  □ 운영 가이드 문서 업데이트
```

---

## 부록. 유용한 명령어 모음

```bash
# Redis 세션 현황 확인
redis-cli --no-auth-warning -u $UPSTASH_REDIS_REST_URL keys "session:*" | wc -l

# 특정 세션 데이터 확인
redis-cli get "session:<sessionId>"

# Pinecone 인덱스 통계 확인
curl -X GET "https://api.pinecone.io/indexes/chatbot-index/stats" \
  -H "Api-Key: $PINECONE_API_KEY"

# 문서 인덱싱 (관리자)
curl -X POST "https://your-domain.com/api/rag/index" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @documents.json

# 토큰 사용량 일간 리포트 (DB 직접 조회)
psql $DATABASE_URL -c "
  SELECT project_id, SUM(input_tokens + output_tokens) as total_tokens,
         SUM(total_cost_usd) as total_cost
  FROM chatbot_usage_logs
  WHERE timestamp::date = CURRENT_DATE
  GROUP BY project_id;"

# 패키지 보안 취약점 확인
pnpm audit --audit-level=moderate
```

---

*이 문서는 2026-03-29 기준이며, 운영 환경 변경 시 함께 업데이트합니다.*
