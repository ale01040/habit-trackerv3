import { BackendError } from '../data/errors';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createMemoryBackend } from '../data/memoryBackend';
import { renderWithApp, TEST_NOW } from '../test/render';
import { AppRoutes } from './routes';

async function loggedBackend() {
  const backend = createMemoryBackend({ now: TEST_NOW });
  await backend.signUp('ada@example.com', 'password1');
  return backend;
}

describe('AppRoutes', () => {
  it('logout con errore di rete: si torna comunque all’accesso', async () => {
    const base = await loggedBackend();
    const backend = {
      ...base,
      signOut: async () => {
        await base.signOut();
        throw new BackendError('network');
      },
    };
    const { user } = renderWithApp(<AppRoutes />, { backend, route: '/profile' });
    await user.click(await screen.findByRole('button', { name: 'Esci' }));
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });

  it('senza login porta alla pagina di accesso', async () => {
    renderWithApp(<AppRoutes />, { route: '/stats' });
    expect(await screen.findByRole('heading', { name: 'Habit tracker' })).toBeInTheDocument();
  });

  it('da loggato mostra la navbar e cambia tab', async () => {
    const { user } = renderWithApp(<AppRoutes />, { backend: await loggedBackend() });
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Statistiche' }));
    expect(await screen.findByRole('tab', { name: 'Settimana' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Statistiche' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await user.click(screen.getByRole('link', { name: 'Profilo' }));
    expect(await screen.findByText('ada@example.com')).toBeInTheDocument();
  });

  it('logout dal profilo torna all’accesso', async () => {
    const { user } = renderWithApp(<AppRoutes />, {
      backend: await loggedBackend(),
      route: '/profile',
    });
    await user.click(await screen.findByRole('button', { name: 'Esci' }));
    expect(await screen.findByRole('tab', { name: 'Accedi' })).toBeInTheDocument();
  });

  it('dopo il logout, il nuovo accesso porta alla home', async () => {
    const { user } = renderWithApp(<AppRoutes />, {
      backend: await loggedBackend(),
      route: '/profile',
    });
    await user.click(await screen.findByRole('button', { name: 'Esci' }));
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });

  it('da loggato /login rimanda alla home', async () => {
    renderWithApp(<AppRoutes />, { backend: await loggedBackend(), route: '/login' });
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });

  it('rotta sconosciuta → home', async () => {
    renderWithApp(<AppRoutes />, { backend: await loggedBackend(), route: '/boh' });
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
  });
});
