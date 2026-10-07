// Applica in ordine le migrazioni non ancora eseguite.
// Uso: node --env-file=.env.local scripts/migrate.mjs
import { readdir, readFile } from 'node:fs/promises';
import postgres from 'postgres';

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('SUPABASE_DB_URL mancante: aggiungilo al file .env (vedi .env.example)');
  process.exit(1);
}

const sql = postgres(url, { max: 1, ssl: 'require', onnotice: () => {} });
const dir = new URL('../supabase/migrations/', import.meta.url);

try {
  await sql`create schema if not exists private`;
  await sql`create table if not exists private.migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`;
  const applied = new Set((await sql`select name from private.migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(new URL(file, dir), 'utf8');
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into private.migrations (name) values (${file})`;
    });
    console.log(`✔ ${file}`);
  }
  console.log('Database aggiornato.');
} finally {
  await sql.end();
}
