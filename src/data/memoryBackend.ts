import { addDays, diffDays, todayStr } from '../domain/dates';
import { isScheduled } from '../domain/schedule';
import type { DateStr, Habit, HabitPeriod, Weekday } from '../domain/types';
import {
  NAME_ERROR_MESSAGES,
  normalizeWeekdays,
  validateDescription,
  validateHabitName,
} from '../domain/validation';
import { PASSWORD_MIN, type Backend, type HabitPatch, type NewHabit, type User } from './backend';
import { BackendError } from './errors';
import { newId } from './ids';

export const MEMORY_STORAGE_KEY = 'habit-tracker:memory:v1';

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface StoredUser {
  id: string;
  email: string;
  password: string;
}

interface StoredPeriod {
  validFrom: DateStr;
  validTo: DateStr | null;
  weekdays: Weekday[];
}

interface StoredHabit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string;
  position: number;
  periods: StoredPeriod[];
}

interface StoredCheckin {
  habitId: string;
  userId: string;
  date: DateStr;
}

interface State {
  users: StoredUser[];
  sessionUserId: string | null;
  habits: StoredHabit[];
  checkins: StoredCheckin[];
}

export type MemoryState = State;

/** Solo per test e demo: scrive uno stato completo nello storage. */
export function writeMemoryState(storage: KeyValueStorage, state: MemoryState) {
  storage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(state));
}

