import { readFileSync } from "node:fs";

const baseUrl = process.env.GARAGE_GOBLIN_URL ?? "http://localhost:3000";
const dataset = JSON.parse(readFileSync(new URL("../data/mk5-roadster-torque-specs.json", import.meta.url), "utf8"));

const shorthandCases = [
  { prompt: "front UCA frame-bolt torque please", expectedPage: 50 },
  { prompt: "IRS sway bar end link torque", expectedPage: 139 },
  { prompt: "front caliper mounting bolts torque", expectedPage: 82 },
  { prompt: "IRS UCA torque", expectStop: true },
  { prompt: "rear banjo bolt torque", expectStop: true },
];

async function ask(prompt) {
  const response = await fetch(`${baseUrl}/api/briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: prompt }),
  });
  if (!response.ok) throw new Error(`${prompt}: HTTP ${response.status}`);
  return response.json();
}

const failures = [];
for (const spec of dataset.entries) {
  const configurationHint = spec.id === "rear-brake-banjo-non-irs" ? " for a non-IRS rear brake installation" : "";
  const result = await ask(`What is the torque for ${spec.component}${configurationHint}?`);
  const hasExpectedPage = result.citations?.some((citation) => citation.page === spec.source.page);
  const shouldStop = spec.status === "needs-review";
  if ((shouldStop && !result.answer.includes("STOP & VERIFY")) || (!shouldStop && !result.answer.includes(spec.component)) || !hasExpectedPage) {
    failures.push({ id: spec.id, expectedStatus: spec.status, answer: result.answer, citations: result.citations });
  }
}

for (const test of shorthandCases) {
  const result = await ask(test.prompt);
  const passed = test.expectStop ? result.answer.includes("STOP & VERIFY") : result.citations?.some((citation) => citation.page === test.expectedPage);
  if (!passed) failures.push({ prompt: test.prompt, answer: result.answer, citations: result.citations });
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}

console.log(`Passed ${dataset.entries.length} structured-record checks and ${shorthandCases.length} shorthand/ambiguity checks against ${baseUrl}.`);
