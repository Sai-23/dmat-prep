import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const auditTest = "src/lib/generation/mathematical-equations/quality-audit.test.ts";
const result = spawnSync(process.execPath, [vitest, "run", auditTest], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, DMAT_EQUATION_QUALITY_AUDIT: "1" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
