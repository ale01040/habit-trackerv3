import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createMemoryBackend } from '../../data/memoryBackend';
import { renderWithApp, TEST_NOW } from '../../test/render';
import { LoginPage } from './LoginPage';

function setup(backend = createMemoryBackend({ now: TEST_NOW })) {
  return renderWithApp(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>home</p>} />
    </Routes>,
    { backend, route: '/login' },
  );
}

describe('LoginPage', () => {
  it('registra un nuovo utente e porta alla home', async () => {
    const { user, backend } = setup();
    await user.click(screen.getByRole('tab', { name: 'Registrati' }));
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Crea account' }));
    expect(await screen.findByText('home')).toBeInTheDocument();
    expect((await backend.getUser())?.email).toBe('ada@example.com');
  });

  it('mostra l’errore con credenziali sbagliate', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email o password non corretti');
  });

  it('accede con un account esistente', async () => {
    const backend = createMemoryBackend({ now: TEST_NOW });
    await backend.signUp('ada@example.com', 'password1');
    await backend.signOut();
    const { user } = setup(backend);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Accedi' }));
    expect(await screen.findByText('home')).toBeInTheDocument();
  });

  it('password dimenticata invia il link', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Password dimenticata?' }));
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Invia link' }));
    expect(await screen.findByText(/ti abbiamo inviato un link/i)).toBeInTheDocument();
  });

  it('avvisa della modalità demo col backend in memoria', () => {
    setup();
    expect(screen.getByText(/modalità demo/i)).toBeInTheDocument();
  });
});
