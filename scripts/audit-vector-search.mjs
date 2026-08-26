import { mkdirSync, writeFileSync } from "node:fs";
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

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID) {
  throw new Error("OPENAI_API_KEY and OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID are required.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const results = [];

for (const [id, prompt] of cases) {
  const response = await client.vectorStores.search(process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID, { query: prompt, max_num_results: 8 });
  const retrievalFiles = response.data.map((result) => result.filename);
  results.push({ id, prompt, retrievalFiles });
  console.log(`${id}: ${retrievalFiles.join(", ")}`);
}

mkdirSync("generated", { recursive: true });
writeFileSync("generated/vector-search-audit.json", `${JSON.stringify(results, null, 2)}\n`);
