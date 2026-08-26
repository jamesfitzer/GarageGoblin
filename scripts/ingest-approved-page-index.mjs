import { createReadStream, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";

const batchSize = Number(process.argv.find((argument) => argument.startsWith("--count="))?.split("=")[1] ?? 200);
const startOffset = Number(process.argv.find((argument) => argument.startsWith("--start="))?.split("=")[1] ?? 0);
const directory = path.resolve("generated/approved-page-index");

if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing. Add it to .env.local before ingesting.");
if (!existsSync(directory)) throw new Error("Page index is missing. Run `npm run extract:approved-pages` first.");

const pages = readdirSync(directory)
  .filter((filename) => filename.endsWith(".txt"))
  .sort()
  .map((filename) => path.join(directory, filename));

if (pages.length !== 768) throw new Error(`Expected 768 approved page files, found ${pages.length}. Re-run extraction and inspect the source set.`);
if (!Number.isInteger(batchSize) || batchSize < 1 || !Number.isInteger(startOffset) || startOffset < 0 || startOffset >= pages.length) {
  throw new Error("Provide valid --start=<0-767> and --count=<positive integer> values.");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const vectorStore = process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID
  ? await client.vectorStores.retrieve(process.env.OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID)
  : await client.vectorStores.create({ name: "Garage Goblin - Mk5 Full Approved Page Index" });
const alreadyIndexed = vectorStore.file_counts?.total ?? 0;

if (alreadyIndexed !== startOffset) {
  throw new Error(`Vector Store has ${alreadyIndexed} attached files, but this batch starts at ${startOffset}. Stop rather than risking duplicate or skipped page files.`);
}
const pendingPages = pages.slice(startOffset, startOffset + batchSize);

console.log(`Using full page-aware Vector Store: ${vectorStore.id}`);
console.log(`Uploading files ${startOffset + 1}-${startOffset + pendingPages.length} of ${pages.length}...`);

const batch = await client.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  { files: pendingPages.map((file) => createReadStream(file)) },
  { maxConcurrency: 5 },
);
if (batch.status !== "completed" || batch.file_counts.failed > 0) {
  throw new Error(`Ingestion batch did not complete successfully: ${JSON.stringify(batch.file_counts)}`);
}
console.log(`Submitted: ${JSON.stringify(batch.file_counts)}`);

console.log("\nAdd this line to .env.local, then restart `npm run dev`:");
console.log(`OPENAI_FULL_PAGE_INDEX_VECTOR_STORE_ID=${vectorStore.id}`);
