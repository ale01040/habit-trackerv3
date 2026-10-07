import { describe, expect, it, vi } from 'vitest';
import { runBackendContract } from './backend.contract';
import { BackendError } from './errors';
import { createMemoryBackend, createMemoryStorage, MEMORY_STORAGE_KEY } from './memoryBackend';

const now = () => new Date(2026, 9, 7, 12, 0);

runBackendContract('memoria', async () => {
  const backend = createMemoryBackend({ now });
  await backend.signUp('a@example.com', 'password1');
  return {
    backend,
    today: '2026-10-07',
    async switchToOtherUser() {
      await backend.signOut();
      await backend.signUp('b@example.com', 'password1');
    },
  };
});

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(BackendError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('memoryBackend: autenticazione', () => {
  it('registrazione → utente loggato e notifica', async () => {
    const b = createMemoryBackend({ now });
    const listener = vi.fn();
    b.onAuthChange(listener);
    const user = await b.signUp(' Ada@Example.com ', 'password1');
    expect(user.email).toBe('ada@example.com');
    expect(await b.getUser()).toEqual(user);
    expect(listener).toHaveBeenCalledWith(user);
  });

  it('email già registrata (maiuscole diverse)', async () => {
    const b = createMemoryBackend({ now });
    await b.signUp('ada@example.com', 'password1');
    await b.signOut();
    await expectCode(b.signUp('ADA@example.com', 'password2'), 'auth_exists');
  });

  it('password corta ed email non valida', async () => {
    const b = createMemoryBackend({ now });
    await expectCode(b.signUp('ada@example.com', 'short'), 'auth_weak_password');
    await expectCode(b.signUp('non-email', 'password1'), 'auth_invalid_email');
  });

  it('logout, login sbagliato e giusto', async () => {
    const b = createMemoryBackend({ now });
    const listener = vi.fn();
    await b.signUp('ada@example.com', 'password1');
    b.onAuthChange(listener);
    await b.signOut();
    expect(await b.getUser()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null);
    await expectCode(b.signIn('ada@example.com', 'sbagliata'), 'auth_invalid');
    await expectCode(b.signIn('nessuno@example.com', 'password1'), 'auth_invalid');
    expect((await b.signIn('ADA@example.com', 'password1')).email).toBe('ada@example.com');
  });

  it('smettere di ascoltare', async () => {
    const b = createMemoryBackend({ now });
    const listener = vi.fn();
    const off = b.onAuthChange(listener);
    off();
    await b.signUp('ada@example.com', 'password1');
    expect(listener).not.toHaveBeenCalled();
  });

  it('cambio password', async () => {
    const b = createMemoryBackend({ now });
    await b.signUp('ada@example.com', 'password1');
    await expectCode(b.updatePassword('corta'), 'auth_weak_password');
    await b.updatePassword('password2');
    await b.signOut();
    await expectCode(b.updatePassword('password3'), 'not_authenticated');
    await b.signIn('ada@example.com', 'password2');
  });

  it('reset password: valida l’email e non rivela se esiste', async () => {
    const b = createMemoryBackend({ now });
    await expect(b.requestPasswordReset('chiunque@example.com')).resolves.toBeUndefined();
    await expectCode(b.requestPasswordReset('non-email'), 'auth_invalid_email');
  });

  it('senza login le operazioni falliscono', async () => {
    const b = createMemoryBackend({ now });
    await expectCode(b.listHabits(), 'not_authenticated');
  });

  it('sessione e dati persistono su una nuova istanza', async () => {
    const storage = createMemoryStorage();
    const first = createMemoryBackend({ storage, now });
    await first.signUp('ada@example.com', 'password1');
    await first.createHabit(
      { name: 'Drink water', description: null, icon: 'droplet', weekdays: [1, 2, 3, 4, 5, 6, 7] },
      '2026-10-07',
    );
    const second = createMemoryBackend({ storage, now });
    expect((await second.getUser())?.email).toBe('ada@example.com');
    expect((await second.listHabits()).map((h) => h.name)).toEqual(['Drink water']);
  });

  it('storage corrotto → si riparte da zero', async () => {
    const storage = createMemoryStorage();
    storage.setItem(MEMORY_STORAGE_KEY, '{non json');
    const b = createMemoryBackend({ storage, now });
    expect(await b.getUser()).toBeNull();
  });

  it('storage che lancia eccezioni (navigazione privata) → funziona in memoria', async () => {
    const broken = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const b = createMemoryBackend({ storage: broken, now });
    await b.signUp('ada@example.com', 'password1');
    expect((await b.getUser())?.email).toBe('ada@example.com');
  });
});
