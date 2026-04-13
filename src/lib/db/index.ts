import { type Client, createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

let _client: Client | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _schemaReady = false;

export function isDbConfigured(): boolean {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

function ensureClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL y TURSO_AUTH_TOKEN deben estar definidos");
  }
  _client = createClient({ url, authToken });
  return _client;
}

export function getRawClient(): Client {
  return ensureClient();
}

export function getDb() {
  if (_db) return _db;
  const client = ensureClient();
  _db = drizzle(client, { schema });
  return _db;
}

/** Creates the app_snapshot table if it doesn't exist yet. Safe to call multiple times. */
export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const client = ensureClient();
  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_snapshot (
      user_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  _schemaReady = true;
}
