export const PRACTICE_TIMING_MODES = [
  {
    value: "untimed" as const,
    title: "Untimed learning",
    description: "Work without a countdown and focus on explanations.",
  },
  {
    value: "timed" as const,
    title: "Exam pace",
    description: "Use the calibrated target pace for the selected questions.",
  },
] as const;

export function practiceTargetPaceSeconds(estimatedTimeSeconds: number) {
  return Math.max(1, Math.round(estimatedTimeSeconds));
}
