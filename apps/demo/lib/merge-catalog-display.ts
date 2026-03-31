import {
  createLuonServiceCatalog,
  type LuonServiceCatalog,
  type LuonServiceDefinition,
} from "@company/chatbot-service-kit";
import type { CatalogDisplayOverrides } from "./local-catalog-display";

/** 버튼/설명 표시만 바꾸고 `config`(projectId 등)는 그대로 둡니다. */
export function mergeCatalogDisplay(
  base: LuonServiceCatalog,
  overrides: CatalogDisplayOverrides | null
): LuonServiceCatalog {
  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  const merged: LuonServiceDefinition[] = base.services.map((s) => {
    const o = overrides[s.id];
    if (!o) return s;
    return {
      ...s,
      label:
        o.label !== undefined && o.label.trim() !== ""
          ? o.label.trim()
          : s.label,
      description:
        o.description !== undefined ? o.description : s.description,
    };
  });

  return createLuonServiceCatalog(merged);
}
