import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
const globalDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('Database setup required');
  const sql = (globalDb.sql ??= postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  }));
  return drizzle(sql, { schema });
}
