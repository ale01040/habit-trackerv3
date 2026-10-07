import { describe, expect, it } from 'vitest';
import { resolveBackendKind } from './createBackend';

const supabase = { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' };

describe('resolveBackendKind', () => {
  it('Supabase quando configurato', () => {
    expect(resolveBackendKind({ ...supabase, PROD: true })).toBe('supabase');
  });
  it('memoria se richiesta esplicitamente, anche in produzione', () => {
    expect(resolveBackendKind({ ...supabase, PROD: true, VITE_BACKEND: 'memory' })).toBe('memory');
  });
  it('in sviluppo senza configurazione → memoria', () => {
    expect(resolveBackendKind({ PROD: false })).toBe('memory');
  });
  it('in produzione senza configurazione → mancante (niente demo silenziosa)', () => {
    expect(resolveBackendKind({ PROD: true })).toBe('missing');
    expect(resolveBackendKind({ PROD: true, VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBe(
      'missing',
    );
  });
});
