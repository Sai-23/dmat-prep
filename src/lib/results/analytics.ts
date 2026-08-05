type BreakdownInput = {
  label: string;
  isCorrect: boolean;
  answered: boolean;
  timeSpentSeconds: number;
};

export function buildResultBreakdown(rows: BreakdownInput[]) {
  const groups = new Map<
    string,
    { correct: number; total: number; totalTimeSeconds: number }
  >();

  for (const row of rows) {
    const group = groups.get(row.label) ?? {
      correct: 0,
      total: 0,
      totalTimeSeconds: 0,
    };
    group.total += 1;
    if (row.answered && row.isCorrect) group.correct += 1;
    group.totalTimeSeconds += row.timeSpentSeconds;
    groups.set(row.label, group);
  }

  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      correct: group.correct,
      total: group.total,
      accuracy: group.total ? (group.correct / group.total) * 100 : 0,
      averageTimeSeconds: group.total
        ? group.totalTimeSeconds / group.total
        : 0,
    }))
    .sort((left, right) => left.accuracy - right.accuracy);
}

export function buildResultRecommendation(
  accuracy: number,
  weakestTopic?: { label: string; accuracy: number },
) {
  if (weakestTopic && weakestTopic.accuracy < 70) {
    return {
      title: `Revisit ${weakestTopic.label}`,
      description: `Your accuracy in this topic was ${Math.round(weakestTopic.accuracy)}%. Review the explanations below, then complete a focused practice session.`,
    };
  }

  if (accuracy >= 80) {
    return {
      title: "Increase the challenge",
      description:
        "Strong result. Try a harder or longer timed assessment to keep progressing.",
    };
  }

  return {
    title: "Review before your next attempt",
    description:
      "Work through incorrect and unanswered questions, then retry a focused practice set.",
  };
}
