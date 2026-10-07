import { describe, expect, it } from 'vitest';
import {
  NAME_ERROR_MESSAGES,
  normalizeName,
  normalizeWeekdays,
  validateDescription,
  validateHabitName,
} from './validation';

const existing = [
  { id: 'a', name: 'Coffee' },
  { id: 'b', name: 'Read 15min' },
];

describe('validateHabitName', () => {
  it('pulisce gli spazi', () => {
    expect(normalizeName('  Drink   water ')).toBe('Drink water');
    expect(validateHabitName('  Drink water ', existing)).toEqual({
      ok: true,
      value: 'Drink water',
    });
  });

  it('vuoto', () => {
    expect(validateHabitName('   ', existing)).toEqual({ ok: false, error: 'empty' });
  });

  it('troppo lungo, contando i caratteri come Postgres', () => {
    expect(validateHabitName('a'.repeat(41), existing)).toEqual({ ok: false, error: 'too_long' });
    expect(validateHabitName('😴'.repeat(40), existing).ok).toBe(true);
  });

  it('duplicato senza distinzione di maiuscole e spazi', () => {
    expect(validateHabitName('  coffee ', existing)).toEqual({
      ok: false,
      error: 'duplicate',
      duplicateOf: 'a',
    });
  });

  it('rinominare se stessa non è un duplicato', () => {
    expect(validateHabitName('COFFEE', existing, 'a')).toEqual({ ok: true, value: 'COFFEE' });
  });

  it('messaggi in italiano', () => {
    expect(NAME_ERROR_MESSAGES.duplicate).toMatch(/esiste già/i);
  });
});

describe('validateDescription', () => {
  it('vuota → null', () => {
    expect(validateDescription('   ')).toEqual({ ok: true, value: null });
  });
  it('tagliata ai bordi', () => {
    expect(validateDescription(' 2 litri ')).toEqual({ ok: true, value: '2 litri' });
  });
  it('troppo lunga', () => {
    expect(validateDescription('x'.repeat(201))).toEqual({ ok: false, error: 'too_long' });
  });
});

describe('normalizeWeekdays', () => {
  it('ordina e toglie duplicati', () => {
    expect(normalizeWeekdays([5, 1, 3, 1])).toEqual([1, 3, 5]);
  });
  it('vuoto o non valido → null', () => {
    expect(normalizeWeekdays([])).toBeNull();
    expect(normalizeWeekdays([0, 1])).toBeNull();
    expect(normalizeWeekdays([1, 8])).toBeNull();
    expect(normalizeWeekdays([1.5])).toBeNull();
  });
});
