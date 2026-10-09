import { Pool } from "pg"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

export const pool =
  globalThis.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    // 2 secondes ne suffisent pas : la base se met en veille et son réveil
    // prend parfois plusieurs secondes. Le symptôme était « Connection
    // terminated due to connection timeout » sur une page qui fonctionne le
    // reste du temps — donc une panne intermittente, la pire à diagnostiquer.
    connectionTimeoutMillis: 15000,
  })

if (process.env.NODE_ENV !== "production") {
  globalThis.pgPool = pool
}
