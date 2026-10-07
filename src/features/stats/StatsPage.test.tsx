import { failingLoads } from '../../test/failingBackend';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { seedBackend } from '../../test/seed';
import { StatsPage } from './StatsPage';

const seed = () =>
  seedBackend({
    habits: [
      { id: 'w', name: 'Drink water', periods: [['2026-10-01', null]] },
      { id: 'g', name: 'Gym', icon: 'dumbbell', periods: [['2026-10-01', null, [1]]] },
      { id: 'y', name: 'Yoga', periods: [['2026-10-01', '2026-10-03']] },
    ],
    checkins: [
      ['w', '2026-10-05'],
      ['w', '2026-10-07'],
      ['g', '2026-10-05'],
      ['y', '2026-10-02'],
    ],
  });

describe('StatsPage', () => {
  it('caricamento fallito: errore invece di statistiche vuote', async () => {
    renderWithApp(<StatsPage />, { backend: failingLoads(seed(), 5), route: '/stats' });
    expect(await screen.findByText('Impossibile caricare i tuoi dati')).toBeInTheDocument();
    expect(screen.queryByText('Nessuna abitudine prevista')).not.toBeInTheDocument();
  });

  it('settimana corrente di default', async () => {
    renderWithApp(<StatsPage />, { backend: seed(), route: '/stats' });
    expect(await screen.findByText('3 su 4 completate')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5 – 11 ottobre' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settimana' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Periodo successivo' })).toBeDisabled();
    const bars = screen.getByRole('list', { name: 'Andamento giornaliero' });
    expect(within(bars).getAllByRole('listitem')).toHaveLength(7);
    expect(within(bars).getByLabelText('lunedì 5 ottobre 2026: 100%')).toBeInTheDocument();
    expect(within(bars).getByLabelText('giovedì 8 ottobre 2026: futuro')).toBeInTheDocument();
  });

  it('dettaglio per abitudine con streak', async () => {
    renderWithApp(<StatsPage />, { backend: seed(), route: '/stats' });
    const list = await screen.findByRole('list', { name: 'Per abitudine' });
    const water = within(list).getByRole('listitem', { name: 'Drink water' });
    expect(within(water).getByText('67%')).toBeInTheDocument();
    expect(within(water).getByText('2/3')).toBeInTheDocument();
    expect(within(water).getByLabelText('Streak attuale 1, migliore 1')).toBeInTheDocument();
    expect(within(list).queryByRole('listitem', { name: 'Yoga' })).not.toBeInTheDocument();
  });

  it('giorno e mese', async () => {
    const { user } = renderWithApp(<StatsPage />, { backend: seed(), route: '/stats' });
    await user.click(await screen.findByRole('tab', { name: 'Giorno' }));
    expect(screen.getByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
    expect(await screen.findByText('1 su 1 completate')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Mese' }));
    expect(screen.getByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument();
    // ottobre fino al 7: acqua 2/7, gym 1/1, yoga 1/3 → 4 su 11
    expect(screen.getByText('4 su 11 completate')).toBeInTheDocument();
    const grid = screen.getByRole('table', { name: /griglia del mese/i });
    expect(within(grid).getByLabelText('Drink water, 5 ottobre: fatta')).toBeInTheDocument();
    expect(within(grid).getByLabelText('Drink water, 6 ottobre: mancata')).toBeInTheDocument();
    expect(within(grid).getByLabelText('Gym, 6 ottobre: non prevista')).toBeInTheDocument();
    expect(within(grid).getByLabelText('Yoga, 5 ottobre: non prevista')).toBeInTheDocument();
    expect(within(grid).getByLabelText('Drink water, 8 ottobre: futura')).toBeInTheDocument();
    expect(within(grid).getByRole('columnheader', { name: '7' })).toHaveAttribute('data-today');
  });

  it('periodo precedente', async () => {
    const { user } = renderWithApp(<StatsPage />, { backend: seed(), route: '/stats' });
    await user.click(await screen.findByRole('button', { name: 'Periodo precedente' }));
    expect(screen.getByRole('heading', { name: '28 set – 4 ott' })).toBeInTheDocument();
    // acqua 4 previste (1–4 ott) 0 fatte, yoga 3 previste 1 fatta → 1 su 7
    expect(await screen.findByText('1 su 7 completate')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Periodo successivo' })).toBeEnabled();
  });

  it('senza abitudini', async () => {
    renderWithApp(<StatsPage />, { backend: seedBackend(), route: '/stats' });
    expect(await screen.findByText('Nessuna abitudine prevista')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
