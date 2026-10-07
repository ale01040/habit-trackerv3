import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createMemoryBackend } from '../../data/memoryBackend';
import { renderWithApp, TEST_NOW } from '../../test/render';
import { LoginPage } from './LoginPage';
import { ResetPasswordPage } from './ResetPasswordPage';

describe('ResetPasswordPage', () => {
  it('link scaduto: spiega e porta a richiederne uno nuovo', async () => {
    const { user } = renderWithApp(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>,
      { route: '/reset-password#error=access_denied&error_code=otp_expired' },
    );
    expect(screen.getByText(/link è scaduto o non è più valido/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Nuova password')).not.toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Richiedi un nuovo link' }));
    expect(await screen.findByRole('button', { name: 'Invia link' })).toBeInTheDocument();
  });

  it('imposta la nuova password', async () => {
    const backend = createMemoryBackend({ now: TEST_NOW });
    await backend.signUp('ada@example.com', 'password1');
    const { user } = renderWithApp(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<p>home</p>} />
      </Routes>,
      { backend, route: '/reset-password' },
    );
    await user.type(screen.getByLabelText('Nuova password'), 'corta');
    await user.click(screen.getByRole('button', { name: 'Salva password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('almeno 8 caratteri');
    await user.clear(screen.getByLabelText('Nuova password'));
    await user.type(screen.getByLabelText('Nuova password'), 'password2');
    await user.click(screen.getByRole('button', { name: 'Salva password' }));
    expect(await screen.findByText('home')).toBeInTheDocument();
    await backend.signOut();
    await expect(backend.signIn('ada@example.com', 'password2')).resolves.toBeTruthy();
  });
});
