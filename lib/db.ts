import pg from "pg";

// Return raw date/time strings from pg instead of converting to JS Date objects.
// Type OID 1082 = date, 1083 = time, 1114 = timestamp.
pg.types.setTypeParser(1082, (val) => val); // date → "2026-02-17"
pg.types.setTypeParser(1083, (val) => val); // time → "09:00:00"
pg.types.setTypeParser(1114, (val) => val); // timestamp

const globalForPg = globalThis as unknown as { pool: pg.Pool | undefined };

export const pool =
  globalForPg.pool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pool = pool;
}
