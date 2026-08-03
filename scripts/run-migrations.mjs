import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connStr = process.env.POSTGRES_URL;
if (!connStr) {
  process.stderr.write("POSTGRES_URL env var required\n");
  process.exit(1);
}
const migrationsDir = join(__dirname, "..", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new pg.Client(connStr);
await client.connect();
try {
  for (const migrationFile of migrationFiles) {
    process.stdout.write(`Applying ${migrationFile}\n`);
    const sql = readFileSync(join(migrationsDir, migrationFile), "utf8");
    await client.query(sql);
  }
  process.stdout.write(`MIGRATIONS OK (${migrationFiles.length} files)\n`);
} finally {
  await client.end();
}
