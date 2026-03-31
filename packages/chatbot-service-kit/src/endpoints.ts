import type {
  LuonServiceDefinition,
  LuonServiceEndpoints,
  ResolvedLuonEndpoints,
} from "./types";

const DEFAULTS: Required<LuonServiceEndpoints> = {
  chat: "/api/chat",
  confirm: "/api/chat/confirm",
  history: "/api/chat/history",
};

/** 절대 URL이면 그대로, 아니면 `base`가 있을 때만 앞에 붙입니다. */
export function joinApiUrl(
  base: string | undefined,
  path: string
): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (!base) {
    return path;
  }
  const b = base.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export type ResolveEndpointsOptions = {
  /** 모든 상대 경로 앞에 붙임 — 예: process.env.NEXT_PUBLIC_LUON_CHAT_API_BASE */
  globalBaseUrl?: string;
};

/**
 * 서비스 정의 + 선택적 전역 베이스 URL → 위젯에 넘길 경로.
 */
export function resolveLuonEndpoints(
  def: LuonServiceDefinition,
  options?: ResolveEndpointsOptions
): ResolvedLuonEndpoints {
  const chat = def.endpoints?.chat ?? DEFAULTS.chat;
  const confirm = def.endpoints?.confirm ?? DEFAULTS.confirm;
  const history = def.endpoints?.history ?? DEFAULTS.history;
  const base = options?.globalBaseUrl;
  return {
    apiPath: joinApiUrl(base, chat),
    confirmPath: joinApiUrl(base, confirm),
    historyPath: joinApiUrl(base, history),
  };
}
