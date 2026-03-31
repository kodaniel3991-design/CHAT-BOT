/**
 * 적용 시스템 선택 버튼에 보이는 이름(가칭)·설명 — 서버 카탈로그와 별도로 브라우저에만 저장.
 * `id`는 `config/luon-services.ts`의 서비스 id와 같아야 합니다.
 */
export type CatalogDisplayOverrides = Record<
  string,
  { label?: string; description?: string }
>;

const STORAGE_KEY = "luon-demo-catalog-display";

export function loadCatalogDisplayOverrides(): CatalogDisplayOverrides | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CatalogDisplayOverrides;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCatalogDisplayOverrides(
  overrides: CatalogDisplayOverrides
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function clearCatalogDisplayOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
