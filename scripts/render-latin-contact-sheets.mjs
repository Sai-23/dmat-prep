import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import sharp from "sharp";

const reportDirectory = resolve(process.cwd(), "reports", "latin-squares");
for (const difficulty of ["easy", "medium", "hard"]) {
  const tiles = await Promise.all(
    Array.from({ length: 10 }, async (_, index) => ({
      input: await readFile(resolve(reportDirectory, `visual-${difficulty}-${index + 1}.svg`)),
      left: (index % 5) * 420,
      top: Math.floor(index / 5) * 525,
    })),
  );
  const sheet = await sharp({
    create: { width: 2100, height: 1050, channels: 4, background: "#e2e8f0" },
  }).composite(tiles).png().toBuffer();
  await writeFile(resolve(reportDirectory, `visual-${difficulty}-contact-sheet.png`), sheet);
}
