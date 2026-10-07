import { act, render, screen, waitFor } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createMemoryBackend } from '../data/memoryBackend';
import { AppProviders, createQueryClient, useAuth, useBackend } from './providers';

function Probe() {
  const { user, loading } = useAuth();
  const backend = useBackend();
  const { data } = useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.resolve('cached'),
    enabled: !!user,
  });
  if (loading) return <p>caricamento</p>;
  return (
    <p>
      {user ? user.email : 'anonimo'} {backend.kind} {data ?? 'vuoto'}
    </p>
  );
}

describe('AppProviders', () => {
  it('segue login e logout e svuota la cache al logout', async () => {
    const backend = createMemoryBackend();
    const queryClient = createQueryClient();
    render(
      <AppProviders backend={backend} queryClient={queryClient}>
        <Probe />
      </AppProviders>,
    );
    expect(await screen.findByText(/anonimo memory/)).toBeInTheDocument();
    await act(() => backend.signUp('ada@example.com', 'password1'));
    expect(await screen.findByText('ada@example.com memory cached')).toBeInTheDocument();
    await act(() => backend.signOut());
    await waitFor(() => expect(queryClient.getQueryData(['probe'])).toBeUndefined());
    expect(screen.getByText(/anonimo/)).toBeInTheDocument();
  });

  it('useBackend fuori dal provider lancia un errore chiaro', () => {
    function Bad() {
      useBackend();
      return null;
    }
    expect(() => render(<Bad />)).toThrow(/BackendProvider/);
  });
});
