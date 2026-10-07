import { addMonths } from 'date-fns';
import {
  addDays,
  clampToToday,
  eachDay,
  monthRange,
  parseDateStr,
  toDateStr,
  weekRange,
} from './dates';
import { isScheduled } from './schedule';
import { isDone, type Checkins, type DateRange, type DateStr, type Habit } from './types';

export interface Completion {
  done: number;
  scheduled: number;
  /** null quando non c'è nulla di previsto. */
  ratio: number | null;
}

export function completion(
  habits: readonly Habit[],
  checkins: Checkins,
  days: readonly DateStr[],
): Completion {
  let done = 0;
  let scheduled = 0;
  for (const day of days) {
    for (const habit of habits) {
      if (!isScheduled(habit, day)) continue;
      scheduled++;
      if (isDone(checkins, habit.id, day)) done++;
    }
  }
  return { done, scheduled, ratio: scheduled === 0 ? null : done / scheduled };
}

export function dayCompletion(
  habits: readonly Habit[],
  checkins: Checkins,
  date: DateStr,
): Completion {
  return completion(habits, checkins, [date]);
}

export function rangeCompletion(
  habits: readonly Habit[],
  checkins: Checkins,
  range: DateRange,
  today: DateStr,
): Completion {
  const clamped = clampToToday(range, today);
  return completion(habits, checkins, clamped ? eachDay(clamped) : []);
}

export function weekCompletion(
  habits: readonly Habit[],
  checkins: Checkins,
  date: DateStr,
  today: DateStr,
): Completion {
  return rangeCompletion(habits, checkins, weekRange(date), today);
}

export function monthCompletion(
  habits: readonly Habit[],
  checkins: Checkins,
  date: DateStr,
  today: DateStr,
): Completion {
  return rangeCompletion(habits, checkins, monthRange(date), today);
}

export type PercentBand = 'high' | 'mid' | 'low';

export function percentBand(ratio: number | null): PercentBand | null {
  if (ratio === null) return null;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'mid';
  return 'low';
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`;
}

export type PeriodKind = 'day' | 'week' | 'month';

export function periodRange(kind: PeriodKind, date: DateStr): DateRange {
  if (kind === 'day') return { start: date, end: date };
  return kind === 'week' ? weekRange(date) : monthRange(date);
}

export function shiftPeriod(kind: PeriodKind, date: DateStr, direction: 1 | -1): DateStr {
  if (kind === 'day') return addDays(date, direction);
  if (kind === 'week') return addDays(date, 7 * direction);
  return toDateStr(addMonths(parseDateStr(date), direction));
}

export function hasNextPeriod(kind: PeriodKind, date: DateStr, today: DateStr): boolean {
  return periodRange(kind, date).end < today;
}

export interface DayStat {
  date: DateStr;
  completion: Completion;
  future: boolean;
}

export function dailyStats(
  habits: readonly Habit[],
  checkins: Checkins,
  range: DateRange,
  today: DateStr,
): DayStat[] {
  return eachDay(range).map((date) => {
    const future = date > today;
    return { date, future, completion: completion(habits, checkins, future ? [] : [date]) };
  });
}

export function habitsInRange(habits: readonly Habit[], range: DateRange, today: DateStr): Habit[] {
  const clamped = clampToToday(range, today);
  if (!clamped) return [];
  const days = eachDay(clamped);
  return habits
    .filter((h) => days.some((d) => isScheduled(h, d)))
    .sort((a, b) => a.position - b.position);
}

export type DayState = 'done' | 'missed' | 'off' | 'future';

export function dayState(
  habit: Habit,
  checkins: Checkins,
  date: DateStr,
  today: DateStr,
): DayState {
  if (date > today) return 'future';
  if (!isScheduled(habit, date)) return 'off';
  return isDone(checkins, habit.id, date) ? 'done' : 'missed';
}
