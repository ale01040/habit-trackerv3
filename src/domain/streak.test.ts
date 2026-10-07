import { describe, expect, it } from 'vitest';
import { bestStreak, currentStreak } from './streak';
import { checkinsOf, makeHabit, makePeriod } from './test-fixtures';

const today = '2026-10-07'; // mercoledì
const daily = makeHabit({ id: 'd', periods: [makePeriod('2026-10-01')] });

describe('currentStreak', () => {
  it('oggi non ancora fatto non spezza', () => {
    const c = checkinsOf('d', ['2026-10-04', '2026-10-05', '2026-10-06']);
    expect(currentStreak(daily, c, today, today)).toBe(3);
  });

  it('oggi fatto si aggiunge', () => {
    const c = checkinsOf('d', ['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(currentStreak(daily, c, today, today)).toBe(3);
  });

  it('ieri saltato → 0', () => {
    const c = checkinsOf('d', ['2026-10-04', '2026-10-05']);
    expect(currentStreak(daily, c, today, today)).toBe(0);
  });

  it('salta i giorni non previsti', () => {
    const mwf = makeHabit({ id: 'm', periods: [makePeriod('2026-09-28', null, [1, 3, 5])] });
    const c = checkinsOf('m', ['2026-10-02', '2026-10-05', '2026-10-07']);
    expect(currentStreak(mwf, c, today, today)).toBe(3);
  });

  it('la pausa da archiviata non spezza né allunga', () => {
    const paused = makeHabit({
      id: 'p',
      periods: [makePeriod('2026-09-28', '2026-10-02'), makePeriod('2026-10-05')],
    });
    const c = checkinsOf('p', ['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06']);
    expect(currentStreak(paused, c, today, today)).toBe(4);
  });

  it('giorno passato non fatto → 0', () => {
    const c = checkinsOf('d', ['2026-10-04']);
    expect(currentStreak(daily, c, '2026-10-05', today)).toBe(0);
  });

  it('giorno passato fatto → streak fino a quel giorno', () => {
    const c = checkinsOf('d', ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-07']);
    expect(currentStreak(daily, c, '2026-10-05', today)).toBe(3);
  });

  it('si ferma all’inizio dello storico', () => {
    const c = checkinsOf('d', [
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(currentStreak(daily, c, today, today)).toBe(6);
  });

  it('nessun periodo → 0', () => {
    expect(currentStreak(makeHabit({ periods: [] }), new Set(), today, today)).toBe(0);
  });

  it('data di riferimento nel futuro viene trattata come oggi', () => {
    const c = checkinsOf('d', ['2026-10-06']);
    expect(currentStreak(daily, c, '2026-10-20', today)).toBe(1);
  });
});

describe('cambio dell’ora legale', () => {
  it('le streak attraversano il 25 ottobre senza saltare giorni', () => {
    const h = makeHabit({ id: 'x', periods: [makePeriod('2026-10-20')] });
    const days = [
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
    ];
    const c = checkinsOf('x', days);
    expect(currentStreak(h, c, '2026-10-27', '2026-10-27')).toBe(6);
    expect(bestStreak(h, c, '2026-10-28')).toBe(6);
    const mwf = makeHabit({ id: 'm', periods: [makePeriod('2026-03-20', null, [1, 3, 5])] });
    // ven 27, lun 30, mer 1 aprile: in mezzo il 29 marzo (cambio d'ora)
    const c2 = checkinsOf('m', ['2026-03-27', '2026-03-30', '2026-04-01']);
    expect(currentStreak(mwf, c2, '2026-04-01', '2026-04-01')).toBe(3);
  });
});

describe('bestStreak', () => {
  it('la sequenza più lunga', () => {
    const c = checkinsOf('d', [
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(bestStreak(daily, c, today)).toBe(3);
  });

  it('oggi non fatto non azzera la sequenza in corso', () => {
    const c = checkinsOf('d', ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
    expect(bestStreak(daily, c, today)).toBe(4);
  });

  it('nessun periodo → 0', () => {
    expect(bestStreak(makeHabit({ periods: [] }), new Set(), today)).toBe(0);
  });
});
