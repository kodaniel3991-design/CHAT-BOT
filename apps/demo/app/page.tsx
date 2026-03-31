"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  ChatWidget,
  LuonServiceSelector,
  useChatStore,
  useLuonServiceBinding,
} from "@company/chatbot-ui";
import { CatalogDisplayEditor } from "../components/CatalogDisplayEditor";
import { ServiceManager } from "../components/ServiceManager";
import { SystemInfoForm } from "../components/SystemInfoForm";
import {
  applyLocalOverrides,
  applyPathOverrides,
} from "../lib/apply-local-overrides";
import {
  clearCatalogDisplayOverrides,
  loadCatalogDisplayOverrides,
  type CatalogDisplayOverrides,
  saveCatalogDisplayOverrides,
} from "../lib/local-catalog-display";
import {
  clearLocalSystemOverrides,
  loadLocalSystemOverrides,
  type LocalSystemOverrides,
  saveLocalSystemOverrides,
} from "../lib/local-system-overrides";
import { mergeCatalogDisplay } from "../lib/merge-catalog-display";
import { luonServiceCatalog } from "../config/luon-services";

/* ─── Step definitions ─── */
const STEPS = [
  { key: "login", label: "로그인" },
  { key: "system", label: "시스템 선택" },
  { key: "configure", label: "상세 설정" },
  { key: "test", label: "채팅 테스트" },
] as const;

