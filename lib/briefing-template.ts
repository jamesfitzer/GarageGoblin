const garageCardSections = [
  { id: "what-youre-doing", title: "What you're doing", fallback: "The retrieved material does not establish a concise task summary." },
  { id: "bring", title: "Bring to the car", fallback: "The retrieved material does not enumerate a complete tool or material list for this task." },
  { id: "do", title: "Do this", fallback: "Follow the cited Factory Five procedure; the retrieved material did not establish a concise task sequence." },
  { id: "watch", title: "Watch for", fallback: "No non-obvious manual gotcha was retrieved for this task." },
  { id: "next", title: "Next / selected follow-on work", fallback: "No selected follow-on work was retrieved for this task." },
  { id: "verify", title: "Verify before closing", fallback: "Complete the cited procedure and verify any configuration-specific work before concealing access." },
  { id: "stop", title: "STOP & VERIFY", fallback: "No additional unresolved safety-critical gap was retrieved for this task." },
] as const;

export type BriefingSection = {
  id: (typeof garageCardSections)[number]["id"];
  title: (typeof garageCardSections)[number]["title"];
  content: string;
};

export type BriefingArtifact = {
  prepared: string;
  buildPhase: string;
  applicableConfiguration: string;
  primaryAuthority: string;
  readiness: "Ready" | "Ready after checks" | "Stop pending resolution";
  sections: BriefingSection[];
};

function contentForHeading(answer: string, title: string) {
  const titles = garageCardSections.map((section) => section.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const headingMatcher = new RegExp(`^\\s*(?:#{1,3}\\s+|\\*{0,2})(${titles})(?:\\*{0,2})\\s*$`, "gim");
  const headings = [...answer.matchAll(headingMatcher)];
  const index = headings.findIndex((heading) => heading[1].toLowerCase() === title.toLowerCase());
  if (index < 0) return undefined;
  const current = headings[index];
  const contentStart = (current.index ?? 0) + current[0].length;
  const contentEnd = headings[index + 1]?.index ?? answer.length;
  const content = answer.slice(contentStart, contentEnd).trim();
  return content || undefined;
}

function phaseFor(question: string) {
  if (/fuel\s+tank|fuel[-\s]?line/i.test(question)) return "Mock-up / Assembly";
  if (/kit\s+intake|chassis\s+prep|body\s+removal/i.test(question)) return "Inventory / Mock-up";
  if (/brake\s+final|bleed|rolling\s+chassis/i.test(question)) return "Setup / Commissioning";
  return "Assembly";
}

/** Converts a constrained model response into the compact workbench card. */
export function buildBriefingArtifact(question: string, answer: string): BriefingArtifact {
  const stopContent = contentForHeading(answer, "STOP & VERIFY");
  const hasStop = Boolean(stopContent && !/no additional unresolved safety-critical gap (?:was )?retrieved/i.test(stopContent));
  const hasUnverified = /\b(?:not established|not retrieved|cannot verify|unknown)\b/i.test(answer);

  return {
    prepared: new Date().toISOString().slice(0, 10),
    buildPhase: phaseFor(question),
    applicableConfiguration: "Factory Five Mk5 Roadster; confirm exact delivered parts and selected options.",
    primaryAuthority: "Retrieved Factory Five documentation",
    readiness: hasStop ? "Stop pending resolution" : hasUnverified ? "Ready after checks" : "Ready",
    sections: garageCardSections.map((section) => ({
      id: section.id,
      title: section.title,
      content: contentForHeading(answer, section.title) ?? section.fallback,
    })),
  };
}
