// One-time setup: applies supabase/migrations/*.sql in order against the
// real project via a direct Postgres connection. Password comes from
// PGPASSWORD env var — never hardcode it here.
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Client } from "pg";

async function main() {
  const password = process.env.PGPASSWORD;
  if (!password) {
    console.error("Set PGPASSWORD env var first.");
    process.exit(1);
  }

  const host = process.env.PGHOST ?? "db.fwkctirsillacxgorlar.supabase.co";
  const client = new Client({
    host,
    port: 5432,
    user: "postgres",
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log(`Connected to ${host}`);

  const dir = join(process.cwd(), "supabase", "migrations");
  const only = process.argv[2]; // optional: apply just one file by name
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !only || f === only)
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf-8");
    process.stdout.write(`Applying ${file}... `);
    try {
      await client.query(sql);
      console.log("OK");
    } catch (e) {
      console.log("FAILED");
      console.error(e);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("All migrations applied.");
}

main();
