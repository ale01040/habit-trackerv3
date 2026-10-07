import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { it } from 'vitest';
import type { Backend } from '../../src/data/backend';
import { runBackendContract } from '../../src/data/backend.contract';
import { createSupabaseBackend } from '../../src/data/supabaseBackend';

const env = import.meta.env;
const url = env.VITE_SUPABASE_URL as string | undefined;
const key = env.VITE_SUPABASE_ANON_KEY as string | undefined;
const password = env.VITE_TEST_PASSWORD as string | undefined;
const emails = [env.VITE_TEST_EMAIL_A, env.VITE_TEST_EMAIL_B] as (string | undefined)[];
const configured = Boolean(url && key && password && emails[0] && emails[1]);

async function signedIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password: password! });
  if (signIn.error) {
    const signUp = await client.auth.signUp({ email, password: password! });
    if (signUp.error) throw signUp.error;
    if (!signUp.data.session) throw new Error('Disattiva "Confirm email" nel progetto di test');
  }
  return client;
}

async function reset(client: SupabaseClient) {
  const { error } = await client.from('habits').delete().not('id', 'is', null);
  if (error) throw error;
}

if (!configured) {
  it.skip('contratto Supabase: configura .env.test.local (vedi .env.example)', () => {});
} else {
  let clients: Promise<[SupabaseClient, SupabaseClient]> | null = null;

  runBackendContract('supabase', async () => {
    clients ??= Promise.all([signedIn(emails[0]!), signedIn(emails[1]!)]);
    const [a, b] = await clients;
    await Promise.all([reset(a), reset(b)]);
    const backends = [createSupabaseBackend(a), createSupabaseBackend(b)];
    let current = 0;
    // stesso oggetto per tutto il test, ma l'utente può cambiare
    const backend = new Proxy({} as Backend, {
      get: (_target, prop) => backends[current][prop as keyof Backend],
    });
    return {
      backend,
      today: new Date().toISOString().slice(0, 10),
      async switchToOtherUser() {
        current = 1;
      },
    };
  });
}
