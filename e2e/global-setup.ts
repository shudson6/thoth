import { config } from "dotenv";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: ".env.local" });

export default async function globalSetup() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set in .env.local");

  const parsed = new URL(url);
  const dbName = parsed.pathname.slice(1); // strip leading "/"

  // Connect to postgres (neutral DB) to drop and recreate the test database
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminUrl.toString() });
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  // Apply the schema to the fresh database
  const schema = readFileSync(resolve(process.cwd(), "db/schema.sql"), "utf-8");
  const pool = new Pool({ connectionString: url });
  await pool.query(schema);
  await pool.end();
}
