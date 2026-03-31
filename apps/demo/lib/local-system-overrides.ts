/**
 * 카탈로그 선택값 위에 덮어쓰는 로컬(브라우저) 설정.
 * 서버 `config-registry`에 없는 projectId를 쓰면 `/api/chat`이 UNKNOWN_PROJECT로 거절됩니다.
 */
export type LocalSystemOverrides = {
  projectId?: string;
  botName?: string;
  theme?: "light" | "dark" | "auto";
  placeholder?: string;
  welcomeMessage?: string;
  vectorDbNamespace?: string;
  /** 절대 URL 또는 `/api/chat` 같은 상대 경로 */
  chatApiUrl?: string;
  confirmApiUrl?: string;
};

const STORAGE_KEY = "luon-demo-system-overrides";

export function loadLocalSystemOverrides(): LocalSystemOverrides | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalSystemOverrides;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveLocalSystemOverrides(overrides: LocalSystemOverrides): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearLocalSystemOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
