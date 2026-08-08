import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(
  new URL("../node_modules/vitest/vitest.mjs", import.meta.url),
);
const stressTest = "src/lib/generation/mathematical-equations/stress.test.ts";
const result = spawnSync(process.execPath, [vitest, "run", stressTest], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  env: { ...process.env, DMAT_EQUATION_STRESS: "1" },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
