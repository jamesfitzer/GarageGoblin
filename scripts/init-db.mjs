import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Add the Neon connection string to .env.local.");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(readFileSync("db/schema.sql", "utf8"));
  console.log("Neon schema initialized.");
} finally {
  await pool.end();
}
