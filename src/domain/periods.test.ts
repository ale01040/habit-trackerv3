import { describe, expect, it } from 'vitest';
import { formatPeriodLabel, formatShortDate } from './format';
import {
  dailyStats,
  dayState,
  habitsInRange,
  hasNextPeriod,
  periodRange,
  shiftPeriod,
} from './stats';
import { checkinsOf, makeHabit, makePeriod } from './test-fixtures';

const today = '2026-10-07';

describe('periodi', () => {
  it('intervalli', () => {
    expect(periodRange('day', today)).toEqual({ start: today, end: today });
    expect(periodRange('week', today)).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(periodRange('month', today)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
  });

  it('spostamento', () => {
    expect(shiftPeriod('day', today, -1)).toBe('2026-10-06');
    expect(shiftPeriod('week', today, -1)).toBe('2026-09-30');
    expect(shiftPeriod('month', '2026-03-31', -1)).toBe('2026-02-28');
  });

  it('periodo successivo solo se non contiene oggi', () => {
    expect(hasNextPeriod('week', today, today)).toBe(false);
    expect(hasNextPeriod('week', '2026-09-30', today)).toBe(true);
    expect(hasNextPeriod('day', '2026-10-06', today)).toBe(true);
    expect(hasNextPeriod('month', '2026-10-01', today)).toBe(false);
  });

  it('etichette', () => {
    expect(formatPeriodLabel('day', today, today)).toBe('Oggi');
    expect(formatPeriodLabel('week', today, today)).toBe('5 – 11 ottobre');
    expect(formatPeriodLabel('week', '2026-10-01', today)).toBe('28 set – 4 ott');
    expect(formatPeriodLabel('month', today, today)).toBe('Ottobre 2026');
    expect(formatShortDate('2026-10-05')).toBe('5 ottobre');
  });
});

describe('statistiche giornaliere', () => {
  const water = makeHabit({ id: 'w', periods: [makePeriod('2026-10-01')] });
  const gym = makeHabit({ id: 'g', position: 1, periods: [makePeriod('2026-10-01', null, [1])] });
  const checks = new Set([
    ...checkinsOf('w', ['2026-10-05', '2026-10-07']),
    ...checkinsOf('g', ['2026-10-05']),
  ]);

  it('una voce per giorno, futuri marcati', () => {
    const days = dailyStats([water, gym], checks, periodRange('week', today), today);
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({
      date: '2026-10-05',
      future: false,
      completion: { done: 2, scheduled: 2, ratio: 1 },
    });
    expect(days[1].completion).toEqual({ done: 0, scheduled: 1, ratio: 0 });
    expect(days[3]).toMatchObject({ date: '2026-10-08', future: true });
    expect(days[3].completion.ratio).toBeNull();
  });

  it('abitudini nel periodo: esclude le non ancora iniziate e le archiviate prima', () => {
    const old = makeHabit({
      id: 'o',
      position: 2,
      periods: [makePeriod('2026-08-01', '2026-08-31')],
    });
    const future = makeHabit({ id: 'f', position: 3, periods: [makePeriod('2026-10-09')] });
    const inWeek = habitsInRange([future, old, gym, water], periodRange('week', today), today);
    expect(inWeek.map((h) => h.id)).toEqual(['w', 'g']);
    expect(habitsInRange([water], periodRange('week', '2026-10-14'), today)).toEqual([]);
  });

  it('stato di una cella', () => {
    expect(dayState(water, checks, '2026-10-05', today)).toBe('done');
    expect(dayState(water, checks, '2026-10-06', today)).toBe('missed');
    expect(dayState(gym, checks, '2026-10-06', today)).toBe('off');
    expect(dayState(water, checks, '2026-10-08', today)).toBe('future');
  });
});
