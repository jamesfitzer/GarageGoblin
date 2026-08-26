import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID) {
  throw new Error("OPENAI_API_KEY and OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID are required.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const question = "Prep me for: 2015+ IRS installation.";
const baseInstructions = `You are Garage Goblin, a document-grounded garage copilot for one Factory Five Mk5 Roadster demo build.

Factory Five documentation controls. Use retrieved Factory Five manuals for the procedure. Be concise and garage-scannable: identify the applicable procedure, what to stage, the practical sequence, and a few specific hold points. Do not provide numeric torque values in prose. Do not invent a generic tool list or parts-compatibility conclusion.`;

const cases = [
  {
    id: "manual-only",
    instructions: baseInstructions,
    tools: [{ type: "file_search", vector_store_ids: [process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID], max_num_results: 8 }],
  },
  {
    id: "manual-plus-forum",
    instructions: `${baseInstructions}

After retrieving the manuals, research only the Factory Five Forum for current Mk5/2015+ IRS installation discussion. Include at most three relevant threads, only when they add a concrete gotcha or describe a procedure. Put them under a clearly labeled \"Factory Five community experience — not Factory Five guidance\" heading. Do not use a forum thread to authorize drilling, machining, a torque value, or a deviation from Factory Five documentation. If no relevant thread is found, say so briefly.`,
    tools: [
      { type: "file_search", vector_store_ids: [process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID], max_num_results: 8 },
      { type: "web_search", filters: { allowed_domains: ["thefactoryfiveforum.com"] }, search_context_size: "low" },
    ],
  },
  {
    id: "forum-research-only",
    instructions: `You are performing a separate community-research pass for Garage Goblin. Search only the Factory Five Forum for current Factory Five Mk5 / 2015+ Mustang IRS installation threads. Find at most three threads that either describe the installation procedure or identify a concrete gotcha. For each, give a one-sentence, clearly labeled "Factory Five community experience — not Factory Five guidance" takeaway and the original thread link. Never authorize drilling, machining, a torque value, or a deviation from Factory Five documentation. If the search does not yield a relevant thread, say so plainly.`,
    tools: [{ type: "web_search", filters: { allowed_domains: ["thefactoryfiveforum.com"] }, search_context_size: "low" }],
    toolChoice: "required",
  },
];

const only = process.argv.find((argument) => argument.startsWith("--only="))?.split("=")[1];
const selectedCases = only ? cases.filter((testCase) => testCase.id === only) : cases;
if (only && selectedCases.length !== 1) throw new Error("Use --only=manual-only, --only=manual-plus-forum, or --only=forum-research-only.");
const results = [];
for (const testCase of selectedCases) {
  const started = performance.now();
  const response = await client.responses.create({
    model: "gpt-5.4-mini",
    instructions: testCase.instructions,
    input: question,
    tools: testCase.tools,
    ...(testCase.toolChoice ? { tool_choice: testCase.toolChoice } : {}),
    include: ["file_search_call.results", "web_search_call.action.sources"],
    store: false,
  });
  const elapsedMs = Math.round(performance.now() - started);
  const webSources = response.output
    .filter((item) => item.type === "web_search_call")
    .flatMap((item) => item.action?.sources ?? item.sources ?? [])
    .map((source) => ({ title: source.title, url: source.url }))
    .filter((source, index, all) => source.url && all.findIndex((item) => item.url === source.url) === index);
  const result = { id: testCase.id, elapsedMs, answer: response.output_text, webSources };
  results.push(result);
  console.log(`${testCase.id}: ${elapsedMs}ms, ${webSources.length} web sources`);
}

mkdirSync("generated", { recursive: true });
writeFileSync("generated/forum-workflow-evaluation.json", `${JSON.stringify({ question, results }, null, 2)}\n`);
console.log("Saved generated/forum-workflow-evaluation.json");
