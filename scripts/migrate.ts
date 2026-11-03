import { config } from 'dotenv';
import postgres from 'postgres';
import { readFile, readdir } from 'node:fs/promises';
config({ path: '.env.local' });
config();
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env.local');
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
try {
  await sql`create table if not exists opensync_migrations(name text primary key,applied_at timestamptz default now())`;
  for (const file of (await readdir('migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(482781)`;
      const exists = await tx`select name from opensync_migrations where name=${file}`;
      if (exists.length) return;
      await tx.unsafe(await readFile(`migrations/${file}`, 'utf8'));
      await tx`insert into opensync_migrations(name) values(${file})`;
      console.log(`Applied ${file}`);
    });
  }
} finally {
  await sql.end();
}
