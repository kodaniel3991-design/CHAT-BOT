/**
 * 프로젝트별 허용 Tool 이름 (LLM 연동 전 스텁 — 서버에서 확인 API 등에 사용).
 */
const ALLOWED_BY_PROJECT: Record<string, readonly string[]> = {
  "esg-on": ["demo_risk_action", "lookupEmissionFactor", "exportReportDraft"],
  "mes-on": ["demo_risk_action", "queryWorkOrders", "queryOeeSnapshot"],
};

export function canExecuteTool(projectId: string, toolName: string): boolean {
  const list = ALLOWED_BY_PROJECT[projectId];
  if (!list) return false;
  return list.includes(toolName);
}
