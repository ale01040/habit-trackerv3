import { describe, expect, it } from 'vitest';
import {
  addDays,
  clampToToday,
  diffDays,
  eachDay,
  isEditable,
  isoWeekday,
  monthRange,
  parseDateStr,
  toDateStr,
  todayStr,
  weekRange,
} from './dates';
import { checkinKey, isDone } from './types';

describe('toDateStr / parseDateStr', () => {
  it('usa la data locale, non UTC', () => {
    expect(toDateStr(new Date(2026, 9, 7, 23, 59))).toBe('2026-10-07');
    expect(toDateStr(new Date(2026, 9, 8, 0, 30))).toBe('2026-10-08');
  });

  it('fa il giro completo', () => {
    expect(toDateStr(parseDateStr('2026-02-28'))).toBe('2026-02-28');
  });

  it('rifiuta date inesistenti o in altro formato', () => {
    expect(() => parseDateStr('2026-02-30')).toThrow();
    expect(() => parseDateStr('7/10/2026')).toThrow();
  });

  it('todayStr usa l’orologio passato', () => {
    expect(todayStr(new Date(2026, 9, 7, 0, 5))).toBe('2026-10-07');
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('addDays / diffDays', () => {
  it('attraversa il cambio dell’ora legale senza saltare giorni', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-10-26', -1)).toBe('2026-10-25');
  });

  it('attraversa la fine dell’anno', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('conta i giorni di calendario', () => {
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2);
    expect(diffDays('2026-10-01', '2026-10-07')).toBe(-6);
  });
});

describe('isoWeekday', () => {
  it('lunedì = 1, domenica = 7', () => {
    expect(isoWeekday('2026-10-05')).toBe(1);
    expect(isoWeekday('2026-10-07')).toBe(3);
    expect(isoWeekday('2026-10-11')).toBe(7);
  });
});

describe('weekRange / monthRange', () => {
  it('la settimana va da lunedì a domenica', () => {
    const expected = { start: '2026-10-05', end: '2026-10-11' };
    expect(weekRange('2026-10-05')).toEqual(expected);
    expect(weekRange('2026-10-07')).toEqual(expected);
    expect(weekRange('2026-10-11')).toEqual(expected);
  });

  it('settimana col cambio d’ora', () => {
    expect(weekRange('2026-10-25')).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });

  it('mese, anche bisestile', () => {
    expect(monthRange('2026-02-10')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2028-02-10')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });
});

describe('eachDay', () => {
  it('elenca i giorni inclusi gli estremi', () => {
    expect(eachDay({ start: '2026-03-28', end: '2026-03-31' })).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-03-31',
    ]);
  });

  it('intervallo vuoto se start > end', () => {
    expect(eachDay({ start: '2026-03-02', end: '2026-03-01' })).toEqual([]);
  });
});

describe('clampToToday', () => {
  const today = '2026-10-07';
  it('periodo futuro → null', () => {
    expect(clampToToday({ start: '2026-10-08', end: '2026-10-14' }, today)).toBeNull();
  });
  it('periodo in corso → si ferma a oggi', () => {
    expect(clampToToday({ start: '2026-10-05', end: '2026-10-11' }, today)).toEqual({
      start: '2026-10-05',
      end: today,
    });
  });
  it('periodo passato invariato', () => {
    const past = { start: '2026-09-01', end: '2026-09-30' };
    expect(clampToToday(past, today)).toEqual(past);
  });
});

describe('isEditable', () => {
  const today = '2026-10-07';
  it('da oggi fino a 7 giorni fa', () => {
    expect(isEditable(today, today)).toBe(true);
    expect(isEditable('2026-09-30', today)).toBe(true);
    expect(isEditable('2026-09-29', today)).toBe(false);
    expect(isEditable('2026-10-08', today)).toBe(false);
  });
});

describe('checkinKey / isDone', () => {
  it('riconosce una spunta', () => {
    const set = new Set([checkinKey('a', '2026-10-07')]);
    expect(isDone(set, 'a', '2026-10-07')).toBe(true);
    expect(isDone(set, 'a', '2026-10-06')).toBe(false);
  });
});
