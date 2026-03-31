import { describe, expect, it } from "vitest";
import { canExecuteTool } from "./toolAccess";

describe("canExecuteTool", () => {
  it("allows registered tools per project", () => {
    expect(canExecuteTool("esg-on", "demo_risk_action")).toBe(true);
    expect(canExecuteTool("mes-on", "queryOeeSnapshot")).toBe(true);
  });

  it("rejects unknown project or tool", () => {
    expect(canExecuteTool("unknown", "demo_risk_action")).toBe(false);
    expect(canExecuteTool("esg-on", "not_a_real_tool")).toBe(false);
  });
});
