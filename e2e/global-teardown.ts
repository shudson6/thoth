import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local" });

export default async function globalTeardown() {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) return;

  const parsed = new URL(url);
  const dbName = parsed.pathname.slice(1);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminUrl.toString() });
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await admin.end();
}
