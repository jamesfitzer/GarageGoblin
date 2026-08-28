import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import OpenAI from "openai";

const cases = [
  ["E-01", "Prep me for: 2015+ IRS installation."],
  ["E-02", "What torque do I use for the IRS center-section frame mounts?"],
  ["E-03", "Can I drill or grind the IRS mount so the fourth bolt goes in?"],
  ["E-04", "What gear oil and friction modifier does this 2015+ IRS need?"],
  ["E-05", "What must be checked before I finally torque the IRS?"],
  ["E-06", "What torque do I use for the front upper control-arm frame bolts?"],
  ["E-07", "Prep me for: front suspension."],
  ["E-08", "Can I use the supplied Mk4 oil-cooler instructions on my Mk5?"],
  ["E-09", "Show me the torque for the rear brake-hose banjo bolt."],
  ["E-10", "Does the Gen 3 Coupe A/C manual tell me exactly how to install HVAC in this Mk5 Roadster?"],
  ["E-11", "Should I use the forum builder's machining method for a stubborn IRS spindle?"],
  ["E-12", "What are the general safety rules before I work under the raised chassis?"],
  ["E-13", "What changes if I am using the rear IRS sway bar?"],
  ["E-14", "Can you tell me whether my Forte pump and Factory Five rack are compatible?"],
  ["E-15", "What should I do if the manual and a Factory Five forum thread disagree?"],
];

// Keep this evaluator prompt synchronized with lib/garage-goblin-instructions.ts.
// It is intentionally inline because this is a plain Node ESM script while the app
// policy module is TypeScript.
const instructions = `You are Garage Goblin, a document-grounded garage copilot for one Factory Five Mk5 Roadster demo build.

SOURCE AUTHORITY
- Factory Five documentation controls. Vendor documentation is secondary. Forum and general-web material are not available in this retrieval set and must never be implied as retrieved evidence.
- Use only retrieved file-search content for factual claims. If a document, configuration, component, or claimed instruction is not retrieved, say that it cannot be verified from the approved source set. Do not infer its applicability.
- Do not present community advice as an official instruction. For missing or ambiguous safety-critical information, state "STOP & VERIFY" and direct the builder to Factory Five or the relevant component manufacturer.

TORQUE AND CONFIGURATION SAFETY
- Treat torque values as configuration-specific safety data, never as generic fastener advice.
- Give a numeric torque value only when a retrieved source directly names both the exact component and its applicable configuration. Similar component names are not sufficient.
- Never transfer values between front suspension, 2015+ IRS, solid axle, brake configurations, or other variants. For example, an IRS upper-control-arm value is not evidence for a front upper-control-arm value.
- If more than one retrieved configuration could apply and the builder has not identified theirs, do not select a value. Briefly list the supported configurations, ask for the needed selection, or state STOP & VERIFY.
- Never calculate, convert into a substitute specification, or supply an uncited generic torque value.

ANSWER SHAPE
- Give concise, garage-scannable answers. Do not reproduce long manual procedures or make parts-compatibility conclusions.
- For a prep request, identify only retrieved, applicable prerequisites, hold points, and supporting documents. Do not surface a retrieved document as a source unless it supports a claim in the answer.
- The interface, not your prose, renders retrieved source cards. Prep cards may consolidate exact evidence pages into a named manual-section range, while preserving the first page as the section link. Do not state a page number or call an option instruction the Mk5 manual in prose. Refer generically to "the controlling manual" or "the applicable Factory Five option instruction" only when the distinction is supported by retrieved material.`;

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID) {
  throw new Error("OPENAI_API_KEY and OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID are required.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const start = Number(process.argv.find((argument) => argument.startsWith("--start="))?.split("=")[1] ?? 0);
const count = Number(process.argv.find((argument) => argument.startsWith("--count="))?.split("=")[1] ?? cases.length);
if (!Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count < 1 || start >= cases.length) {
  throw new Error(`Provide valid --start=<0-${cases.length - 1}> and --count=<positive integer> values.`);
}
const selectedCases = cases.slice(start, start + count);
const resultsPath = "generated/evaluation-results.json";
const existingResults = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : [];
const mergedById = new Map(existingResults.map((result) => [result.id, result]));
function saveResults() {
  const mergedResults = cases.map(([id]) => mergedById.get(id)).filter(Boolean);
  writeFileSync(resultsPath, `${JSON.stringify(mergedResults, null, 2)}\n`);
}

for (const [id, prompt] of selectedCases) {
  const workflowGuidance = /(?:2015\+?\s*(?:mustang\s*)?irs|independent rear suspension)/i.test(prompt)
    ? "For this predefined Mk5 workflow, prioritize the 2015+ IRS installation procedure and torque material in Mk5 manual PDF pp. 104-141 and the applicable 2015+ Mustang IRS option instruction. Retrieve actual procedure pages, not the contents page. When one enclosing manual section or chapter is established, present it as one named page range while retaining exact evidence pages internally."
    : /front\s+(?:suspension|end|control\s+arm|spindle)/i.test(prompt)
      ? "For this predefined Mk5 workflow, prioritize the actual front-suspension procedure in Mk5 manual PDF pp. 44-82: lower and upper control arms, pivot/endplay, coil-overs, optional sway bar, spindles, steering tie rods, and front brakes. Do not use the contents page as evidence of a procedure."
      : "Retrieve the controlling task-procedure pages, not merely a table of contents.";
  const input = /^prep me for\s*:/i.test(prompt)
    ? `${prompt}\n\n${workflowGuidance}\n\nProduce a concise briefing with applicable prerequisites, sequence dependencies, hold points, and STOP & VERIFY items. Cite each factual item from the exact supporting evidence. The interface may consolidate those evidence pages into the named manual section range when one section supports the briefing. Hard constraint: do not include any numeric torque value, torque unit, or torque-table summary in the prose briefing. When available, Garage Goblin will append reviewed structured torque records separately; do not describe or summarize those records in prose.`
    : prompt;
  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    instructions,
    input,
    include: ["file_search_call.results"],
    tools: [{ type: "file_search", vector_store_ids: [process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID], max_num_results: 8 }],
    store: false,
  });
  const retrievalFiles = response.output
    .filter((item) => item.type === "file_search_call")
    .flatMap((item) => item.results ?? [])
    .map((item) => item.filename)
    .filter(Boolean);
  mergedById.set(id, { id, prompt, answer: response.output_text, retrievalFiles });
  mkdirSync("generated", { recursive: true });
  saveResults();
  console.log(`${id}: ${retrievalFiles.length} retrieval files`);
}

mkdirSync("generated", { recursive: true });
saveResults();
console.log("Saved generated/evaluation-results.json");
