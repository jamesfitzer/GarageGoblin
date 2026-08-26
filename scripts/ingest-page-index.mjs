import { createReadStream, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing. Add it to .env.local before ingesting.");

const directory = path.resolve("generated/irs-page-index");
if (!existsSync(directory)) throw new Error("Page index is missing. Run `npm run extract:irs-pages` first.");

const pages = readdirSync(directory)
  .filter((filename) => filename.endsWith(".txt"))
  .sort()
  .map((filename) => path.join(directory, filename));

if (!pages.length) throw new Error("No page-aware text files were found.");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStore = process.env.OPENAI_PAGE_INDEX_VECTOR_STORE_ID
  ? await client.vectorStores.retrieve(process.env.OPENAI_PAGE_INDEX_VECTOR_STORE_ID)
  : await client.vectorStores.create({ name: "Garage Goblin - Mk5 IRS Page Citation Proof" });

console.log(`Using page-aware Vector Store: ${vectorStore.id}`);
console.log(`Uploading ${pages.length} page-aware retrieval files...`);

const batch = await client.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  { files: pages.map((file) => createReadStream(file)) },
  { maxConcurrency: 5 },
);

if (batch.status !== "completed" || batch.file_counts.failed > 0) {
  throw new Error(`Ingestion did not complete successfully: ${JSON.stringify(batch.file_counts)}`);
}

console.log(`Completed: ${JSON.stringify(batch.file_counts)}`);
console.log("\nAdd this line to .env.local, then restart `npm run dev`:");
console.log(`OPENAI_PAGE_INDEX_VECTOR_STORE_ID=${vectorStore.id}`);
