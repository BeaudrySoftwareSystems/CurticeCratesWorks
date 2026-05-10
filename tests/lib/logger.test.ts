import { describe, it, expect } from "vitest";
import { logger, createChildLogger } from "@/lib/logger";

describe("logger", () => {
  it("constructs without throwing", () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeTypeOf("function");
  });

  it("createChildLogger binds requestId", () => {
    const child = createChildLogger("req-test-1");
    expect(child).toBeDefined();
    expect(child.bindings()).toMatchObject({ requestId: "req-test-1" });
  });

  it("createChildLogger merges additional bindings", () => {
    const child = createChildLogger("req-test-2", { userId: "u-1" });
    expect(child.bindings()).toMatchObject({
      requestId: "req-test-2",
      userId: "u-1",
    });
  });
});
