import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const result = spawnSync(
  process.execPath,
  [vitest, "run", "src/lib/generation/mathematical-equations/difficulty-audit.test.ts"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DMAT_EQUATION_DIFFICULTY_AUDIT: "1" },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const renderResult = spawnSync(
  process.execPath,
  [fileURLToPath(new URL("./render-equation-contact-sheets.mjs", import.meta.url))],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
  },
);
if (renderResult.error) throw renderResult.error;
process.exit(renderResult.status ?? 1);
