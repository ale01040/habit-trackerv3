import { icons } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_ICON, HABIT_ICONS, isHabitIcon, toPascalCase } from './icons';

describe('icons', () => {
  it('converte i nomi in PascalCase', () => {
    expect(toPascalCase('flower-2')).toBe('Flower2');
    expect(toPascalCase('heart-pulse')).toBe('HeartPulse');
  });

  it('ogni icona esiste in lucide-react', () => {
    const missing = HABIT_ICONS.filter((name) => !(toPascalCase(name) in icons));
    expect(missing).toEqual([]);
  });

  it('nessun duplicato e default incluso', () => {
    expect(new Set(HABIT_ICONS).size).toBe(HABIT_ICONS.length);
    expect(isHabitIcon(DEFAULT_ICON)).toBe(true);
    expect(isHabitIcon('non-esiste')).toBe(false);
  });
});
