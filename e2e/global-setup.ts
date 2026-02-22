import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set in .env.local");

  const pool = new Pool({ connectionString: url });
  // Wipe all data; CASCADE handles FK order automatically
  await pool.query("TRUNCATE TABLE tasks, groups, settings CASCADE");
  await pool.end();
}
