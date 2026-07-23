import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connStr = process.env.SUPABASE_URL;
if (!connStr) {
  console.error("SUPABASE_URL env var required");
  process.exit(1);
}
const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", "001_init.sql"), "utf8");

const client = new pg.Client(connStr);
await client.connect();
try {
  await client.query(sql);
  const res1 = await client.query("SELECT count(*) AS n FROM repos");
  const res2 = await client.query("SELECT count(*) AS n FROM star_snapshots");
  const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='repos' ORDER BY ordinal_position");
  console.log("MIGRATION OK");
  console.log("repos rows:", res1.rows[0].n, "| star_snapshots rows:", res2.rows[0].n);
  console.log("repos columns:", cols.rows.map((r) => r.column_name).join(", "));
} finally {
  await client.end();
}
