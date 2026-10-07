import { describe, expect, it } from 'vitest';
import {
  formatDayTitle,
  formatLongDate,
  plural,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  weekdaysSummary,
} from './format';

describe('formatDayTitle', () => {
  const today = '2026-10-07';
  it('oggi e ieri', () => {
    expect(formatDayTitle(today, today)).toBe('Oggi');
    expect(formatDayTitle('2026-10-06', today)).toBe('Ieri');
  });
  it('altri giorni', () => {
    expect(formatDayTitle('2026-10-05', today)).toBe('Lun 5 ottobre');
  });
});

describe('formatLongDate', () => {
  it('data estesa in italiano', () => {
    expect(formatLongDate('2026-10-07')).toBe('mercoledì 7 ottobre 2026');
  });
});

describe('giorni della settimana', () => {
  it('iniziali e nomi', () => {
    expect(Object.values(WEEKDAY_SHORT).join('')).toBe('LMMGVSD');
    expect(WEEKDAY_NAMES[7]).toBe('domenica');
  });

  it('riepilogo', () => {
    expect(weekdaysSummary([1, 2, 3, 4, 5, 6, 7])).toBe('Tutti i giorni');
    expect(weekdaysSummary([1, 2, 3, 4, 5])).toBe('Lun–Ven');
    expect(weekdaysSummary([6, 7])).toBe('Weekend');
    expect(weekdaysSummary([1, 3, 5])).toBe('Lun, Mer, Ven');
  });
});

describe('plural', () => {
  it('singolare e plurale', () => {
    expect(plural(1, 'abitudine attiva', 'abitudini attive')).toBe('1 abitudine attiva');
    expect(plural(0, 'abitudine attiva', 'abitudini attive')).toBe('0 abitudini attive');
    expect(plural(3, 'passata', 'passate')).toBe('3 passate');
  });
});
