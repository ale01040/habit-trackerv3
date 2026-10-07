import { describe, expect, it } from 'vitest';
import { parseSelectedDate, shouldToggleFromSwipe } from './swipe';

describe('shouldToggleFromSwipe', () => {
  it('oltre il 35% in entrambe le direzioni', () => {
    expect(shouldToggleFromSwipe(140, 400)).toBe(true);
    expect(shouldToggleFromSwipe(-140, 400)).toBe(true);
    expect(shouldToggleFromSwipe(139, 400)).toBe(false);
    expect(shouldToggleFromSwipe(-20, 400)).toBe(false);
  });
  it('larghezza sconosciuta → mai', () => {
    expect(shouldToggleFromSwipe(500, 0)).toBe(false);
  });
});

describe('parseSelectedDate', () => {
  const today = '2026-10-07';
  it('valida, futura, assente o malformata', () => {
    expect(parseSelectedDate('2026-10-01', today)).toBe('2026-10-01');
    expect(parseSelectedDate('2030-01-01', today)).toBe(today);
    expect(parseSelectedDate(null, today)).toBe(today);
    expect(parseSelectedDate('ciao', today)).toBe(today);
    expect(parseSelectedDate('2026-02-30', today)).toBe(today);
  });
});
