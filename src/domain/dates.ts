import {
  addDays as addDaysFns,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  getISODay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { DateRange, DateStr, Weekday } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const EDIT_WINDOW_DAYS = 7;

export function toDateStr(date: Date): DateStr {
  return format(date, 'yyyy-MM-dd');
}

export function parseDateStr(value: DateStr): Date {
  if (!DATE_RE.test(value)) throw new Error(`Data non valida: ${value}`);
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (toDateStr(date) !== value) throw new Error(`Data non valida: ${value}`);
  return date;
}

export function todayStr(now: Date = new Date()): DateStr {
  return toDateStr(now);
}

export function addDays(value: DateStr, amount: number): DateStr {
  return toDateStr(addDaysFns(parseDateStr(value), amount));
}

export function diffDays(later: DateStr, earlier: DateStr): number {
  return differenceInCalendarDays(parseDateStr(later), parseDateStr(earlier));
}

export function isoWeekday(value: DateStr): Weekday {
  return getISODay(parseDateStr(value)) as Weekday;
}

export function weekRange(value: DateStr): DateRange {
  const date = parseDateStr(value);
  return {
    start: toDateStr(startOfWeek(date, { weekStartsOn: 1 })),
    end: toDateStr(endOfWeek(date, { weekStartsOn: 1 })),
  };
}

export function monthRange(value: DateStr): DateRange {
  const date = parseDateStr(value);
  return { start: toDateStr(startOfMonth(date)), end: toDateStr(endOfMonth(date)) };
}

export function eachDay(range: DateRange): DateStr[] {
  const days: DateStr[] = [];
  for (let day = range.start; day <= range.end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Taglia un periodo a oggi; null se è tutto nel futuro. */
export function clampToToday(range: DateRange, today: DateStr): DateRange | null {
  if (range.start > today) return null;
  return { start: range.start, end: range.end < today ? range.end : today };
}

export function isEditable(date: DateStr, today: DateStr): boolean {
  return date <= today && diffDays(today, date) <= EDIT_WINDOW_DAYS;
}
