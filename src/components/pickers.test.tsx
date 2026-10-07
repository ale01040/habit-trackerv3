import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HABIT_ICONS } from '../domain/icons';
import type { Weekday } from '../domain/types';
import { HabitIcon, ICON_COMPONENTS, ICON_LABELS } from './HabitIcon';
import { IconPicker } from './IconPicker';
import { Sheet } from './Sheet';
import { WeekdayPicker } from './WeekdayPicker';

describe('HabitIcon', () => {
  it('ogni icona ha componente ed etichetta', () => {
    for (const name of HABIT_ICONS) {
      expect(ICON_COMPONENTS[name]).toBeTruthy();
      expect(ICON_LABELS[name]).toBeTruthy();
    }
  });
  it('nome sconosciuto → icona di default', () => {
    const { container } = render(<HabitIcon name="boh" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('IconPicker', () => {
  it('seleziona un’icona', async () => {
    const onChange = vi.fn();
    render(<IconPicker value="droplet" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Goccia' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Pesi' }));
    expect(onChange).toHaveBeenCalledWith('dumbbell');
  });
});

describe('WeekdayPicker', () => {
  function Harness() {
    const [value, setValue] = useState<Weekday[]>([1, 2, 3, 4, 5, 6, 7]);
    return (
      <>
        <WeekdayPicker value={value} onChange={setValue} />
        <output>{value.join(',')}</output>
      </>
    );
  }
  it('attiva e disattiva giorni mantenendo l’ordine', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'martedì' }));
    expect(screen.getByRole('status')).toHaveTextContent('1,3,4,5,6,7');
    await userEvent.click(screen.getByRole('button', { name: 'martedì' }));
    expect(screen.getByRole('status')).toHaveTextContent('1,2,3,4,5,6,7');
    expect(screen.getByRole('button', { name: 'lunedì' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Sheet', () => {
  it('dialog con titolo; Esc e Chiudi chiamano onClose', async () => {
    const onClose = vi.fn();
    render(
      <Sheet open title="Modifica" onClose={onClose}>
        <p>contenuto</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Modifica' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
