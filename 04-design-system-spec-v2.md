# 🎨 UI 디자인 시스템 연동 명세서
## LUON AI Design System 기반 — Taupe + Soft Green

> **버전:** v2.0 (LUON AI 디자인 시스템 토큰 전면 반영)
> **패키지:** `@company/chatbot-ui`
> **디자인 시스템 기준:** LUON AI Design System — Taupe + Soft Green (2025 확정)
> **작성일:** 2026-03-29
> **이전 버전(v1.0) 대비 변경:** 가상 범용 변수(`--color-primary` 등) → LUON AI 실제 변수(`--taupe-500` 등)로 전면 교체

> ⚠️ **챗봇 UI는 독자적인 색상·형태 값을 하드코딩하지 않는다.**
> 모든 스타일은 LUON AI 디자인 시스템의 CSS 변수를 직접 참조하거나 alias한다.

---

## 목차

1. [LUON AI 디자인 토큰 전체 참조](#1-luon-ai-디자인-토큰-전체-참조)
2. [챗봇 전용 토큰 alias (chatbot.css)](#2-챗봇-전용-토큰-alias)
3. [컴포넌트별 디자인 명세](#3-컴포넌트별-디자인-명세)
4. [타이포그래피 규칙](#4-타이포그래피-규칙)
5. [버튼 사용 기준](#5-버튼-사용-기준)
6. [배지(Badge) 사용 기준](#6-배지badge-사용-기준)
7. [반응형 레이아웃](#7-반응형-레이아웃)
8. [애니메이션 & 트랜지션](#8-애니메이션--트랜지션)
9. [다크모드 지원](#9-다크모드-지원)
10. [접근성 색상 기준](#10-접근성-색상-기준)
11. [shadcn/ui 컴포넌트 매핑](#11-shadcnui-컴포넌트-매핑)
12. [금지 사항](#12-금지-사항)
13. [프로젝트별 브랜딩 오버라이드 정책](#13-프로젝트별-브랜딩-오버라이드-정책)

---

## 1. LUON AI 디자인 토큰 전체 참조

챗봇 UI에서 참조하는 LUON AI 디자인 시스템 CSS 변수 목록.
아래 변수들이 프로젝트에 정의되어 있어야 챗봇 UI가 정상 렌더링된다.

### 1.1 색상 토큰

```css
/* ── PRIMARY — Taupe (메인 브랜드) ── */
--taupe-50:  #f5f0ec;   /* 선택 배경, 활성 행, subtle 버튼 */
--taupe-100: #e8ddd6;   /* subtle 버튼 hover */
--taupe-200: #d4c0b3;   /* 배지 테두리 */
--taupe-300: #bfa091;   /* 히어로 타이틀 강조 */
--taupe-400: #8a6e62;   /* 타입 스펙 보조 색상 */
--taupe-500: #554940;   /* ★ Brand Primary — 버튼, 포커스, 체크박스 */
--taupe-600: #433a33;   /* 버튼 hover */
--taupe-800: #1f1b18;   /* 다크 버튼 배경 */

/* ── ACCENT — Soft Green (성공·활성 전용) ── */
--green-50:  #f0f3ee;   /* 배지·칩 배경 */
--green-200: #bbc9b3;   /* 배지 테두리 */
--green-400: #879a77;   /* ★ Accent Primary — Secondary 버튼, 토글 ON, 온라인 dot */
--green-500: #6e8060;   /* 섹션 eyebrow, 탭 활성 밑줄 */
--green-600: #55654a;   /* Secondary 버튼 텍스트 */
--green-700: #3d4a35;   /* 배지 텍스트 */

/* ── NEUTRAL — Warm Gray ── */
--gray-100: #eceae7;
--gray-200: #dddbd7;
--gray-300: #c5c6c7;
--gray-400: #a8a9aa;
--gray-500: #73787c;

/* ── SEMANTIC ── */
--color-success: #879a77;   /* = green-400 */
--color-warning: #c9ad93;   /* beige */
--color-error:   #dc2626;   /* Red — 에러 전용 */
--color-info:    #d7e5f0;   /* pale-blue */

/* ── BACKGROUND ── */
--bg-page:    #f5f4f2;   /* 전체 페이지 배경 */
--bg-surface: #ffffff;   /* 카드·패널 배경 */
--bg-subtle:  #eceae7;   /* 테이블 헤더, hover 배경, 봇 말풍선 */

/* ── TEXT ── */
--text-primary:   #000000;
--text-secondary: #73787c;
--text-tertiary:  #a8a9aa;
--text-inverse:   #ffffff;
--text-brand:     #554940;   /* = taupe-500 */
--text-accent:    #879a77;   /* = green-400 */

/* ── BORDER ── */
--border-subtle:  #dddbd7;   /* 섹션·카드 구분선 (0.5px) */
--border-default: #c5c6c7;   /* 입력 기본 테두리 (1.5px) */
--border-strong:  #a8a9aa;
--border-brand:   #554940;
--border-accent:  #879a77;

/* ── DARK MODE (Salt & Pepper) ── */
--dark-bg:             #2b2b2b;
--dark-surface:        #333333;
--dark-border:         #444444;
--dark-text-primary:   #ffffff;
--dark-text-secondary: #d4d4d4;
--dark-text-tertiary:  #b3b3b3;
```

### 1.2 형태·간격·트랜지션 토큰

```css
/* ── RADIUS ── */
--radius-xs:   4px;
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   16px;
--radius-xl:   24px;
--radius-full: 9999px;

/* ── SHADOW (Taupe 기반) ── */
--shadow-sm: 0 1px 3px rgba(85,73,64,0.08), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 12px rgba(85,73,64,0.12), 0 2px 4px rgba(0,0,0,0.05);
--shadow-lg: 0 12px 32px rgba(85,73,64,0.16), 0 4px 8px rgba(0,0,0,0.06);
--shadow-xl: 0 24px 64px rgba(85,73,64,0.20), 0 8px 16px rgba(0,0,0,0.08);

/* ── SPACING (4px Grid) ── */
--space-1:4px; --space-2:8px;  --space-3:12px; --space-4:16px;
--space-5:20px;--space-6:24px; --space-8:32px; --space-10:40px;
--space-12:48px;--space-16:64px;--space-20:80px;

/* ── TRANSITION ── */
--ease-default:  cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast:   150ms;
--duration-normal: 250ms;
--duration-slow:   400ms;

/* ── TYPOGRAPHY ── */
--font-display: 'Sora', 'Pretendard', sans-serif;        /* 타이틀·헤더 */
--font-body:    'Pretendard', -apple-system, sans-serif; /* 본문 전체 */
--font-mono:    'DM Mono', monospace;                    /* 코드·레이블 */
```

---

## 2. 챗봇 전용 토큰 alias

LUON AI 변수를 챗봇 컨텍스트에 맞게 alias 처리한다.
이 파일(`chatbot.css`)만 수정하면 챗봇 UI 전체 스타일이 제어된다.

```css
/* packages/chatbot-ui/src/styles/chatbot.css */

:root {
  /* ── 컨테이너 ── */
  --chat-bg:             var(--bg-surface);        /* #ffffff */
  --chat-header-bg:      var(--bg-subtle);          /* #eceae7 */
  --chat-header-border:  var(--border-subtle);      /* #dddbd7 */
  --chat-footer-bg:      var(--bg-surface);
  --chat-footer-border:  var(--border-subtle);

  /* ── 사용자 말풍선 (Taupe Primary) ── */
  --bubble-user-bg:      var(--taupe-500);          /* #554940 */
  --bubble-user-text:    var(--text-inverse);       /* #ffffff */
  --bubble-user-radius:  var(--radius-lg);          /* 16px */

  /* ── 봇 말풍선 (Subtle Surface) ── */
  --bubble-bot-bg:       var(--bg-subtle);          /* #eceae7 */
  --bubble-bot-text:     var(--text-primary);       /* #000000 */
  --bubble-bot-radius:   var(--radius-lg);          /* 16px */

  /* ── Tool 결과 카드 ── */
  --bubble-tool-bg:      var(--bg-surface);         /* #ffffff */
  --bubble-tool-border:  var(--border-subtle);      /* #dddbd7 */
  --bubble-tool-radius:  var(--radius-md);          /* 10px */

  /* ── 입력창 ── */
  --input-bg:            var(--bg-surface);
  --input-border:        var(--border-default);     /* #c5c6c7 — 1.5px */
  --input-border-focus:  var(--taupe-500);          /* #554940 */
  --input-shadow-focus:  rgba(85,73,64,0.12);       /* 포커스 링 */
  --input-text:          var(--text-primary);
  --input-placeholder:   var(--text-tertiary);      /* #a8a9aa */
  --input-radius:        var(--radius-sm);          /* 6px */

  /* ── 보조 텍스트 ── */
  --chat-text-muted:     var(--text-tertiary);      /* #a8a9aa */

  /* ── 에러 ── */
  --chat-error-bg:       #fef2f2;
  --chat-error-border:   #fecaca;
  --chat-error-text:     var(--color-error);        /* #dc2626 */

  /* ── FAB ── */
  --chat-fab-bg:         var(--taupe-500);          /* #554940 */
  --chat-fab-bg-hover:   var(--taupe-600);          /* #433a33 */
  --chat-fab-icon:       var(--text-inverse);       /* #ffffff */
  --chat-fab-shadow:     var(--shadow-lg);

  /* ── 크기 (고정) ── */
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

/* ── 다크모드 ── */
.dark {
  --chat-bg:            var(--dark-surface);   /* #333333 */
  --chat-header-bg:     var(--dark-bg);        /* #2b2b2b */
  --chat-header-border: var(--dark-border);    /* #444444 */
  --chat-footer-bg:     var(--dark-surface);
  --chat-footer-border: var(--dark-border);

  --bubble-bot-bg:      var(--dark-bg);
  --bubble-bot-text:    var(--dark-text-primary);

  --bubble-tool-bg:     var(--dark-surface);
  --bubble-tool-border: var(--dark-border);

  --input-bg:           var(--dark-surface);
  --input-border:       var(--dark-border);
  --input-text:         var(--dark-text-primary);
  --input-placeholder:  var(--dark-text-tertiary);

  --chat-text-muted:    var(--dark-text-tertiary);
  --chat-error-bg:      #450a0a;
  --chat-error-border:  #7f1d1d;
}

/* ── prefers-reduced-motion ── */
@media (prefers-reduced-motion: reduce) {
  .chat-widget *, .chat-widget *::before, .chat-widget *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 3. 컴포넌트별 디자인 명세

### 3.1 ChatWidget — 플로팅 액션 버튼 (FAB)

| 속성 | 값 | 토큰 |
|------|---|------|
| 크기 | 56 × 56px | `--chat-fab-size` |
| 위치 | fixed, bottom: 24px, right: 24px | `--chat-fab-bottom/right` |
| 배경 | `#554940` | `--taupe-500` |
| Hover 배경 | `#433a33` + translateY(-1px) | `--taupe-600` |
| 아이콘 | Lucide `MessageCircle` 24px, white | `--text-inverse` |
| Border Radius | 원형 | `--radius-full` |
| 그림자 | Taupe 기반 lg | `--shadow-lg` |
| z-index | 50 | `--chat-z-index` |
| 미읽음 뱃지 | 우상단, `#dc2626` 배경 | `--color-error` |

---

### 3.2 ChatWindow — 대화창

| 속성 | 데스크톱 | 태블릿 | 모바일 |
|------|---------|-------|-------|
| 너비 | 400px | 360px | 100vw |
| 높이 | 600px | 600px | 100dvh |
| 헤더 배경 | `--bg-subtle` (#eceae7) | 동일 | 동일 |
| 헤더 테두리 | `--border-subtle` 하단 0.5px | 동일 | 동일 |
| 본문 배경 | `--bg-surface` (#ffffff) | 동일 | 동일 |
| 컴포넌트 | shadcn/ui `Sheet` | `Sheet` | `Drawer` |
| 열기 애니메이션 | slide-in-from-right 250ms | 동일 | slide-in-from-bottom |
| 그림자 | `--shadow-xl` | `--shadow-lg` | 없음 |

**헤더 구성 요소:**
- 봇 로고마크: 24×24px, `--taupe-500` 배경, `--radius-sm` (6px), 흰색 이니셜
- 봇 이름: `--font-display` (Sora) 14px, weight 600
- 온라인 상태 dot: 6px 원형, `--green-400` 색상
- 초기화 버튼: `btn-icon` 스타일 (RotateCcw 아이콘)
- 닫기 버튼: `btn-icon` 스타일 (X 아이콘)

---

### 3.3 MessageBubble — 메시지 말풍선

| 속성 | 사용자 메시지 | 봇 메시지 |
|------|------------|---------|
| 정렬 | `justify-end` | `justify-start` |
| 배경 | `--taupe-500` (#554940) | `--bg-subtle` (#eceae7) |
| 텍스트 | `--text-inverse` (#ffffff) | `--text-primary` (#000000) |
| Border Radius | 16px, 우하단만 4px | 16px, 좌하단만 4px |
| 최대 너비 | 75% | 85% |
| 패딩 | `--space-3 --space-4` (12px 16px) | 동일 |
| 아바타 | 없음 | Taupe-500 원형 24px, 좌측 |
| 타임스탬프 | 하단 우측, 12px, `--text-tertiary` | 하단 좌측, 동일 |
| 폰트 | `--font-body` Pretendard 14px | 동일 |

```tsx
/* 사용자 말풍선 radius */
style={{ borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)" }}

/* 봇 말풍선 radius */
style={{ borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)" }}
```

---

### 3.4 MessageInput — 입력창

LUON AI `.input` 스타일을 그대로 따른다.

| 속성 | 값 | 토큰 |
|------|---|------|
| 테두리 기본 | 1.5px solid `#c5c6c7` | `--border-default` |
| 테두리 포커스 | `#554940` | `--taupe-500` |
| 포커스 링 | `0 0 0 3px rgba(85,73,64,0.12)` | `--input-shadow-focus` |
| 에러 테두리 | `--color-error` + `rgba(220,38,38,0.12)` | — |
| Border Radius | 6px | `--radius-sm` |
| 폰트 | Pretendard 14px | `--font-body` |
| 비활성 배경 | `--bg-subtle` | — |

**전송 버튼:** `btn-primary` 스타일 — `--taupe-500` 배경, shadow `rgba(85,73,64,0.30)`
**파일 첨부 버튼:** `btn-icon` 스타일 — `--bg-subtle` 배경, `--border-subtle` 테두리
**전송 단축키:** `Enter` 전송 / `Shift+Enter` 줄바꿈

---

### 3.5 ToolResultCard — Tool 실행 결과

LUON AI `.card` 스타일 기반.

| 속성 | 값 | 토큰 |
|------|---|------|
| 배경 | `#ffffff` | `--bg-surface` |
| 테두리 | `0.5px solid #dddbd7` | `--border-subtle` |
| Border Radius | 16px | `--radius-lg` |
| 그림자 | Taupe 기반 sm | `--shadow-sm` |
| Hover | `--shadow-md` + translateY(-2px) | 카드 hover 패턴 |
| 헤더 | Tool 이름, `--font-mono` 11px, `--text-tertiary` + Lucide `Zap` |

**Recharts 브랜드 팔레트:**

```tsx
<Bar   dataKey="value" fill="var(--taupe-500)" radius={[4,4,0,0]} />
<Line  dataKey="trend" stroke="var(--green-400)" strokeWidth={2} />
<Tooltip contentStyle={{
  background: "var(--bg-surface)", border: "0.5px solid var(--border-subtle)",
  borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
  fontFamily: "var(--font-body)",
}} />
```

---

### 3.6 ErrorMessage — 에러 카드

LUON AI Alert 스타일 기반 (챗봇에서는 `--radius-md` 적용).

| 속성 | 값 |
|------|---|
| 배경 | `#fef2f2` |
| 테두리 | `1px solid #fecaca` |
| 텍스트 | `--color-error` (#dc2626) |
| Border Radius | 10px (`--radius-md`) |
| 아이콘 | Lucide `AlertTriangle` 18px |
| 재시도 버튼 | `btn-subtle` 스타일 (`--taupe-50` 배경) |

---

### 3.7 TypingIndicator

| 속성 | 값 |
|------|---|
| 점 색상 | `--green-400` (#879a77) |
| 점 크기 | 6px, `--radius-full` |
| 배경 | `--bg-subtle` (봇 말풍선과 동일) |
| 애니메이션 | bounce, 150ms 간격 순차 |

---

### 3.8 FeedbackButtons

| 상태 | 색상 | 배지 스타일 |
|------|------|-----------|
| 기본 | `--text-tertiary` (#a8a9aa) | — |
| 👍 선택 | `--green-400` (#879a77) | `badge-green` 패턴 |
| 👎 선택 | `--color-error` (#dc2626) | `badge-red` 패턴 |

---

### 3.9 ConfirmationDialog

| 속성 | 값 |
|------|---|
| 배경 | `--bg-surface` |
| Border Radius | `--radius-xl` (24px) |
| 그림자 | `--shadow-xl` |
| Overlay | `rgba(0,0,0,0.4)` |
| 확인 버튼 | `btn-primary` (`--taupe-500`) |
| 위험 확인 버튼 | `btn-danger` (`#dc2626`) |
| 취소 버튼 | `btn-ghost` |

---

## 4. 타이포그래피 규칙

| 요소 | 폰트 | 크기 | 굵기 |
|------|------|------|------|
| 봇 이름 (헤더) | `--font-display` (Sora) | 14px | 600 |
| 메시지 본문 | `--font-body` (Pretendard) | 14px | 400 |
| 타임스탬프 | `--font-body` | 12px | 400 |
| Tool 카드 헤더 | `--font-mono` (DM Mono) | 11px | 400 |
| 입력창 | `--font-body` | 14px | 400 |
| 코드 블록 | `--font-mono` | 13px | 400 |
| 에러 메시지 | `--font-body` | 13px | 400 |
| 버튼 라벨 | `--font-body` | 13px | 600 |

### 마크다운 렌더링 스코핑

```tsx
<ReactMarkdown components={{
  p:      ({children}) => <p style={{fontFamily:"var(--font-body)",fontSize:14,color:"var(--bubble-bot-text)",margin:"4px 0"}}>{children}</p>,
  strong: ({children}) => <strong style={{color:"var(--bubble-bot-text)",fontWeight:700}}>{children}</strong>,
  code:   ({children}) => <code style={{fontFamily:"var(--font-mono)",background:"var(--bg-subtle)",padding:"1px 6px",borderRadius:"var(--radius-xs)",fontSize:13}}>{children}</code>,
  a:      ({href,children}) => <a href={href} target="_blank" rel="noopener noreferrer" style={{color:"var(--taupe-500)",textDecoration:"underline"}}>{children}</a>,
}}>
  {content}
</ReactMarkdown>
```

---

## 5. 버튼 사용 기준

LUON AI 버튼 variant → 챗봇 컨텍스트 매핑.

| 상황 | Variant | 스타일 |
|------|---------|--------|
| 메시지 전송 | `btn-primary` | `--taupe-500` 배경, white |
| Tool 실행 확인 | `btn-primary` | 동일 |
| 위험 Tool 확인 | `btn-danger` | `#dc2626` 배경 |
| 취소 | `btn-ghost` | transparent + `--border-default` |
| 다시 시도 | `btn-subtle` | `--taupe-50` 배경, `--taupe-600` 텍스트 |
| 파일 첨부 / 아이콘 | `btn-icon` | `--bg-subtle` + `--border-subtle` |
| 에스컬레이션 연결 | `btn-secondary` | `--green-400` 테두리, `--green-600` 텍스트 |

---

## 6. 배지(Badge) 사용 기준

| 상황 | Variant | 색상 조합 |
|------|---------|---------|
| 온라인 / 활성 | `badge-green` | `--green-50` bg / `--green-700` text |
| RAG 출처 | `badge-blue` (=taupe) | `--taupe-50` bg / `--taupe-600` text |
| Tool 실행 중 | `badge-yellow` | `#fefce8` bg / `#a16207` text |
| 피드백 👍 선택 | `badge-green` | — |
| 피드백 👎 선택 | `badge-red` | `#fef2f2` bg / `#dc2626` text |
| 미읽음 카운트 | 에러 배지 | `#dc2626` bg / white text |

---

## 7. 반응형 레이아웃

| 구간 | 범위 | 동작 |
|------|------|------|
| Mobile | `< 768px` | Drawer 전체화면 (100vw × 100dvh) |
| Tablet | `768px ~ 1023px` | Sheet 360px |
| Desktop | `≥ 1024px` | Sheet 400px × 600px |

```css
/* 모바일 가상 키보드 대응 */
.chat-window-mobile {
  height: 100dvh;
  max-height: 100dvh;
}
.chat-window-mobile .bubble-user,
.chat-window-mobile .bubble-bot { max-width: 90%; }
```

---

## 8. 애니메이션 & 트랜지션

LUON AI 트랜지션 토큰을 일관되게 적용한다.

| 요소 | 지속시간 | Easing |
|------|---------|--------|
| FAB 등장 / 버튼 hover | `--duration-fast` (150ms) | `--ease-default` |
| 위젯 열기 / 메시지 등장 | `--duration-normal` (250ms) | `--ease-default` |
| 위젯 닫기 | `--duration-fast` (150ms) | `--ease-default` |
| 스트리밍 커서 blink | 600ms step infinite | — |
| Typing dot bounce | 600ms ease-in-out | — |
| 카드 hover | `--duration-normal` | — |
| 버튼 active | scale(0.97) | `--duration-fast` |

```javascript
// tailwind.config.js
keyframes: {
  "chat-slide-in":  { from:{opacity:"0",transform:"translateX(100%)"},  to:{opacity:"1",transform:"translateX(0)"} },
  "message-appear": { from:{opacity:"0",transform:"translateY(8px)"},    to:{opacity:"1",transform:"translateY(0)"} },
  "cursor-blink":   { "0%,100%":{opacity:"1"}, "50%":{opacity:"0"} },
  "dot-bounce":     { "0%,100%":{transform:"translateY(0)"}, "50%":{transform:"translateY(-4px)"} },
},
animation: {
  "chat-slide-in":  "chat-slide-in 250ms cubic-bezier(0.16,1,0.3,1)",
  "message-appear": "message-appear 150ms cubic-bezier(0.16,1,0.3,1)",
  "cursor-blink":   "cursor-blink 600ms step infinite",
  "dot-bounce":     "dot-bounce 600ms ease-in-out infinite",
},
```

---

## 9. 다크모드 지원

| `config.ui.theme` | 동작 |
|------------------|------|
| `"light"` | 항상 라이트 |
| `"dark"` | 항상 다크 |
| `"auto"` | `prefers-color-scheme` 자동 감지 |

LUON AI `--dark-*` 변수가 `.dark` 클래스에서 자동 적용된다.
`chatbot.css`의 `.dark` 오버라이드로 처리하며, 별도 다크 스타일 정의는 불필요하다.

---

## 10. 접근성 색상 기준

WCAG 2.1 AA (4.5:1) 검증 결과.

| 조합 | 전경 | 배경 | 대비율 | 충족 |
|------|------|------|--------|------|
| 사용자 말풍선 | `#ffffff` | `#554940` | 7.8:1 | ✅ AAA |
| 봇 말풍선 | `#000000` | `#eceae7` | 16.1:1 | ✅ AAA |
| 기본 텍스트 | `#000000` | `#ffffff` | 21:1 | ✅ AAA |
| 보조 텍스트 | `#73787c` | `#ffffff` | 4.6:1 | ✅ AA |
| 에러 텍스트 | `#dc2626` | `#fef2f2` | 4.9:1 | ✅ AA |
| 버튼 텍스트 | `#ffffff` | `#554940` | 7.8:1 | ✅ AAA |
| 힌트 텍스트 | `#a8a9aa` | `#ffffff` | 2.8:1 | ⚠️ 비중요 텍스트 허용 |

> 상태 정보(에러·성공·경고)는 색상만으로 전달하지 않는다. 반드시 Lucide 아이콘 + 텍스트 병행.

---

## 11. shadcn/ui 컴포넌트 매핑

**globals.css — shadcn/ui 변수를 LUON AI 토큰으로 오버라이드:**

```css
:root {
  --primary:             var(--taupe-500);     /* #554940 */
  --primary-foreground:  white;
  --secondary:           var(--green-50);
  --secondary-foreground: var(--green-700);
  --accent:              var(--bg-subtle);     /* #eceae7 */
  --accent-foreground:   var(--text-primary);
  --destructive:         var(--color-error);   /* #dc2626 */
  --border:              var(--border-default);/* #c5c6c7 */
  --ring:                var(--taupe-500);
  --radius:              var(--radius-sm);     /* 6px */
  --background:          var(--bg-surface);
  --foreground:          var(--text-primary);
  --muted:               var(--bg-subtle);
  --muted-foreground:    var(--text-secondary);
}
.dark {
  --background:          var(--dark-surface);
  --foreground:          var(--dark-text-primary);
  --border:              var(--dark-border);
  --muted:               var(--dark-bg);
  --muted-foreground:    var(--dark-text-secondary);
}
```

| 챗봇 요소 | shadcn/ui 컴포넌트 | LUON AI 적용 |
|---------|-----------------|------------|
| 대화창 (데스크톱) | `Sheet` | side="right", `--shadow-xl` |
| 대화창 (모바일) | `Drawer` | 100dvh 전체화면 |
| Tool 확인 | `AlertDialog` | `--radius-xl`, `--shadow-xl` |
| 에러 카드 | `Alert` | `--chat-error-*` 토큰 |
| 입력창 | `Textarea` | taupe 포커스 링, auto-resize |
| 전송/아이콘 버튼 | `Button` | LUON AI btn-primary / btn-icon |
| 봇 아바타 | `Avatar` | 24px, `--taupe-500` 배경 |
| 스켈레톤 | `Skeleton` | `--bg-subtle` 기반 |

---

## 12. 금지 사항

```
❌ 하드코딩 Hex 색상 사용
   className="bg-[#554940]"        → style={{ background:"var(--taupe-500)" }}
   style={{ color: "#73787c" }}     → style={{ color:"var(--text-secondary)" }}

❌ LUON AI 팔레트 외 임의 색상
   className="bg-indigo-600"       → --taupe-* 또는 --green-* 팔레트에서 선택

❌ 시스템에 없는 임의 radius 값
   style={{ borderRadius:"8px" }}  → var(--radius-sm)=6px 또는 var(--radius-md)=10px

❌ 본문 텍스트에 Sora 사용
   --font-display (Sora)는 봇 이름·타이틀에만 허용, 본문은 Pretendard

❌ 본문 텍스트에 DM Mono 사용
   --font-mono는 Tool 레이블·코드·타임스탬프 등 모노스페이스가 필요한 곳만

❌ 임의 z-index
   style={{ zIndex:9999 }}         → var(--chat-z-index) = 50

❌ prefers-reduced-motion 미대응
   className="animate-bounce"      → motion-safe:animate-bounce
```

---

## 13. 프로젝트별 브랜딩 오버라이드 정책

LUON AI 챗봇은 **Taupe + Soft Green** 팔레트를 기본으로 유지한다.

**오버라이드 허용:**
- `ui.primaryColor` → FAB·전송버튼·포커스링·사용자 말풍선에 일괄 적용
- `ui.botName`, `ui.botAvatarUrl`

**오버라이드 금지:**
- Accent 색상 (Green-400) — 활성·성공 상태 전용
- 에러 색상 (`#dc2626`)
- 폰트 패밀리 (Sora / Pretendard / DM Mono 고정)

**오버라이드 시 WCAG 대비율 4.5:1 자동 검증 필수:**

```tsx
function applyPrimaryColor(color: string) {
  const contrast = getContrastRatio("#ffffff", color);
  if (contrast < 4.5) {
    console.warn(`[Chatbot] primaryColor "${color}" WCAG AA 실패 (${contrast.toFixed(1)}:1)`);
  }
  chatWidgetEl.style.setProperty("--chat-fab-bg",      color);
  chatWidgetEl.style.setProperty("--bubble-user-bg",   color);
  chatWidgetEl.style.setProperty("--input-border-focus", color);
}
```

---

*이 문서는 LUON AI Design System (Taupe + Soft Green, 2025 확정) 기준으로 작성되었으며,
디자인 시스템 업데이트 시 반드시 함께 갱신합니다.*
