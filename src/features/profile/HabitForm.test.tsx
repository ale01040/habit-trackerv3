import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../test/render';
import { seedBackend } from '../../test/seed';
import { HabitForm } from './HabitForm';

const ALL_DAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

describe('HabitForm', () => {
  it('crea con nome, descrizione, icona e giorni', async () => {
    const backend = seedBackend();
    const onDone = vi.fn();
    const { user } = renderWithApp(<HabitForm habits={[]} onDone={onDone} />, { backend });
    await user.type(screen.getByLabelText('Nome'), 'Gym');
    await user.type(screen.getByLabelText('Descrizione (facoltativa)'), '45 minuti');
    await user.click(screen.getByRole('button', { name: 'Pesi' }));
    await user.click(screen.getByRole('button', { name: 'sabato' }));
    await user.click(screen.getByRole('button', { name: 'domenica' }));
    await user.click(screen.getByRole('button', { name: 'Crea abitudine' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    const [gym] = await backend.listHabits();
    expect(gym).toMatchObject({ name: 'Gym', description: '45 minuti', icon: 'dumbbell' });
    expect(gym.periods[0].weekdays).toEqual([1, 2, 3, 4, 5]);
  });

  it('errori: nome vuoto, duplicato, nessun giorno', async () => {
    const backend = seedBackend({ habits: [{ id: 'c', name: 'Coffee' }] });
    const habits = await backend.listHabits();
    const { user } = renderWithApp(<HabitForm habits={habits} onDone={() => {}} />, { backend });
    await user.click(screen.getByRole('button', { name: 'Crea abitudine' }));
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome'), 'coffee');
    await user.click(screen.getByRole('button', { name: 'Crea abitudine' }));
    expect(await screen.findByText(/esiste già/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Tea');
    for (const day of ALL_DAYS) await user.click(screen.getByRole('button', { name: day }));
    await user.click(screen.getByRole('button', { name: 'Crea abitudine' }));
    expect(await screen.findByText('Scegli almeno un giorno')).toBeInTheDocument();
  });

  it('modifica e archivia con conferma', async () => {
    const backend = seedBackend({ habits: [{ id: 'c', name: 'Coffee', icon: 'coffee' }] });
    const habits = await backend.listHabits();
    const onDone = vi.fn();
    const { user } = renderWithApp(
      <HabitForm habit={habits[0]} habits={habits} onDone={onDone} />,
      { backend },
    );
    expect(screen.getByLabelText('Nome')).toHaveValue('Coffee');
    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Caffè');
    await user.click(screen.getByRole('button', { name: 'lunedì' }));
    await user.click(screen.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const [updated] = await backend.listHabits();
    expect(updated.name).toBe('Caffè');
    expect(updated.periods.at(-1)?.weekdays).toEqual([2, 3, 4, 5, 6, 7]);

    await user.click(screen.getByRole('button', { name: 'Archivia' }));
    expect(screen.getByText(/andrà tra le abitudini passate/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conferma archiviazione' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(2));
    const [archived] = await backend.listHabits();
    expect(archived.periods.every((p) => p.validTo !== null)).toBe(true);
  });
});
