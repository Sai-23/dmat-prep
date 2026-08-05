import "server-only";

import { parseEnv, type Env } from "@/lib/validators/env-schema";

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsedEnv = parseEnv(process.env);

  if (!parsedEnv.success) {
    console.error(
      "Invalid environment configuration",
      parsedEnv.error.flatten().fieldErrors,
    );

    throw new Error(
      "Environment validation failed. Copy `.env.example` to `.env.local` and provide the required values.",
    );
  }

  cachedEnv = parsedEnv.data;
  return cachedEnv;
}
