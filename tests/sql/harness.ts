import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { addDays } from '../../src/domain/dates';

const MIGRATIONS = fileURLToPath(new URL('../../supabase/migrations', import.meta.url));

/** Simula l'ambiente Supabase: ruoli, schema auth e auth.uid(). */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;

export const A = '11111111-1111-4111-8111-111111111111';
export const B = '22222222-2222-4222-8222-222222222222';

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.it'), ('${B}', 'b@x.it')`);
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  return db;
}

export async function as(db: PGlite, userId: string | null) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec(`set role ${userId ? 'authenticated' : 'anon'}`);
}

export async function today(db: PGlite): Promise<string> {
  const { rows } = await db.query<{ d: string }>('select current_date::text as d');
  return rows[0].d;
}

export const shift = addDays;

export async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}
