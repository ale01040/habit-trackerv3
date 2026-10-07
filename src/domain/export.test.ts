import { describe, expect, it } from 'vitest';
import { buildDayExport, exportFilename, toCsv, toMarkdown } from './export';
import { checkinsOf, makeHabit, makePeriod } from './test-fixtures';

const today = '2026-10-07';
const water = makeHabit({
  id: 'w',
  name: 'Drink water',
  position: 0,
  periods: [makePeriod('2026-10-01')],
});
const read = makeHabit({
  id: 'r',
  name: 'Read 15min',
  position: 1,
  periods: [makePeriod('2026-10-01')],
});
const gym = makeHabit({
  id: 'g',
  name: 'Gym',
  position: 2,
  periods: [makePeriod('2026-10-01', null, [1])],
});
const checks = checkinsOf('w', ['2026-10-05', '2026-10-06', '2026-10-07']);

describe('buildDayExport', () => {
  it('solo abitudini previste, in ordine, con streak', () => {
    const e = buildDayExport([read, gym, water], checks, today, today);
    expect(e.rows).toEqual([
      { name: 'Drink water', done: true, streak: 3 },
      { name: 'Read 15min', done: false, streak: 0 },
    ]);
    expect(e.completion).toEqual({ done: 1, scheduled: 2, ratio: 0.5 });
  });
});

describe('toMarkdown', () => {
  it('formato della specifica', () => {
    const e = buildDayExport([water, read], checks, today, today);
    expect(toMarkdown(e)).toBe(
      [
        '# 2026-10-07 — Habit tracker',
        'Completamento: 50% (1/2)',
        '',
        '- [x] Drink water 🔥3',
        '- [ ] Read 15min',
        '',
      ].join('\n'),
    );
  });

  it('giorno senza abitudini previste', () => {
    const e = buildDayExport([gym], new Set(), today, today);
    expect(toMarkdown(e)).toBe(
      [
        '# 2026-10-07 — Habit tracker',
        'Completamento: — (0/0)',
        '',
        '_Nessuna abitudine prevista._',
        '',
      ].join('\n'),
    );
  });
});

describe('toCsv', () => {
  it('intestazione, BOM e righe CRLF', () => {
    const e = buildDayExport([water, read], checks, today, today);
    expect(toCsv(e)).toBe(
      '\uFEFFdata,abitudine,fatto,streak\r\n2026-10-07,Drink water,1,3\r\n2026-10-07,Read 15min,0,0\r\n',
    );
  });

  it('virgole, virgolette e formule non rompono il file', () => {
    const e = {
      date: today,
      completion: { done: 0, scheduled: 3, ratio: 0 },
      rows: [
        { name: 'Pane, burro', done: false, streak: 0 },
        { name: 'Il "caffè"', done: false, streak: 0 },
        { name: '=work = iss', done: false, streak: 0 },
      ],
    };
    expect(toCsv(e).split('\r\n').slice(1, 4)).toEqual([
      '2026-10-07,"Pane, burro",0,0',
      '2026-10-07,"Il ""caffè""",0,0',
      "2026-10-07,'=work = iss,0,0",
    ]);
  });
});

describe('exportFilename', () => {
  it('nome del file', () => {
    expect(exportFilename(today, 'md')).toBe('habit-tracker-2026-10-07.md');
    expect(exportFilename(today, 'csv')).toBe('habit-tracker-2026-10-07.csv');
  });
});
