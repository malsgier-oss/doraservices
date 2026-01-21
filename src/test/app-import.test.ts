import { describe, expect, it } from "vitest";

describe("app import smoke", () => {
  it("imports App without throwing", async () => {
    const mod = await import("@/App");
    expect(mod.default).toBeDefined();
  });
});

