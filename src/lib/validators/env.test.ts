import { describe, expect, it } from "vitest";

import { parseEnv } from "./env-schema";

describe("parseEnv", () => {
  it("accepts a complete environment configuration", () => {
    const result = parseEnv({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid public urls", () => {
    const result = parseEnv({
      NEXT_PUBLIC_APP_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(result.success).toBe(false);
  });
});
