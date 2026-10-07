import { describe, expect, it } from 'vitest';
import {
  activeHabits,
  currentWeekdays,
  firstScheduledDate,
  isActive,
  isScheduled,
  pastHabits,
  scheduledHabits,
} from './schedule';
import { makeHabit, makePeriod } from './test-fixtures';

// 2026-10-05 lun, 10-06 mar, 10-07 mer, 10-11 dom
describe('isScheduled', () => {
  it('abitudine quotidiana con periodo aperto', () => {
    const h = makeHabit({ periods: [makePeriod('2026-10-01')] });
    expect(isScheduled(h, '2026-09-30')).toBe(false);
    expect(isScheduled(h, '2026-10-01')).toBe(true);
    expect(isScheduled(h, '2030-01-01')).toBe(true);
  });

  it('rispetta i giorni della settimana', () => {
    const h = makeHabit({ periods: [makePeriod('2026-10-01', null, [1, 3, 5])] });
    expect(isScheduled(h, '2026-10-05')).toBe(true);
    expect(isScheduled(h, '2026-10-06')).toBe(false);
    expect(isScheduled(h, '2026-10-07')).toBe(true);
  });

  it('estremi del periodo chiuso inclusi', () => {
    const h = makeHabit({ periods: [makePeriod('2026-10-01', '2026-10-03')] });
    expect(isScheduled(h, '2026-10-01')).toBe(true);
    expect(isScheduled(h, '2026-10-03')).toBe(true);
    expect(isScheduled(h, '2026-10-04')).toBe(false);
  });

  it('storico: cambio di giorni non tocca il passato', () => {
    const h = makeHabit({
      periods: [makePeriod('2026-09-01', '2026-09-30'), makePeriod('2026-10-01', null, [1])],
    });
    expect(isScheduled(h, '2026-09-29')).toBe(true); // martedì, vecchio periodo
    expect(isScheduled(h, '2026-10-06')).toBe(false); // martedì, nuovo periodo
    expect(isScheduled(h, '2026-10-05')).toBe(true); // lunedì
  });

  it('nessun periodo → mai prevista', () => {
    expect(isScheduled(makeHabit({ periods: [] }), '2026-10-07')).toBe(false);
  });
});

describe('attive e passate', () => {
  const a = makeHabit({ id: 'a', name: 'Zeta', position: 2 });
  const b = makeHabit({ id: 'b', name: 'Alfa', position: 1 });
  const p1 = makeHabit({
    id: 'p1',
    name: 'Yoga',
    position: 0,
    periods: [makePeriod('2026-01-01', '2026-02-01')],
  });
  const p2 = makeHabit({ id: 'p2', name: 'caffè', position: 3, periods: [] });

  it('isActive', () => {
    expect(isActive(a)).toBe(true);
    expect(isActive(p1)).toBe(false);
    expect(isActive(p2)).toBe(false);
  });

  it('attive ordinate per posizione', () => {
    expect(activeHabits([a, p1, b]).map((h) => h.id)).toEqual(['b', 'a']);
  });

  it('passate ordinate per nome', () => {
    expect(pastHabits([a, p1, p2]).map((h) => h.id)).toEqual(['p2', 'p1']);
  });

  it('scheduledHabits filtra e ordina', () => {
    expect(scheduledHabits([a, p1, b], '2026-10-07').map((h) => h.id)).toEqual(['b', 'a']);
  });
});

describe('firstScheduledDate / currentWeekdays', () => {
  it('prima data = inizio del periodo più vecchio', () => {
    const h = makeHabit({
      periods: [makePeriod('2026-10-01'), makePeriod('2026-03-01', '2026-04-01')],
    });
    expect(firstScheduledDate(h)).toBe('2026-03-01');
    expect(firstScheduledDate(makeHabit({ periods: [] }))).toBeNull();
  });

  it('giorni correnti: periodo aperto, poi ultimo chiuso, poi tutti', () => {
    const open = makeHabit({
      periods: [makePeriod('2026-01-01', '2026-02-01', [2]), makePeriod('2026-03-01', null, [1])],
    });
    expect(currentWeekdays(open)).toEqual([1]);
    const closed = makeHabit({
      periods: [
        makePeriod('2026-01-01', '2026-02-01', [2]),
        makePeriod('2026-03-01', '2026-04-01', [4, 5]),
      ],
    });
    expect(currentWeekdays(closed)).toEqual([4, 5]);
    expect(currentWeekdays(makeHabit({ periods: [] }))).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
