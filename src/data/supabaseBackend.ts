import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import type { Habit, Weekday } from '../domain/types';
import { normalizeName } from '../domain/validation';
import { PASSWORD_MIN, type Backend, type CheckinRow, type User } from './backend';
import { BackendError } from './errors';

const PAGE = 1000;

interface ErrorLike {
  code?: string;
  message?: string;
  name?: string;
}

export function toBackendError(error: ErrorLike | null | undefined): BackendError {
  if (!error) return new BackendError('unknown');
  switch (error.code) {
    case 'HT001':
      return new BackendError('outside_window');
    case 'HT002':
      return new BackendError('not_scheduled');
    case 'HT003':
      return new BackendError('invalid_input', error.message || undefined);
    case 'HT004':
      return new BackendError('invalid_state');
    case 'HT404':
      return new BackendError('not_found');
    case '23505':
      return new BackendError('duplicate_name');
    case '23514':
    case '22P02':
      return new BackendError('invalid_input');
    case '42501':
    case 'PGRST301':
      return new BackendError('not_authenticated');
    case 'invalid_credentials':
      return new BackendError('auth_invalid');
    case 'user_already_exists':
    case 'email_exists':
      return new BackendError('auth_exists');
    case 'weak_password':
      return new BackendError('auth_weak_password');
    case 'email_address_invalid':
    case 'validation_failed':
      return new BackendError('auth_invalid_email');
    case 'email_not_confirmed':
      return new BackendError('auth_invalid', 'Conferma la tua email prima di accedere');
    case 'over_email_send_rate_limit':
    case 'email_address_not_authorized':
      return new BackendError('email_unavailable');
  }
  if (error.name === 'AuthSessionMissingError') return new BackendError('not_authenticated');
  // Chrome: "Failed to fetch"; Safari: "Load failed"; Firefox: "NetworkError…"
  if (
    error.name === 'AuthRetryableFetchError' ||
    /fetch|network|load failed/i.test(error.message ?? '')
  ) {
    return new BackendError('network');
  }
  return new BackendError('unknown');
}

interface HabitRow {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  position: number;
  habit_periods: { weekdays: number[]; valid_from: string; valid_to: string | null }[];
}

export function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    position: row.position,
    periods: [...row.habit_periods]
      .sort((a, b) => a.valid_from.localeCompare(b.valid_from))
      .map((p) => ({
        validFrom: p.valid_from,
        validTo: p.valid_to,
        weekdays: p.weekdays as Weekday[],
      })),
  };
}

const toUser = (u: SupabaseUser | null | undefined): User | null =>
  u ? { id: u.id, email: u.email ?? '' } : null;

/** Forma delle risposte Supabase: dati senza errore, oppure errore. */
type Result<T> = { data: T; error: null } | { data: unknown; error: ErrorLike };

export function createSupabaseBackend(
  client: SupabaseClient,
  options: { redirectTo?: string } = {},
): Backend {
  /** Esegue una chiamata Supabase e converte ogni errore in BackendError. */
  async function call<T>(request: PromiseLike<Result<T>>): Promise<T> {
    let result: Result<T>;
    try {
      result = await request;
    } catch (e) {
      throw e instanceof BackendError ? e : toBackendError(e as ErrorLike);
    }
    if (result.error) throw toBackendError(result.error);
    return result.data;
  }

  const rpc = (fn: string, args: Record<string, unknown>) => call(client.rpc(fn, args));

  return {
    kind: 'supabase',

    async getUser() {
      const { data } = await client.auth.getSession();
      return toUser(data.session?.user);
    },

    onAuthChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        listener(toUser(session?.user)),
      );
      return () => data.subscription.unsubscribe();
    },

    async signUp(email, password) {
      if (password.length < PASSWORD_MIN) throw new BackendError('auth_weak_password');
      const data = await call(client.auth.signUp({ email: email.trim(), password }));
      if (!data.session) {
        throw new BackendError(
          'invalid_state',
          'Controlla la tua email per confermare l’account, poi accedi',
        );
      }
      return toUser(data.user)!;
    },

    async signIn(email, password) {
      const data = await call(client.auth.signInWithPassword({ email: email.trim(), password }));
      return toUser(data.user)!;
    },

    async signOut() {
      // solo questo dispositivo: gli altri restano connessi
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw toBackendError(error);
    },

    async requestPasswordReset(email) {
      await call(
        client.auth.resetPasswordForEmail(email.trim(), { redirectTo: options.redirectTo }),
      );
    },

    async updatePassword(password) {
      if (password.length < PASSWORD_MIN) throw new BackendError('auth_weak_password');
      await call(client.auth.updateUser({ password }));
    },

    async listHabits() {
      const rows = await call(
        client
          .from('habits')
          .select(
            'id, name, description, icon, position, habit_periods(weekdays, valid_from, valid_to)',
          )
          .order('position')
          .order('id'),
      );
      return (rows as HabitRow[]).map(toHabit);
    },

    async listCheckins() {
      const rows: CheckinRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const page = await call(
          client
            .from('checkins')
            .select('habit_id, date')
            .order('date')
            .order('habit_id')
            .range(from, from + PAGE - 1),
        );
        const list = page as { habit_id: string; date: string }[];
        rows.push(...list.map((r) => ({ habitId: r.habit_id, date: r.date })));
        if (list.length < PAGE) return rows;
      }
    },

    async createHabit(input, today) {
      const id = await rpc('create_habit', {
        p_name: normalizeName(input.name),
        p_description: input.description,
        p_icon: input.icon,
        p_weekdays: [...input.weekdays],
        p_today: today,
      });
      return id as string;
    },

    async updateHabit(id, patch) {
      const values: Record<string, unknown> = {};
      if (patch.name !== undefined) values.name = normalizeName(patch.name);
      if (patch.description !== undefined) values.description = patch.description?.trim() || null;
      if (patch.icon !== undefined) values.icon = patch.icon || 'sparkles';
      const rows = await call(client.from('habits').update(values).eq('id', id).select('id'));
      if ((rows as unknown[]).length === 0) throw new BackendError('not_found');
    },

    async updateSchedule(id, weekdays, today) {
      await rpc('update_habit_schedule', {
        p_habit_id: id,
        p_weekdays: [...weekdays],
        p_today: today,
      });
    },

    async archiveHabit(id, today) {
      await rpc('archive_habit', { p_habit_id: id, p_today: today });
    },

    async reactivateHabit(id, weekdays, today) {
      await rpc('reactivate_habit', {
        p_habit_id: id,
        p_weekdays: [...weekdays],
        p_today: today,
      });
    },

    async reorderHabits(ids) {
      await rpc('reorder_habits', { p_ids: [...ids] });
    },

    async addCheckin(habitId, date) {
      await rpc('add_checkin', { p_habit_id: habitId, p_date: date });
    },

    async removeCheckin(habitId, date) {
      await rpc('remove_checkin', { p_habit_id: habitId, p_date: date });
    },
  };
}
