import { readFile } from "node:fs/promises";
import { put } from "@vercel/blob";
import { initialSources } from "../lib/sources.ts";

if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is missing. Add the private Blob token to .env.local.");

for (const source of initialSources) {
  const contents = await readFile(`sources/${source.filename}`);
  const blob = await put(`sources/${source.id}.pdf`, contents, {
    access: "private",
    addRandomSuffix: false,
    contentType: "application/pdf",
    cacheControlMaxAge: 31536000,
  });
  console.log(`${source.id}: uploaded (${blob.pathname})`);
}
