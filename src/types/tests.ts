export type TestType = "diagnostic" | "mini_mock" | "full_mock" | "sectional";

export type TestStatus =
  | "draft"
  | "published"
  | "flagged"
  | "retired"
  | "archived";

export type AttemptStatus =
  | "in_progress"
  | "submitted"
  | "auto_submitted"
  | "abandoned";

export type TestSummary = {
  id: string;
  title: string;
  description: string | null;
  type: TestType;
  durationSeconds: number;
  isPremium: boolean;
  status: TestStatus;
};
