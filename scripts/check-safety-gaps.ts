import { getDemoBuildSafetyGaps } from "../lib/demo-build-context.ts";

const gaps = getDemoBuildSafetyGaps("Prep me for: Wilwood 140-15138 front brake kit installation.");
const fluidGap = gaps.find((gap) => /brake-fluid choice/i.test(gap.text));

if (!fluidGap) throw new Error("Expected a deterministic brake-fluid STOP & VERIFY gap.");
if (!/Factory Five specifies DOT 3/i.test(fluidGap.text) || !/Wilwood 140-15138/i.test(fluidGap.text)) {
  throw new Error("The brake-fluid gap must name both conflicting controlling sources.");
}

const expectedCitations = ["mk5-roadster-manual:280", "wilwood-140-15138:7"];
const actualCitations = (fluidGap.citations ?? []).map((citation) => `${citation.sourceId}:${citation.page}`).sort();
if (JSON.stringify(actualCitations) !== JSON.stringify(expectedCitations)) {
  throw new Error(`Expected exact fluid-conflict citations ${expectedCitations.join(", ")}; received ${actualCitations.join(", ") || "none"}.`);
}

console.log("Safety-gap regression check passed.");
