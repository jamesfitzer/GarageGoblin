import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const sourceFiles = [
  "mk5-roadster-manual.pdf",
  "15942-2015-mustang-irs-rev-d.pdf",
  "15998-2015-irs-swaybar.pdf",
  "14680-koni-irs-coil-overs.pdf",
];

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing. Add it to .env.local before ingesting.");
}

const sourceDirectory = path.resolve("sources");
const paths = sourceFiles.map((filename) => path.join(sourceDirectory, filename));
const missing = paths.filter((file) => !existsSync(file));
if (missing.length) throw new Error(`Missing approved source file(s): ${missing.join(", ")}`);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStore = process.env.OPENAI_VECTOR_STORE_ID
  ? await client.vectorStores.retrieve(process.env.OPENAI_VECTOR_STORE_ID)
  : await client.vectorStores.create({ name: "Garage Goblin - Mk5 IRS Retrieval Proof" });

console.log(`Using Vector Store: ${vectorStore.id}`);
console.log(`Uploading ${sourceFiles.length} approved IRS-proof documents...`);

const batch = await client.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  { files: paths.map((file) => createReadStream(file)) },
  { maxConcurrency: 2 },
);

if (batch.status !== "completed" || batch.file_counts.failed > 0) {
  throw new Error(`Ingestion did not complete successfully: ${JSON.stringify(batch.file_counts)}`);
}

console.log(`Completed: ${JSON.stringify(batch.file_counts)}`);
console.log("\nAdd this line to .env.local, then restart `npm run dev`:");
console.log(`OPENAI_VECTOR_STORE_ID=${vectorStore.id}`);
