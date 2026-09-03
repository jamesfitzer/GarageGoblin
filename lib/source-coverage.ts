export const sourceCoverageValues = ["direct", "context_only", "personal_preference", "ambiguous"] as const;

export type SourceCoverage = (typeof sourceCoverageValues)[number];

const coverageMarker = /\s*<!--\s*garage-goblin-source-coverage:\s*(direct|context_only|personal_preference|ambiguous)\s*-->\s*$/i;
const manualLeavesChoiceOpen = /\b(?:does\s+not|doesn't|do\s+not|don't|does not)\s+(?:specify|prescribe|choose|recommend)|\b(?:up to you|your choice|personal preference|subjective|builder preference|leaves? (?:the )?choice(?: up to)?)/i;
const preferenceQuestion = /\b(?:what\s+colou?r|paint\s+colou?r|colou?r\s+scheme|finish(?:\s+colou?r)?|style|appearance|look|aesthetic|theme|upholstery|comfort|inspiration|best[-\s]?looking)\b/i;

export function assessSourceCoverage({
  answer,
  question,
  hasMappedCitation,
}: {
  answer: string;
  question: string;
  hasMappedCitation: boolean;
}) {
  const marker = answer.match(coverageMarker);
  const visibleAnswer = marker ? answer.replace(coverageMarker, "").trim() : answer.trim();
  const markedCoverage = marker?.[1].toLowerCase() as SourceCoverage | undefined;

  if (markedCoverage) {
    return {
      answer: visibleAnswer,
      sourceCoverage: markedCoverage === "direct" && !hasMappedCitation ? "ambiguous" as const : markedCoverage,
    };
  }

  if (manualLeavesChoiceOpen.test(visibleAnswer)) {
    return {
      answer: visibleAnswer,
      sourceCoverage: preferenceQuestion.test(question) ? "personal_preference" as const : "context_only" as const,
    };
  }

  return {
    answer: visibleAnswer,
    sourceCoverage: hasMappedCitation ? "direct" as const : "ambiguous" as const,
  };
}
