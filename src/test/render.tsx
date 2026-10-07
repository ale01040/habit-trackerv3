import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { AppProviders, createQueryClient } from '../app/providers';
import type { Backend } from '../data/backend';
import { createMemoryBackend } from '../data/memoryBackend';

export const TEST_NOW = () => new Date(2026, 9, 7, 12, 0);
export const TEST_TODAY = '2026-10-07';

export function renderWithApp(
  ui: ReactElement,
  {
    backend = createMemoryBackend({ now: TEST_NOW }),
    route = '/',
  }: { backend?: Backend; route?: string } = {},
) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: 0 },
    mutations: { retry: 0 },
  });
  const user = userEvent.setup();
  const result = render(
    <AppProviders backend={backend} queryClient={queryClient} now={TEST_NOW}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
  return { ...result, backend, queryClient, user };
}
