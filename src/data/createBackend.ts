import { createClient } from '@supabase/supabase-js';
import type { Backend } from './backend';
import { createMemoryBackend } from './memoryBackend';
import { createSupabaseBackend } from './supabaseBackend';

interface BackendEnv {
  PROD?: boolean;
  VITE_BACKEND?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

/**
 * Supabase se configurato; memoria in sviluppo o se richiesta esplicitamente.
 * In produzione una configurazione mancante non diventa una demo silenziosa.
 */
export function resolveBackendKind(env: BackendEnv): 'supabase' | 'memory' | 'missing' {
  if (env.VITE_BACKEND === 'memory') return 'memory';
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) return 'supabase';
  return env.PROD ? 'missing' : 'memory';
}

/** null quando in produzione manca la configurazione di Supabase. */
export function createBackend(env: BackendEnv = import.meta.env): Backend | null {
  const kind = resolveBackendKind(env);
  if (kind === 'missing') return null;
  if (kind === 'supabase') {
    return createSupabaseBackend(
      createClient(env.VITE_SUPABASE_URL!, env.VITE_SUPABASE_ANON_KEY!),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );
  }
  return createMemoryBackend({ storage: window.localStorage });
}