export interface MemoryBackendOptions {
  storage?: KeyValueStorage;
  now?: () => Date;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

const emptyState = (): State => ({ users: [], sessionUserId: null, habits: [], checkins: [] });

export function createMemoryBackend(options: MemoryBackendOptions = {}): Backend {
  const storage = options.storage ?? createMemoryStorage();
  const now = options.now ?? (() => new Date());
  const listeners = new Set<(user: User | null) => void>();
  let fallback: State | null = null; // usato se lo storage non funziona

  function load(): State {
    try {
      const raw = storage.getItem(MEMORY_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as State;
      return fallback ?? emptyState();
    } catch {
      return fallback ?? emptyState();
    }
  }

  function save(state: State) {
    fallback = state;
    try {
      storage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage pieno o bloccato: resta il fallback in memoria
    }
  }

  function mutate<T>(fn: (state: State) => T): T {
    const state = load();
    const result = fn(state);
    save(state);
    return result;
  }

  const emit = (user: User | null) => listeners.forEach((l) => l(user));
  const publicUser = (u: StoredUser): User => ({ id: u.id, email: u.email });
  const serverToday = () => todayStr(now());

  function normalizeEmail(email: string): string {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) throw new BackendError('auth_invalid_email');
    return value;
  }

  function checkPassword(password: string) {
    if (password.length < PASSWORD_MIN) throw new BackendError('auth_weak_password');
  }

  function requireUser(state: State): StoredUser {
    const user = state.users.find((u) => u.id === state.sessionUserId);
    if (!user) throw new BackendError('not_authenticated');
    return user;
  }

  function ownedHabit(state: State, userId: string, id: string): StoredHabit {
    const habit = state.habits.find((h) => h.id === id && h.userId === userId);
    if (!habit) throw new BackendError('not_found');
    return habit;
  }

  function checkToday(today: DateStr) {
    if (Math.abs(diffDays(today, serverToday())) > 1) {
      throw new BackendError('invalid_input', 'Data di oggi non valida');
    }
  }

  function weekdaysOrThrow(days: readonly number[]): Weekday[] {
    const weekdays = normalizeWeekdays(days);
    if (!weekdays) throw new BackendError('invalid_input', 'Scegli almeno un giorno');
    return weekdays;
  }

  function nameOrThrow(state: State, userId: string, raw: string, selfId?: string): string {
    const own = state.habits.filter((h) => h.userId === userId);
    const result = validateHabitName(raw, own, selfId);
    if (result.ok) return result.value;
    if (result.error === 'duplicate') throw new BackendError('duplicate_name');
    throw new BackendError('invalid_input', NAME_ERROR_MESSAGES[result.error]);
  }

  function descriptionOrThrow(raw: string | null): string | null {
    const result = validateDescription(raw ?? '');
    if (!result.ok) throw new BackendError('invalid_input', 'Descrizione troppo lunga');
    return result.value;
  }

  function checkWindow(date: DateStr) {
    const diff = diffDays(date, serverToday());
    if (diff > 1 || diff < -8) throw new BackendError('outside_window');
  }

  const openPeriod = (h: StoredHabit) => h.periods.find((p) => p.validTo === null);
  const sameWeekdays = (a: readonly Weekday[], b: readonly Weekday[]) =>
    a.length === b.length && a.every((d, i) => d === b[i]);

  const toHabit = (h: StoredHabit): Habit => ({
    id: h.id,
    name: h.name,
    description: h.description,
    icon: h.icon,
    position: h.position,
    periods: h.periods.map((p): HabitPeriod => ({ ...p, weekdays: [...p.weekdays] })),
  });

  return {
    kind: 'memory',

    async getUser() {
      const state = load();
      const user = state.users.find((u) => u.id === state.sessionUserId);
      return user ? publicUser(user) : null;
    },

    onAuthChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    async signUp(email, password) {
      const normalized = normalizeEmail(email);
      checkPassword(password);
      const user = mutate((state) => {
        if (state.users.some((u) => u.email === normalized)) throw new BackendError('auth_exists');
        const stored = { id: newId(), email: normalized, password };
        state.users.push(stored);
        state.sessionUserId = stored.id;
        return publicUser(stored);
      });
      emit(user);
      return user;
    },

    async signIn(email, password) {
      const normalized = email.trim().toLowerCase();
      const user = mutate((state) => {
        const stored = state.users.find((u) => u.email === normalized && u.password === password);
        if (!stored) throw new BackendError('auth_invalid');
        state.sessionUserId = stored.id;
        return publicUser(stored);
      });
      emit(user);
      return user;
    },

    async signOut() {
      mutate((state) => {
        state.sessionUserId = null;
      });
      emit(null);
    },

    async requestPasswordReset(email) {
      normalizeEmail(email);
    },

    async updatePassword(password) {
      checkPassword(password);
      mutate((state) => {
        requireUser(state).password = password;
      });
    },

    async listHabits() {
      const state = load();
      const user = requireUser(state);
      return state.habits
        .filter((h) => h.userId === user.id)
        .sort((a, b) => a.position - b.position)
        .map(toHabit);
    },

    async listCheckins() {
      const state = load();
      const user = requireUser(state);
      return state.checkins
        .filter((c) => c.userId === user.id)
        .map((c) => ({ habitId: c.habitId, date: c.date }));
    },

    async createHabit(input: NewHabit, today) {
      return mutate((state) => {
        const user = requireUser(state);
        checkToday(today);
        const name = nameOrThrow(state, user.id, input.name);
        const description = descriptionOrThrow(input.description);
        const weekdays = weekdaysOrThrow(input.weekdays);
        const own = state.habits.filter((h) => h.userId === user.id);
        const position = own.reduce((max, h) => Math.max(max, h.position), -1) + 1;
        const id = newId();
        state.habits.push({
          id,
          userId: user.id,
          name,
          description,
          icon: input.icon || 'sparkles',
          position,
          periods: [{ validFrom: today, validTo: null, weekdays }],
        });
        return id;
      });
    },

    async updateHabit(id, patch: HabitPatch) {
      mutate((state) => {
        const user = requireUser(state);
        const habit = ownedHabit(state, user.id, id);
        if (patch.name !== undefined) habit.name = nameOrThrow(state, user.id, patch.name, id);
        if (patch.description !== undefined) {
          habit.description = descriptionOrThrow(patch.description);
        }
        if (patch.icon !== undefined) habit.icon = patch.icon || 'sparkles';
      });
    },

    async updateSchedule(id, days, today) {
      mutate((state) => {
        const user = requireUser(state);
        checkToday(today);
        const habit = ownedHabit(state, user.id, id);
        const weekdays = weekdaysOrThrow(days);
        const open = openPeriod(habit);
        if (!open) throw new BackendError('invalid_state', 'L’abitudine è archiviata');
        if (open.validFrom >= today) {
          open.weekdays = weekdays;
        } else {
          open.validTo = addDays(today, -1);
          habit.periods.push({ validFrom: today, validTo: null, weekdays });
        }
      });
    },

    async archiveHabit(id, today) {
      mutate((state) => {
        const user = requireUser(state);
        checkToday(today);
        const habit = ownedHabit(state, user.id, id);
        const open = openPeriod(habit);
        if (!open) throw new BackendError('invalid_state', 'L’abitudine è già archiviata');
        if (open.validFrom >= today) habit.periods = habit.periods.filter((p) => p !== open);
        else open.validTo = addDays(today, -1);
        state.checkins = state.checkins.filter((c) => !(c.habitId === id && c.date >= today));
      });
    },

    async reactivateHabit(id, days, today) {
      mutate((state) => {
        const user = requireUser(state);
        checkToday(today);
        const habit = ownedHabit(state, user.id, id);
        if (openPeriod(habit)) throw new BackendError('invalid_state', 'L’abitudine è già attiva');
        const weekdays = weekdaysOrThrow(days);
        // torna in fondo alla lista, senza pari merito con le attive
        habit.position =
          state.habits
            .filter((h) => h.userId === user.id && h.id !== id)
            .reduce((max, h) => Math.max(max, h.position), -1) + 1;
        const last = [...habit.periods].sort((a, b) =>
          (b.validTo ?? '').localeCompare(a.validTo ?? ''),
        )[0];
        const lastEnd = last?.validTo ?? null;
        if (last && lastEnd !== null) {
          if (lastEnd >= addDays(today, -1) && sameWeekdays(last.weekdays, weekdays)) {
            last.validTo = null;
            return;
          }
          if (lastEnd >= today) {
            if (last.validFrom >= today) habit.periods = habit.periods.filter((p) => p !== last);
            else last.validTo = addDays(today, -1);
          }
        }
        habit.periods.push({ validFrom: today, validTo: null, weekdays });
      });
    },

    async reorderHabits(ids) {
      mutate((state) => {
        const user = requireUser(state);
        // prima gli id indicati, poi le altre (archiviate) nel loro ordine: niente pari merito
        const own = state.habits
          .filter((h) => h.userId === user.id)
          .sort((a, b) => a.position - b.position);
        const rank = (h: StoredHabit) => {
          const i = ids.indexOf(h.id);
          return i === -1 ? ids.length : i;
        };
        [...own]
          .sort((a, b) => rank(a) - rank(b) || a.position - b.position)
          .forEach((habit, index) => {
            habit.position = index;
          });
      });
    },

    async addCheckin(habitId, date) {
      mutate((state) => {
        const user = requireUser(state);
        const habit = ownedHabit(state, user.id, habitId);
        checkWindow(date);
        if (!isScheduled(toHabit(habit), date)) throw new BackendError('not_scheduled');
        if (state.checkins.some((c) => c.habitId === habitId && c.date === date)) return;
        state.checkins.push({ habitId, userId: user.id, date });
      });
    },

    async removeCheckin(habitId, date) {
      mutate((state) => {
        const user = requireUser(state);
        ownedHabit(state, user.id, habitId);
        checkWindow(date);
        state.checkins = state.checkins.filter((c) => !(c.habitId === habitId && c.date === date));
      });
    },
  };
}
