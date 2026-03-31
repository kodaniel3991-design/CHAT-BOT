import type {
  LuonServiceCatalog,
  LuonServiceDefinition,
} from "./types";

export function createLuonServiceCatalog(
  services: readonly LuonServiceDefinition[]
): LuonServiceCatalog {
  const map = new Map<string, LuonServiceDefinition>();
  for (const s of services) {
    if (map.has(s.id)) {
      throw new Error(`[chatbot-service-kit] Duplicate service id: ${s.id}`);
    }
    map.set(s.id, s);
  }
  return {
    services,
    getById: (id) => map.get(id),
    ids: services.map((s) => s.id),
  };
}
