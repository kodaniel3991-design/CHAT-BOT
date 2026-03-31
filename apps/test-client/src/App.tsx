import { ChatWidget } from "@company/chatbot-ui";
import "@company/chatbot-ui/styles.css";

/**
 * 외부 서비스 시뮬레이션.
 *
 * 이 페이지는 localhost:5173 에서 실행되고,
 * 중앙 챗봇 서버 localhost:3000 의 API를 호출합니다.
 *
 * 검증 항목:
 *  1. CORS (크로스 오리진 요청)
 *  2. SSE 스트리밍 (크로스 오리진)
 *  3. ChatWidgetConfig (경량 타입)
 *  4. JWT Bearer 인증 (또는 인증 비활성화)
 */

const CENTRAL_API = "http://localhost:3000";

export function App() {
  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 800,
        margin: "0 auto",
        padding: "40px 20px",
      }}
    >
      <header>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#888",
          }}
        >
          External Service Simulation
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 28, fontWeight: 700 }}>
          ESG_On 서비스
        </h1>
        <p style={{ marginTop: 12, color: "#666", lineHeight: 1.6 }}>
          이 페이지는 <strong>외부 서비스</strong>를 시뮬레이션합니다.
          <br />
          <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>
            localhost:5173
          </code>
          {" "}에서 실행되며, 중앙 챗봇 서버{" "}
          <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>
            localhost:3000
          </code>
          {" "}의 API를 호출합니다.
        </p>
      </header>

      <section
        style={{
          marginTop: 32,
          padding: 24,
          border: "1px solid #e0e0e0",
          borderRadius: 12,
          background: "#fafafa",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          검증 항목
        </h2>
        <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 2, color: "#555" }}>
          <li>CORS — 크로스 오리진 API 요청 허용 여부</li>
          <li>SSE — 스트리밍 응답이 정상 수신되는지</li>
          <li>ChatWidgetConfig — 경량 타입으로 위젯이 동작하는지</li>
          <li>인증 — Bearer 토큰 또는 인증 비활성화 모드</li>
        </ul>
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          border: "1px solid #e0e0e0",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          임베드 코드
        </h2>
        <pre
          style={{
            marginTop: 12,
            padding: 16,
            background: "#1e1e1e",
            color: "#d4d4d4",
            borderRadius: 8,
            fontSize: 13,
            overflow: "auto",
            lineHeight: 1.5,
          }}
        >
{`<ChatWidget
  config={{
    projectId: "esg-on",
    ui: {
      botName: "ESG_On 어시스턴트",
      theme: "auto",
    },
    conversation: {
      welcomeMessage: "안녕하세요! ESG 관련 질문을 도와드릴게요.",
    },
  }}
  apiPath="${CENTRAL_API}/api/chat"
/>`}
        </pre>
      </section>

      <p style={{ marginTop: 32, textAlign: "center", color: "#999", fontSize: 13 }}>
        우측 하단의 채팅 버튼을 클릭하여 테스트해 보세요.
      </p>

      {/* ─── 실제 ChatWidget 임베드 ─── */}
      <ChatWidget
        config={{
          projectId: "esg-on",
          ui: {
            botName: "ESG_On 어시스턴트",
            theme: "auto",
          },
          conversation: {
            welcomeMessage: "안녕하세요! ESG 관련 질문을 도와드릴게요.",
          },
        }}
        apiPath={`${CENTRAL_API}/api/chat`}
        confirmPath={`${CENTRAL_API}/api/chat/confirm`}
        mode="modal"
      />
    </div>
  );
}
