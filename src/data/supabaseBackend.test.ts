import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createSupabaseBackend, toBackendError, toHabit } from './supabaseBackend';

describe('toBackendError', () => {
  it.each([
    ['HT001', 'outside_window'],
    ['HT002', 'not_scheduled'],
    ['HT003', 'invalid_input'],
    ['HT004', 'invalid_state'],
    ['HT404', 'not_found'],
    ['23505', 'duplicate_name'],
    ['23514', 'invalid_input'],
    ['42501', 'not_authenticated'],
    ['invalid_credentials', 'auth_invalid'],
    ['user_already_exists', 'auth_exists'],
    ['weak_password', 'auth_weak_password'],
    ['email_address_invalid', 'auth_invalid_email'],
  ])('%s → %s', (code, expected) => {
    expect(toBackendError({ code, message: 'x' }).code).toBe(expected);
  });

  it('Safari offline ("Load failed") è un errore di rete', () => {
    expect(toBackendError({ message: 'TypeError: Load failed', code: '' }).code).toBe('network');
  });

  it('invio email non disponibile (SMTP predefinito o limite)', () => {
    expect(toBackendError({ code: 'over_email_send_rate_limit' }).code).toBe('email_unavailable');
    expect(toBackendError({ code: 'email_address_not_authorized' }).code).toBe('email_unavailable');
  });

  it('link di reset senza sessione → non autenticato', () => {
    expect(toBackendError({ name: 'AuthSessionMissingError', message: 'x' }).code).toBe(
      'not_authenticated',
    );
  });

  it('email non confermata → messaggio chiaro', () => {
    expect(toBackendError({ code: 'email_not_confirmed' })).toMatchObject({
      code: 'auth_invalid',
      message: expect.stringMatching(/conferma/i),
    });
  });

  it('errori di rete e sconosciuti', () => {
    expect(toBackendError({ message: 'TypeError: Failed to fetch' }).code).toBe('network');
    expect(toBackendError({ name: 'AuthRetryableFetchError', message: '' }).code).toBe('network');
    expect(toBackendError({ code: 'boh', message: 'boh' }).code).toBe('unknown');
    expect(toBackendError(null).code).toBe('unknown');
  });

  it('HT003 conserva il messaggio italiano del database', () => {
    expect(toBackendError({ code: 'HT003', message: 'Scegli almeno un giorno' }).message).toBe(
      'Scegli almeno un giorno',
    );
  });
});

describe('toHabit', () => {
  it('converte la riga e ordina i periodi', () => {
    expect(
      toHabit({
        id: 'h',
        name: 'Gym',
        description: null,
        icon: 'dumbbell',
        position: 2,
        habit_periods: [
          { weekdays: [1], valid_from: '2026-10-07', valid_to: null },
          { weekdays: [1, 2], valid_from: '2026-09-01', valid_to: '2026-10-06' },
        ],
      }),
    ).toEqual({
      id: 'h',
      name: 'Gym',
      description: null,
      icon: 'dumbbell',
      position: 2,
      periods: [
        { validFrom: '2026-09-01', validTo: '2026-10-06', weekdays: [1, 2] },
        { validFrom: '2026-10-07', validTo: null, weekdays: [1] },
      ],
    });
  });
});

/** Client finto: solo quanto serve a listCheckins e signUp. */
function fakeClient(rows: number, signUpSession = true) {
  const all = Array.from({ length: rows }, (_, i) => ({ habit_id: 'h', date: `d${i}` }));
  const query = {
    select: () => query,
    order: () => query,
    range: (from: number, to: number) =>
      Promise.resolve({ data: all.slice(from, to + 1), error: null }),
  };
  return {
    from: () => query,
    auth: {
      signUp: () =>
        Promise.resolve({
          data: {
            user: { id: 'u', email: 'a@b.it' },
            session: signUpSession ? { user: { id: 'u', email: 'a@b.it' } } : null,
          },
          error: null,
        }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  } as unknown as SupabaseClient;
}

describe('createSupabaseBackend', () => {
  it('logout solo su questo dispositivo', async () => {
    let scope: unknown;
    const client = {
      auth: {
        signOut: (opts?: { scope?: string }) => {
          scope = opts?.scope;
          return Promise.resolve({ error: null });
        },
      },
    } as unknown as SupabaseClient;
    await createSupabaseBackend(client).signOut();
    expect(scope).toBe('local');
  });

  it('pagina le spunte oltre le 1000 righe', async () => {
    const rows = await createSupabaseBackend(fakeClient(2500)).listCheckins();
    expect(rows).toHaveLength(2500);
    expect(rows[2499]).toEqual({ habitId: 'h', date: 'd2499' });
  });

  it('registrazione con conferma email attiva → messaggio chiaro', async () => {
    const backend = createSupabaseBackend(fakeClient(0, false));
    await expect(backend.signUp('a@b.it', 'password1')).rejects.toMatchObject({
      code: 'invalid_state',
      message: expect.stringMatching(/conferma/i),
    });
  });

  it('password corta rifiutata prima della rete', async () => {
    await expect(
      createSupabaseBackend(fakeClient(0)).signUp('a@b.it', 'corta'),
    ).rejects.toMatchObject({ code: 'auth_weak_password' });
  });
});
