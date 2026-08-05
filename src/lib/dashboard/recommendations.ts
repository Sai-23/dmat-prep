import type { Recommendation, TopicPerformance } from "@/types/analytics";

export function buildRecommendations(
  completedAttempts: number,
  weakTopics: TopicPerformance[],
): Recommendation[] {
  if (completedAttempts === 0) {
    return [
      {
        title: "Start with a diagnostic",
        description:
          "Complete your first diagnostic test to establish an accuracy and timing baseline.",
        priority: "high",
      },
      {
        title: "Try a short practice session",
        description:
          "Choose one module and answer 10 questions to begin building topic insights.",
        priority: "medium",
      },
    ];
  }

  const recommendations: Recommendation[] = weakTopics.slice(0, 2).map((topic) => ({
    title: `Strengthen ${topic.topic}`,
    description: `Your current accuracy is ${Math.round(topic.accuracy)}%. Review explanations, then retry a focused set.`,
    priority: topic.accuracy < 50 ? "high" : "medium",
  }));

  recommendations.push({
    title: "Keep your momentum",
    description: "Complete another timed set to improve the reliability of your insights.",
    priority: "low",
  });

  return recommendations;
}

export function formatStudyTime(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function daysUntil(date: string, now = new Date()) {
  const target = new Date(`${date}T00:00:00`);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.ceil((target.getTime() - start.getTime()) / 86_400_000));
}
