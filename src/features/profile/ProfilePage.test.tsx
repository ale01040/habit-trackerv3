import { failingLoads } from '../../test/failingBackend';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { seedBackend } from '../../test/seed';
import { ProfilePage } from './ProfilePage';

const seed = () =>
  seedBackend({
    habits: [
      { id: 'w', name: 'Drink water', icon: 'droplet' },
      { id: 'r', name: 'Read', icon: 'book-open', periods: [['2026-09-01', null, [1, 3, 5]]] },
      { id: 'y', name: 'Yoga', periods: [['2026-09-01', '2026-09-30']] },
    ],
  });

describe('ProfilePage', () => {
  it('caricamento fallito: errore invece di zero abitudini', async () => {
    renderWithApp(<ProfilePage />, { backend: failingLoads(seed(), 5), route: '/profile' });
    expect(await screen.findByText('Impossibile caricare i tuoi dati')).toBeInTheDocument();
    expect(screen.queryByText(/0 abitudini attive/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nessuna abitudine attiva/)).not.toBeInTheDocument();
  });

  it('mostra email, contatori, attive e passate', async () => {
    renderWithApp(<ProfilePage />, { backend: seed(), route: '/profile' });
    expect(await screen.findByText('2 abitudini attive · 1 passata')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    const active = screen.getByRole('list', { name: 'Abitudini attive' });
    expect(within(active).getByText('Drink water')).toBeInTheDocument();
    expect(within(active).getByText('Lun, Mer, Ven')).toBeInTheDocument();
    expect(screen.getByText('Abitudini passate (1)')).toBeInTheDocument();
  });

  it('inserimento rapido con valori di default', async () => {
    const backend = seed();
    const { user } = renderWithApp(<ProfilePage />, { backend, route: '/profile' });
    await user.type(await screen.findByLabelText('Nuova abitudine'), '  Journal {Enter}');
    expect(await screen.findByText('3 abitudini attive · 1 passata')).toBeInTheDocument();
    expect(screen.getByLabelText('Nuova abitudine')).toHaveValue('');
    const journal = (await backend.listHabits()).find((h) => h.name === 'Journal');
    expect(journal).toMatchObject({ icon: 'sparkles' });
    expect(journal?.periods[0].weekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('inserimento rapido: errori e proposta di riattivazione', async () => {
    const { user } = renderWithApp(<ProfilePage />, { backend: seed(), route: '/profile' });
    const input = await screen.findByLabelText('Nuova abitudine');
    await user.type(input, '   {Enter}');
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument();
    await user.type(input, 'drink water{Enter}');
    expect(await screen.findByText(/esiste già/i)).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, 'YOGA{Enter}');
    const alert = await screen.findByRole('alert');
    await user.click(within(alert).getByRole('button', { name: 'Riattiva «Yoga»' }));
    expect(await screen.findByText('3 abitudini attive · 0 passate')).toBeInTheDocument();
  });

  it('modifica dal foglio', async () => {
    const { user } = renderWithApp(<ProfilePage />, { backend: seed(), route: '/profile' });
    await user.click(await screen.findByRole('button', { name: 'Modifica «Drink water»' }));
    const dialog = screen.getByRole('dialog', { name: 'Modifica abitudine' });
    await user.clear(within(dialog).getByLabelText('Nome'));
    await user.type(within(dialog).getByLabelText('Nome'), 'Acqua');
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }));
    expect(await screen.findByRole('button', { name: 'Modifica «Acqua»' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('archivia e riattiva', async () => {
    const { user } = renderWithApp(<ProfilePage />, { backend: seed(), route: '/profile' });
    await user.click(await screen.findByRole('button', { name: 'Modifica «Read»' }));
    await user.click(screen.getByRole('button', { name: 'Archivia' }));
    await user.click(screen.getByRole('button', { name: 'Conferma archiviazione' }));
    expect(await screen.findByText('1 abitudine attiva · 2 passate')).toBeInTheDocument();
    await user.click(screen.getByText('Abitudini passate (2)'));
    await user.click(screen.getByRole('button', { name: 'Riattiva «Read»' }));
    expect(await screen.findByText('2 abitudini attive · 1 passata')).toBeInTheDocument();
  });

  it('crea dal foglio completo', async () => {
    const { user } = renderWithApp(<ProfilePage />, { backend: seed(), route: '/profile' });
    await user.click(await screen.findByRole('button', { name: 'Nuova abitudine completa' }));
    const dialog = screen.getByRole('dialog', { name: 'Nuova abitudine' });
    await user.type(within(dialog).getByLabelText('Nome'), 'Meditazione');
    await user.click(within(dialog).getByRole('button', { name: 'Crea abitudine' }));
    expect(
      await screen.findByRole('button', { name: 'Modifica «Meditazione»' }),
    ).toBeInTheDocument();
  });
});
