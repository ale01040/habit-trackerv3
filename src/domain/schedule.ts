import { isoWeekday } from './dates';
import { ALL_WEEKDAYS, type DateStr, type Habit, type HabitPeriod, type Weekday } from './types';

export function periodCovers(period: HabitPeriod, date: DateStr): boolean {
  return period.validFrom <= date && (period.validTo === null || period.validTo >= date);
}

export function isScheduled(habit: Habit, date: DateStr): boolean {
  const weekday = isoWeekday(date);
  return habit.periods.some((p) => periodCovers(p, date) && p.weekdays.includes(weekday));
}

export function isActive(habit: Habit): boolean {
  return habit.periods.some((p) => p.validTo === null);
}

const byPosition = (a: Habit, b: Habit) => a.position - b.position;
const byName = (a: Habit, b: Habit) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base' });

export function scheduledHabits(habits: readonly Habit[], date: DateStr): Habit[] {
  return habits.filter((h) => isScheduled(h, date)).sort(byPosition);
}

export function activeHabits(habits: readonly Habit[]): Habit[] {
  return habits.filter(isActive).sort(byPosition);
}

export function pastHabits(habits: readonly Habit[]): Habit[] {
  return habits.filter((h) => !isActive(h)).sort(byName);
}

export function firstScheduledDate(habit: Habit): DateStr | null {
  let first: DateStr | null = null;
  for (const p of habit.periods) if (first === null || p.validFrom < first) first = p.validFrom;
  return first;
}

/** Giorni da proporre nel form: periodo aperto, altrimenti l'ultimo chiuso, altrimenti tutti. */
export function currentWeekdays(habit: Habit): Weekday[] {
  const open = habit.periods.find((p) => p.validTo === null);
  if (open) return [...open.weekdays];
  const last = [...habit.periods].sort((a, b) =>
    (b.validTo ?? '').localeCompare(a.validTo ?? ''),
  )[0];
  return last ? [...last.weekdays] : [...ALL_WEEKDAYS];
}
