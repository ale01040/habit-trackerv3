import {
  ALL_WEEKDAYS,
  checkinKey,
  type DateStr,
  type Habit,
  type HabitPeriod,
  type Weekday,
} from './types';

export function makePeriod(
  validFrom: DateStr,
  validTo: DateStr | null = null,
  weekdays: readonly Weekday[] = ALL_WEEKDAYS,
): HabitPeriod {
  return { validFrom, validTo, weekdays };
}

export function makeHabit(partial: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Drink water',
    description: null,
    icon: 'droplet',
    position: 0,
    periods: [makePeriod('2026-01-01')],
    ...partial,
  };
}

export function checkinsOf(habitId: string, dates: readonly DateStr[]): Set<string> {
  return new Set(dates.map((d) => checkinKey(habitId, d)));
}
