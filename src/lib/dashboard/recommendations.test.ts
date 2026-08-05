import { describe, expect, it } from "vitest";

import { buildRecommendations, daysUntil, formatStudyTime } from "./recommendations";

describe("dashboard recommendations", () => {
  it("guides a new student toward a diagnostic", () => {
    expect(buildRecommendations(0, [])[0]?.title).toBe("Start with a diagnostic");
  });

  it("prioritizes a weak topic", () => {
    const result = buildRecommendations(3, [
      {
        topic: "Algorithms",
        subtopic: null,
        accuracy: 42,
        averageTimeSeconds: 90,
        attempts: 12,
      },
    ]);

    expect(result[0]).toMatchObject({
      title: "Strengthen Algorithms",
      priority: "high",
    });
  });

  it("formats study duration compactly", () => {
    expect(formatStudyTime(45)).toBe("45s");
    expect(formatStudyTime(3_900)).toBe("1h 5m");
  });

  it("never returns a negative exam countdown", () => {
    expect(daysUntil("2026-08-01", new Date("2026-08-05T10:00:00"))).toBe(0);
    expect(daysUntil("2026-08-10", new Date("2026-08-05T10:00:00"))).toBe(5);
  });
});
