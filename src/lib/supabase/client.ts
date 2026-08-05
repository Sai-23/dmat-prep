"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

function getBrowserEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing public environment variable: ${name}`);
  }

  return value;
}

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    getBrowserEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getBrowserEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
