/** Data locale nel formato YYYY-MM-DD. */
export type DateStr = string;

/** Giorno ISO: 1 = lunedì … 7 = domenica. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const ALL_WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export interface HabitPeriod {
  validFrom: DateStr;
  validTo: DateStr | null;
  weekdays: readonly Weekday[];
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  position: number;
  periods: readonly HabitPeriod[];
}

/** Insieme delle spunte, chiave `habitId|date`. */
export type Checkins = ReadonlySet<string>;

export interface DateRange {
  start: DateStr;
  end: DateStr;
}

export function checkinKey(habitId: string, date: DateStr): string {
  return `${habitId}|${date}`;
}

export function isDone(checkins: Checkins, habitId: string, date: DateStr): boolean {
  return checkins.has(checkinKey(habitId, date));
}
