import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL ?? process.env.DATABASE_URL_PROD;
if (!databaseUrl) throw new Error("DATABASE_URL or DATABASE_URL_PROD is missing.");

const sql = neon(databaseUrl);
const rows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = ${"public"}
    AND table_name IN (${"app_users"}, ${"user_workspaces"})
  ORDER BY table_name
`;
const tables = rows.map((row) => row.table_name);
const expected = ["app_users", "user_workspaces"];
if (tables.length !== expected.length || tables.some((table, index) => table !== expected[index])) {
  throw new Error(`Neon is reachable, but the expected schema is incomplete. Found: ${tables.join(", ") || "none"}`);
}
console.log(`Neon connection healthy. Tables present: ${tables.join(", ")}.`);