export default function HomePage() {
  const setChatOpen = useChatStore((s) => s.setOpen);

  const luonApiBase =
    typeof process.env.NEXT_PUBLIC_LUON_CHAT_API_BASE === "string" &&
    process.env.NEXT_PUBLIC_LUON_CHAT_API_BASE.length > 0
      ? process.env.NEXT_PUBLIC_LUON_CHAT_API_BASE
      : undefined;

  /* ─── Catalog display overrides ─── */
  const [catalogDisplayOverrides, setCatalogDisplayOverrides] =
    useState<CatalogDisplayOverrides | null>(null);

  useEffect(() => {
    setCatalogDisplayOverrides(loadCatalogDisplayOverrides());
  }, []);

  const displayCatalog = useMemo(
    () => mergeCatalogDisplay(luonServiceCatalog, catalogDisplayOverrides),
    [catalogDisplayOverrides],
  );

  const { selectedId, setSelectedId, active, config, paths } =
    useLuonServiceBinding(displayCatalog, {
      globalBaseUrl: luonApiBase,
    });

  /* ─── Local system overrides ─── */
  const [localOverrides, setLocalOverrides] =
    useState<LocalSystemOverrides | null>(null);

  useEffect(() => {
    setLocalOverrides(loadLocalSystemOverrides());
  }, []);

  const effectiveConfig = useMemo(
    () => (config ? applyLocalOverrides(config, localOverrides) : undefined),
    [config, localOverrides],
  );

  const effectivePaths = useMemo(
    () => applyPathOverrides(paths, localOverrides),
    [paths, localOverrides],
  );

  const registeredProjectIds = useMemo(
    () => luonServiceCatalog.services.map((s) => s.config.projectId),
    [],
  );

  /* ─── Auth ─── */
  const { data: session, status } = useSession();
  const mockMode = process.env.NEXT_PUBLIC_CHAT_USE_MOCK === "true";
  const authDisabled = process.env.NEXT_PUBLIC_CHAT_AUTH_DISABLED === "true";

  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const authReady = status !== "loading";
  const isLoggedIn = status === "authenticated";
  const needLogin = !mockMode && !authDisabled;
  const skipLogin = mockMode || authDisabled;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErr(null);
    const res = await signIn("credentials", {
      password: loginPw,
      redirect: false,
    });
    if (res?.error) {
      setLoginErr("비밀번호가 올바르지 않습니다.");
      return;
    }
    setLoginPw("");
  };

  /* ─── LLM status ─── */
  const [llmStatus, setLlmStatus] = useState<{
    mode: string;
    placeholderForced: boolean;
  } | null>(null);

  useEffect(() => {
    if (mockMode) return;
    fetch("/api/config/llm-status")
      .then(
        (r) =>
          r.json() as Promise<{ mode: string; placeholderForced: boolean }>,
      )
      .then(setLlmStatus)
      .catch(() => setLlmStatus(null));
  }, [mockMode]);

  /* ─── Stepper state ─── */
  const startStep = skipLogin ? 1 : 0;
  const [currentStep, setCurrentStep] = useState(startStep);

  // Auto-advance when login completes
  useEffect(() => {
    if (currentStep === 0 && isLoggedIn) {
      setCurrentStep(1);
    }
  }, [isLoggedIn, currentStep]);

  // Reset to login if logged out mid-flow
  useEffect(() => {
    if (needLogin && !isLoggedIn && currentStep > 0 && authReady) {
      setCurrentStep(0);
    }
  }, [needLogin, isLoggedIn, currentStep, authReady]);

  // Auto-open chat on final step
  useEffect(() => {
    if (currentStep === 3) {
      setChatOpen(true);
    }
  }, [currentStep, setChatOpen]);

  const canAdvance = (() => {
    switch (currentStep) {
      case 0:
        return isLoggedIn;
      case 1:
        return !!selectedId;
      case 2:
        return !!effectiveConfig;
      case 3:
        return false;
      default:
        return false;
    }
  })();

  /* ─── Render ─── */
  return (
    <main
      className="min-h-screen px-4 py-8 md:px-6 md:py-10"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="mx-auto max-w-2xl">
        {/* ── Header ── */}
        <header className="mb-6 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-tertiary)" }}
          >
            LUON AI Chatbot
          </p>
          <h1
            className="mt-2 text-xl font-semibold md:text-2xl"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            챗봇 설정 마법사
          </h1>
          <p
            className="mt-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            단계별로 시스템을 설정하고 바로 테스트해 보세요.
          </p>
        </header>

        {/* ── Stepper indicator ── */}
        <nav className="mb-8" aria-label="Progress">
          <ol className="flex items-start">
            {STEPS.map((step, idx) => {
              if (skipLogin && idx === 0) return null;
              const isCompleted = idx < currentStep;
              const isCurrent = idx === currentStep;
              return (
                <li
                  key={step.key}
                  className="flex flex-1 items-start last:flex-none"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => idx <= currentStep && setCurrentStep(idx)}
                      disabled={idx > currentStep}
                      className="flex flex-col items-center gap-1.5 disabled:cursor-default"
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-200"
                        style={{
                          background:
                            isCompleted || isCurrent
                              ? "var(--taupe-500)"
                              : "var(--bg-surface)",
                          color:
                            isCompleted || isCurrent
                              ? "white"
                              : "var(--text-tertiary)",
                          border: `2px solid ${isCompleted || isCurrent ? "var(--taupe-500)" : "var(--border-subtle)"}`,
                          boxShadow: isCurrent
                            ? "0 0 0 3px rgba(85,73,64,0.15)"
                            : "none",
                        }}
                      >
                        {isCompleted ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M3 8.5L6.5 12L13 4"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span
                        className="text-[11px] font-semibold"
                        style={{
                          fontFamily: "var(--font-display)",
                          color: isCurrent
                            ? "var(--text-primary)"
                            : isCompleted
                              ? "var(--text-brand)"
                              : "var(--text-tertiary)",
                        }}
                      >
                        {step.label}
                      </span>
                    </button>
                  </div>
                  {/* Connector line */}
                  {idx < STEPS.length - 1 &&
                    !(skipLogin && idx === 0) && (
                      <div
                        className="mt-[18px] mx-1 h-0.5 flex-1"
                        style={{
                          background: isCompleted
                            ? "var(--taupe-500)"
                            : "var(--border-subtle)",
                          transition: "background 0.3s",
                        }}
                      />
                    )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Status banners ── */}
        {authReady && mockMode && (
          <div
            className="mb-4 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <strong style={{ color: "var(--text-brand)" }}>
              모의 응답 모드
            </strong>{" "}
            — 브라우저만 스트리밍 시뮬레이션합니다.
          </div>
        )}

        {authReady && authDisabled && !mockMode && (
          <div
            className="mb-4 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--border-accent)",
              background: "var(--green-50)",
              color: "var(--green-700)",
            }}
          >
            <strong>인증 생략 모드</strong> — API에서 인증을 건너뜁니다.
          </div>
        )}

        {/* ════════════════════════════════════════════
            STEP 0 — 로그인
        ════════════════════════════════════════════ */}
        {currentStep === 0 && needLogin && (
          <section
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--bg-subtle)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                로그인
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                데모 비밀번호를 입력해 주세요. 기본값은{" "}
                <code className="rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-xs">
                  luon-demo
                </code>{" "}
                입니다.
              </p>
            </div>

            {isLoggedIn ? (
              <div className="mt-6 flex flex-col items-center gap-3">
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  로그인됨:{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {session?.user?.email ?? session?.user?.name ?? "user"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => void signOut({ redirect: false })}
                  className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
                  style={{
                    borderColor: "var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleLogin}
                className="mx-auto mt-6 max-w-sm space-y-3"
              >
                <input
                  type="password"
                  value={loginPw}
                  onChange={(e) => setLoginPw(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-lg border px-4 py-3 text-sm outline-none transition-shadow focus:ring-2"
                  style={{
                    borderColor: "var(--border-default)",
                    fontFamily: "var(--font-body)",
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.98]"
                  style={{
                    background: "var(--taupe-500)",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  로그인
                </button>
                {loginErr && (
                  <p
                    className="text-center text-sm"
                    style={{ color: "var(--color-error)" }}
                  >
                    {loginErr}
                  </p>
                )}
              </form>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════
            STEP 1 — 시스템 선택
        ════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <section
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--bg-subtle)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                시스템 선택
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                챗봇을 연동할 시스템을 선택해 주세요.
              </p>
            </div>

            <div className="mt-6">
              <LuonServiceSelector
                catalog={displayCatalog}
                value={selectedId}
                onChange={setSelectedId}
              />
            </div>

            {active?.description && (
              <p
                className="mt-4 text-center text-sm font-medium"
                style={{ color: "var(--text-brand)" }}
              >
                {active.label} — {active.description}
              </p>
            )}

            {/* Service management (collapsible) */}
            <details className="mt-6">
              <summary
                className="cursor-pointer text-xs font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                서비스 관리 (등록 / 수정 / 삭제)
              </summary>
              <ServiceManager
                onServicesChanged={() => {
                  // 페이지를 리로드하여 변경된 서비스 목록 반영
                  window.location.reload();
                }}
              />
            </details>

            {/* Catalog display editor (collapsible) */}
            <details className="mt-6">
              <summary
                className="cursor-pointer text-xs font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                시스템 버튼 표시 이름 변경 (선택)
              </summary>
              <CatalogDisplayEditor
                baseServices={luonServiceCatalog.services}
                saved={catalogDisplayOverrides}
                onApply={(payload) => {
                  saveCatalogDisplayOverrides(payload);
                  setCatalogDisplayOverrides(payload);
                }}
                onReset={() => {
                  clearCatalogDisplayOverrides();
                  setCatalogDisplayOverrides(null);
                }}
              />
            </details>
          </section>
        )}

        {/* ════════════════════════════════════════════
            STEP 2 — 상세 설정
        ════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <section
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--bg-subtle)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                상세 설정
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                챗봇의 이름, 테마, 환영 메시지 등을 설정하세요.
              </p>
            </div>

            {config ? (
              <SystemInfoForm
                baseConfig={config}
                savedOverrides={localOverrides}
                registeredProjectIds={registeredProjectIds}
                onApply={(o) => {
                  saveLocalSystemOverrides(o);
                  setLocalOverrides(o);
                }}
                onReset={() => {
                  clearLocalSystemOverrides();
                  setLocalOverrides(null);
                }}
              />
            ) : (
              <p
                className="mt-6 text-center text-sm"
                style={{ color: "var(--text-tertiary)" }}
              >
                시스템을 먼저 선택해 주세요.
              </p>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════
            STEP 3 — 채팅 테스트
        ════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <section
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              borderColor: "var(--border-subtle)",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div className="text-center">
              <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "var(--bg-subtle)" }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-tertiary)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2
                className="text-lg font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--text-primary)",
                }}
              >
                채팅 테스트
              </h2>
              <p
                className="mt-2 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                설정이 완료되었습니다. 우측 하단 채팅창에서 테스트해 보세요.
              </p>
            </div>

            {/* LLM status */}
            {!mockMode && llmStatus && (
              <div
                className="mt-6 rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor:
                    llmStatus.mode === "placeholder"
                      ? "var(--border-subtle)"
                      : "var(--border-accent)",
                  background:
                    llmStatus.mode === "placeholder"
                      ? "var(--bg-subtle)"
                      : "var(--green-50)",
                  color: "var(--text-secondary)",
                }}
              >
                <strong style={{ color: "var(--text-brand)" }}>LLM</strong>{" "}
                {llmStatus.mode === "placeholder" ? (
                  <>
                    플레이스홀더 응답 —{" "}
                    <code className="font-mono text-xs">ANTHROPIC_API_KEY</code>
                    를 넣으면 실제 스트리밍으로 전환됩니다.
                  </>
                ) : (
                  <>
                    실제 모델 스트리밍 (
                    <span className="font-mono text-xs">{llmStatus.mode}</span>
                    )
                  </>
                )}
              </div>
            )}

            {/* Connection summary */}
            <div
              className="mt-6 rounded-xl border px-4 py-4"
              style={{
                borderColor: "var(--border-subtle)",
                background: "var(--bg-subtle)",
              }}
            >
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-tertiary)" }}
              >
                현재 연결 설정
              </p>
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt
                    className="font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    projectId
                  </dt>
                  <dd
                    className="mt-1 break-all font-mono text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {effectiveConfig?.projectId ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt
                    className="font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    botName
                  </dt>
                  <dd
                    className="mt-1 text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {effectiveConfig?.ui.botName ?? "—"}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt
                    className="font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    theme / RAG namespace
                  </dt>
                  <dd
                    className="mt-1 font-mono text-sm"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {effectiveConfig
                      ? `${effectiveConfig.ui.theme} · ${effectiveConfig.rag?.vectorDbNamespace ?? "—"}`
                      : "—"}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt
                    className="font-mono text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    chat API URL
                  </dt>
                  <dd
                    className="mt-1 break-all font-mono text-xs leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {effectivePaths.apiPath}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Open chat button */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98]"
                style={{
                  fontFamily: "var(--font-body)",
                  background: "var(--taupe-500)",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                채팅 UI 열기
              </button>
            </div>
          </section>
        )}

        {/* ── Navigation buttons ── */}
        <div className="mt-6 flex justify-between">
          {currentStep > startStep ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-body)",
              }}
            >
              이전
            </button>
          ) : (
            <div />
          )}
          {currentStep < 3 && (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setCurrentStep((s) => s + 1)}
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontFamily: "var(--font-body)",
                background: "var(--taupe-500)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              다음
            </button>
          )}
        </div>

        {/* ── Footer ── */}
        <p
          className="mt-8 text-center text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          플레이스홀더 응답 후 Tool 확인 창이 뜨면 승인/취소를 눌러 보세요.
        </p>
      </div>

      {/* ── ChatWidget (always mounted, floating) ── */}
      {effectiveConfig && (
        <ChatWidget
          key={`${effectiveConfig.projectId}-${effectiveConfig.ui.botName}-${effectivePaths.apiPath}`}
          config={effectiveConfig}
          apiPath={effectivePaths.apiPath}
          confirmPath={effectivePaths.confirmPath}
          mockResponses={mockMode}
          onUnauthorized={
            mockMode || authDisabled
              ? undefined
              : () => {
                  void signOut({ redirect: false });
                }
          }
        />
      )}
    </main>
  );
}
