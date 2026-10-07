import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { eachDay } from '../../domain/dates';
import { makeHabit } from '../../domain/test-fixtures';
import { HabitGrid } from './HabitGrid';

describe('HabitGrid', () => {
  it('non riporta lo scorrimento su oggi a ogni render', () => {
    const habits = [makeHabit()];
    const range = { start: '2026-10-01', end: '2026-10-31' };
    const { rerender } = render(
      <HabitGrid habits={habits} days={eachDay(range)} checkins={new Set()} today="2026-10-07" />,
    );
    const box = screen.getByRole('region', { name: 'Griglia scorrevole del mese' });
    let writes = 0;
    Object.defineProperty(box, 'scrollLeft', {
      configurable: true,
      get: () => 0,
      set: () => void writes++,
    });
    // nuovo array con gli stessi giorni, come accade a ogni render della pagina
    rerender(
      <HabitGrid habits={habits} days={eachDay(range)} checkins={new Set()} today="2026-10-07" />,
    );
    expect(writes).toBe(0);
  });
});
