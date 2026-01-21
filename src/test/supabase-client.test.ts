import { describe, expect, it } from "vitest";

describe("supabase client smoke", () => {
  it("creates a supabase client", async () => {
    const mod = await import("@/integrations/supabase/client");
    expect(mod.supabase).toBeDefined();
  });
});

