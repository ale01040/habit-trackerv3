import { failingLoads } from '../../test/failingBackend';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Backend } from '../../data/backend';
import { BackendError } from '../../data/errors';
import { renderWithApp, TEST_TODAY } from '../../test/render';
import { seedBackend } from '../../test/seed';
import { HomePage } from './HomePage';

const seed = () =>
  seedBackend({
    habits: [
      { id: 'w', name: 'Drink water', description: 'Almeno 2 litri' },
      { id: 'r', name: 'Read 15min', icon: 'book-open' },
      { id: 'g', name: 'Gym', icon: 'dumbbell', periods: [['2026-09-01', null, [1]]] },
    ],
    checkins: [
      ['w', '2026-10-05'],
      ['w', '2026-10-06'],
    ],
  });

describe('HomePage', () => {
  it('caricamento fallito: errore con Riprova, non un account vuoto', async () => {
    const { user } = renderWithApp(<HomePage />, { backend: failingLoads(seed()) });
    expect(await screen.findByText('Impossibile caricare i tuoi dati')).toBeInTheDocument();
    expect(screen.queryByText('Non hai ancora abitudini.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByRole('list', { name: 'Da fare' })).toBeInTheDocument();
  });

  it('mostra solo le abitudini previste oggi con streak e anello', async () => {
    renderWithApp(<HomePage />, { backend: seed() });
    const todo = await screen.findByRole('list', { name: 'Da fare' });
    expect(
      within(todo)
        .getAllByRole('listitem')
        .map((li) => li.getAttribute('aria-label')),
    ).toEqual(['Drink water', 'Read 15min']);
    expect(screen.queryByText('Gym')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Streak 2 giorni')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Completamento 0%, 0 su 2' })).toBeInTheDocument();
  });

  it('spunta → Completate, anello aggiornato, salvato; poi togli la spunta', async () => {
    const backend = seed();
    const { user } = renderWithApp(<HomePage />, { backend });
    await user.click(await screen.findByRole('button', { name: 'Segna «Drink water» come fatta' }));
    const done = await screen.findByRole('list', { name: 'Completate' });
    expect(within(done).getByText('Drink water')).toBeInTheDocument();
    expect(screen.getByText('Completate (1)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Completamento 50%, 1 su 2' })).toBeInTheDocument();
    expect(screen.getByLabelText('Streak 3 giorni')).toBeInTheDocument();
    await waitFor(async () =>
      expect(await backend.listCheckins()).toContainEqual({ habitId: 'w', date: TEST_TODAY }),
    );
    await user.click(screen.getByRole('button', { name: 'Togli la spunta a «Drink water»' }));
    await waitFor(() => expect(screen.queryByText('Completate (1)')).not.toBeInTheDocument());
    await waitFor(async () =>
      expect(await backend.listCheckins()).not.toContainEqual({ habitId: 'w', date: TEST_TODAY }),
    );
  });

  it('doppio tap: lo stato finale segue l’ultimo tap', async () => {
    const backend = seed();
    const { user } = renderWithApp(<HomePage />, { backend });
    await user.click(await screen.findByRole('button', { name: 'Segna «Read 15min» come fatta' }));
    await user.click(screen.getByRole('button', { name: 'Togli la spunta a «Read 15min»' }));
    await waitFor(async () => expect(await backend.listCheckins()).toHaveLength(2));
    expect(
      screen.getByRole('button', { name: 'Segna «Read 15min» come fatta' }),
    ).toBeInTheDocument();
  });

  it('descrizione al tap sul nome', async () => {
    const { user } = renderWithApp(<HomePage />, { backend: seed() });
    await user.click(await screen.findByRole('button', { name: 'Drink water' }));
    expect(screen.getByText('Almeno 2 litri')).toBeInTheDocument();
  });

  it('giorno precedente: lunedì compare Gym', async () => {
    const { user } = renderWithApp(<HomePage />, { backend: seed() });
    await user.click(await screen.findByRole('button', { name: 'Giorno precedente' }));
    await user.click(screen.getByRole('button', { name: 'Giorno precedente' }));
    expect(await screen.findByRole('heading', { name: 'Lun 5 ottobre' })).toBeInTheDocument();
    expect(await screen.findByText('Gym')).toBeInTheDocument();
  });

  it('oltre 7 giorni: sola lettura', async () => {
    renderWithApp(<HomePage />, { backend: seed(), route: '/?d=2026-09-29' });
    expect(await screen.findByText(/solo gli ultimi 7 giorni/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Segna «Drink water» come fatta' }),
    ).toBeDisabled();
  });

  it('data futura o non valida nell’URL → oggi', async () => {
    renderWithApp(<HomePage />, { backend: seed(), route: '/?d=2030-01-01' });
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });

  it('errore di rete → rollback e Riprova', async () => {
    const base = seed();
    const backend: Backend = {
      ...base,
      addCheckin: () => Promise.reject(new BackendError('network')),
    };
    const { user } = renderWithApp(<HomePage />, { backend });
    await user.click(await screen.findByRole('button', { name: 'Segna «Drink water» come fatta' }));
    expect(await screen.findByText('Nessuna connessione, riprova')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Segna «Drink water» come fatta' }),
      ).toBeInTheDocument(),
    );
  });

  it('nessuna abitudine: invito a crearne una', async () => {
    renderWithApp(<HomePage />, { backend: seedBackend() });
    expect(await screen.findByText('Non hai ancora abitudini.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crea la prima' })).toHaveAttribute('href', '/profile');
  });

  it('nessuna prevista nel giorno', async () => {
    renderWithApp(<HomePage />, {
      backend: seedBackend({ habits: [{ name: 'Gym', periods: [['2026-09-01', null, [1]]] }] }),
    });
    expect(
      await screen.findByText('Nessuna abitudine prevista per questo giorno.'),
    ).toBeInTheDocument();
  });
});
