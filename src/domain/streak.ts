import { parseDateStr } from './dates';
import { firstScheduledDate } from './schedule';
import { isDone, type Checkins, type DateStr, type Habit, type Weekday } from './types';

/**
 * Scorre i giorni con un solo Date locale: niente parse/format per passo.
 * setDate mantiene la mezzanotte locale anche al cambio dell'ora legale.
 */
function dayCursor(start: DateStr) {
  const d = parseDateStr(start);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return {
    get date(): DateStr {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },
    get weekday(): Weekday {
      return (((d.getDay() + 6) % 7) + 1) as Weekday;
    },
    step(days: number) {
      d.setDate(d.getDate() + days);
    },
  };
}

function scheduledOn(habit: Habit, date: DateStr, weekday: Weekday): boolean {
  return habit.periods.some(
    (p) =>
      p.validFrom <= date &&
      (p.validTo === null || p.validTo >= date) &&
      p.weekdays.includes(weekday),
  );
}

/** Giorni previsti consecutivi fatti fino a refDate; oggi non fatto non spezza. */
export function currentStreak(
  habit: Habit,
  checkins: Checkins,
  refDate: DateStr,
  today: DateStr,
): number {
  const first = firstScheduledDate(habit);
  if (first === null) return 0;
  const cursor = dayCursor(refDate > today ? today : refDate);
  if (
    cursor.date === today &&
    scheduledOn(habit, cursor.date, cursor.weekday) &&
    !isDone(checkins, habit.id, cursor.date)
  ) {
    cursor.step(-1);
  }
  let streak = 0;
  for (; cursor.date >= first; cursor.step(-1)) {
    const date = cursor.date;
    if (!scheduledOn(habit, date, cursor.weekday)) continue;
    if (!isDone(checkins, habit.id, date)) break;
    streak++;
  }
  return streak;
}

export function bestStreak(habit: Habit, checkins: Checkins, today: DateStr): number {
  const first = firstScheduledDate(habit);
  if (first === null) return 0;
  let best = 0;
  let run = 0;
  for (const cursor = dayCursor(first); cursor.date <= today; cursor.step(1)) {
    const date = cursor.date;
    if (!scheduledOn(habit, date, cursor.weekday)) continue;
    if (isDone(checkins, habit.id, date)) {
      run++;
      if (run > best) best = run;
    } else if (date !== today) {
      run = 0;
    }
  }
  return best;
}
