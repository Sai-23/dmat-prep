import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const reportDirectory = resolve(process.cwd(), "reports", "mathematical-equations");
for (const difficulty of ["easy", "medium", "hard"]) {
  const tiles = await Promise.all(
    Array.from({ length: 15 }, async (_, index) => ({
      input: await readFile(resolve(reportDirectory, `visual-${difficulty}-${index + 1}.svg`)),
      left: (index % 3) * 1000,
      top: Math.floor(index / 3) * 410,
    })),
  );
  const sheet = await sharp({
    create: { width: 3000, height: 2050, channels: 4, background: "#e2e8f0" },
  }).composite(tiles).png().toBuffer();
  await writeFile(resolve(reportDirectory, `visual-${difficulty}-contact-sheet.png`), sheet);
}
