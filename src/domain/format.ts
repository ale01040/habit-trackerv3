import { endOfWeek, format, startOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { addDays, parseDateStr } from './dates';
import type { DateStr, Weekday } from './types';

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: 'L',
  2: 'M',
  3: 'M',
  4: 'G',
  5: 'V',
  6: 'S',
  7: 'D',
};

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  1: 'lunedì',
  2: 'martedì',
  3: 'mercoledì',
  4: 'giovedì',
  5: 'venerdì',
  6: 'sabato',
  7: 'domenica',
};

const WEEKDAY_ABBR: Record<Weekday, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Gio',
  5: 'Ven',
  6: 'Sab',
  7: 'Dom',
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDayTitle(date: DateStr, today: DateStr): string {
  if (date === today) return 'Oggi';
  if (date === addDays(today, -1)) return 'Ieri';
  return capitalize(format(parseDateStr(date), 'EEE d MMMM', { locale: it }));
}

export function formatLongDate(date: DateStr): string {
  return format(parseDateStr(date), 'EEEE d MMMM yyyy', { locale: it });
}

export function weekdaysSummary(weekdays: readonly Weekday[]): string {
  const sorted = [...weekdays].sort((a, b) => a - b);
  const key = sorted.join('');
  if (key === '1234567') return 'Tutti i giorni';
  if (key === '12345') return 'Lun–Ven';
  if (key === '67') return 'Weekend';
  return sorted.map((d) => WEEKDAY_ABBR[d]).join(', ');
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function formatShortDate(date: DateStr): string {
  return format(parseDateStr(date), 'd MMMM', { locale: it });
}

export function formatPeriodLabel(
  kind: 'day' | 'week' | 'month',
  date: DateStr,
  today: DateStr,
): string {
  if (kind === 'day') return formatDayTitle(date, today);
  const d = parseDateStr(date);
  if (kind === 'month') return capitalize(format(d, 'MMMM yyyy', { locale: it }));
  const start = startOfWeek(d, { weekStartsOn: 1 });
  const end = endOfWeek(d, { weekStartsOn: 1 });
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd')} – ${format(end, 'd MMMM', { locale: it })}`;
  }
  return `${format(start, 'd MMM', { locale: it })} – ${format(end, 'd MMM', { locale: it })}`;
}
