import { describe, expect, it } from 'vitest';
import {
  completion,
  dayCompletion,
  formatPercent,
  monthCompletion,
  percentBand,
  rangeCompletion,
  weekCompletion,
} from './stats';
import { checkinsOf, makeHabit, makePeriod } from './test-fixtures';

const water = makeHabit({ id: 'w', periods: [makePeriod('2026-10-01')] });
const gym = makeHabit({ id: 'g', periods: [makePeriod('2026-10-01', null, [1, 3, 5])] });

describe('dayCompletion', () => {
  it('fatte / previste del giorno', () => {
    const checks = checkinsOf('w', ['2026-10-07']);
    expect(dayCompletion([water, gym], checks, '2026-10-07')).toEqual({
      done: 1,
      scheduled: 2,
      ratio: 0.5,
    });
  });

  it('ignora spunte su giorni non previsti', () => {
    const checks = checkinsOf('g', ['2026-10-06']); // martedì: palestra non prevista
    expect(dayCompletion([water, gym], checks, '2026-10-06')).toEqual({
      done: 0,
      scheduled: 1,
      ratio: 0,
    });
  });

  it('nessuna prevista → ratio null', () => {
    expect(dayCompletion([gym], new Set(), '2026-10-06').ratio).toBeNull();
  });
});

describe('settimana e mese', () => {
  it('settimana in corso: i giorni futuri non contano', () => {
    // oggi mercoledì 7: lun, mar, mer = 3 acqua + 2 palestra = 5 previste
    const checks = new Set([
      ...checkinsOf('w', ['2026-10-05', '2026-10-06', '2026-10-07']),
      ...checkinsOf('g', ['2026-10-05']),
    ]);
    expect(weekCompletion([water, gym], checks, '2026-10-07', '2026-10-07')).toEqual({
      done: 4,
      scheduled: 5,
      ratio: 0.8,
    });
  });

  it('settimana futura → null', () => {
    expect(weekCompletion([water], new Set(), '2026-10-14', '2026-10-07').ratio).toBeNull();
  });

  it('mese: conta solo da quando esiste', () => {
    const checks = checkinsOf('w', ['2026-10-01', '2026-10-02']);
    expect(monthCompletion([water], checks, '2026-10-15', '2026-10-07')).toEqual({
      done: 2,
      scheduled: 7,
      ratio: 2 / 7,
    });
  });

  it('archiviata non abbassa i giorni dopo l’archiviazione', () => {
    const archived = makeHabit({ id: 'a', periods: [makePeriod('2026-10-01', '2026-10-03')] });
    const checks = checkinsOf('a', ['2026-10-01', '2026-10-02', '2026-10-03']);
    expect(
      rangeCompletion([archived], checks, { start: '2026-10-01', end: '2026-10-07' }, '2026-10-07'),
    ).toEqual({ done: 3, scheduled: 3, ratio: 1 });
  });

  it('completion su lista di giorni vuota', () => {
    expect(completion([water], new Set(), [])).toEqual({ done: 0, scheduled: 0, ratio: null });
  });
});

describe('percentBand / formatPercent', () => {
  it('fasce', () => {
    expect(percentBand(null)).toBeNull();
    expect(percentBand(1)).toBe('high');
    expect(percentBand(0.8)).toBe('high');
    expect(percentBand(0.79)).toBe('mid');
    expect(percentBand(0.5)).toBe('mid');
    expect(percentBand(0.49)).toBe('low');
    expect(percentBand(0)).toBe('low');
  });

  it('formato', () => {
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(9 / 14)).toBe('64%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
  });
});
