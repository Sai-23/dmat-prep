import { describe, expect, it } from "vitest";

import {
  buildResultBreakdown,
  buildResultRecommendation,
} from "./analytics";

describe("result analytics", () => {
  it("aggregates accuracy and timing by label", () => {
    const result = buildResultBreakdown([
      {
        label: "Algorithms",
        isCorrect: true,
        answered: true,
        timeSpentSeconds: 30,
      },
      {
        label: "Algorithms",
        isCorrect: false,
        answered: true,
        timeSpentSeconds: 50,
      },
    ]);

    expect(result[0]).toMatchObject({
      label: "Algorithms",
      correct: 1,
      total: 2,
      accuracy: 50,
      averageTimeSeconds: 40,
    });
  });

  it("recommends the weakest topic when it is below target", () => {
    expect(
      buildResultRecommendation(65, { label: "Networks", accuracy: 40 }).title,
    ).toBe("Revisit Networks");
  });
});
