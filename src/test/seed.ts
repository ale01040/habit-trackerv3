import type { Backend } from '../data/backend';
import { createMemoryBackend, createMemoryStorage, writeMemoryState } from '../data/memoryBackend';
import { ALL_WEEKDAYS, type DateStr, type Weekday } from '../domain/types';
import { TEST_NOW } from './render';

export interface SeedHabit {
  id?: string;
  name: string;
  description?: string | null;
  icon?: string;
  /** [validFrom, validTo, weekdays]; default: dal 2026-09-01, aperto, tutti i giorni */
  periods?: Array<[DateStr, DateStr | null, Weekday[]?]>;
}

export function seedBackend({
  habits = [],
  checkins = [],
}: { habits?: SeedHabit[]; checkins?: Array<[string, DateStr]> } = {}): Backend {
  const storage = createMemoryStorage();
  const userId = 'u1';
  writeMemoryState(storage, {
    users: [{ id: userId, email: 'ada@example.com', password: 'password1' }],
    sessionUserId: userId,
    habits: habits.map((h, i) => ({
      id: h.id ?? `h${i + 1}`,
      userId,
      name: h.name,
      description: h.description ?? null,
      icon: h.icon ?? 'droplet',
      position: i,
      periods: (h.periods ?? [['2026-09-01', null]]).map(([validFrom, validTo, weekdays]) => ({
        validFrom,
        validTo,
        weekdays: weekdays ?? [...ALL_WEEKDAYS],
      })),
    })),
    checkins: checkins.map(([habitId, date]) => ({ habitId, userId, date })),
  });
  return createMemoryBackend({ storage, now: TEST_NOW });
}
