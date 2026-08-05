export type TopicPerformance = {
  topic: string;
  subtopic: string | null;
  accuracy: number;
  averageTimeSeconds: number;
  attempts: number;
};

export type Recommendation = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};

export type DashboardSnapshot = {
  overallAccuracy: number;
  averageResponseTimeSeconds: number;
  completedAttempts: number;
  weakTopics: TopicPerformance[];
  recommendations: Recommendation[];
};

export type DashboardAttempt = {
  id: string;
  testId: string;
  testTitle: string;
  status: "in_progress" | "submitted" | "auto_submitted" | "abandoned";
  startedAt: string;
  submittedAt: string | null;
  totalTimeSeconds: number;
  score: number | null;
  accuracy: number | null;
};

export type DashboardTask = {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  targetCount: number | null;
  status: "pending" | "in_progress" | "completed" | "skipped";
  dueAt: string | null;
};

export type DashboardData = {
  displayName: string;
  targetExamDate: string | null;
  completedAttempts: number;
  overallAccuracy: number | null;
  totalTimeSeconds: number;
  bookmarkCount: number;
  recentAttempts: DashboardAttempt[];
  weakTopics: TopicPerformance[];
  studyTasks: DashboardTask[];
};
