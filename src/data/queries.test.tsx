import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { AppProviders, createQueryClient } from '../app/providers';
import { seedBackend } from '../test/seed';
import { TEST_NOW, TEST_TODAY } from '../test/render';
import type { Backend } from './backend';
import { BackendError } from './errors';
import { useCheckins, useHabitActions, useHabits, useToggleCheckin } from './queries';

function wrapper(backend: Backend) {
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  return ({ children }: { children: ReactNode }) => (
    <AppProviders backend={backend} queryClient={queryClient} now={TEST_NOW}>
      {children}
    </AppProviders>
  );
}

/** Legge i campi durante il render: TanStack Query notifica solo le proprietà lette. */
function readAll<T extends object>(query: T): T {
  return { ...query };
}

describe('queries', () => {
  it('modifica fallita sui giorni: il nome torna com’era', async () => {
    const base = seedBackend({ habits: [{ id: 'g', name: 'Gym' }] });
    const backend: Backend = {
      ...base,
      updateSchedule: () => Promise.reject(new BackendError('network')),
    };
    const { result } = renderHook(() => ({ h: readAll(useHabits()), a: useHabitActions() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.h.isSuccess).toBe(true));
    const gym = result.current.h.data![0];
    await act(async () => {
      await expect(result.current.a.update(gym, { name: 'Palestra' }, [1])).rejects.toMatchObject({
        code: 'network',
      });
    });
    expect((await base.listHabits())[0].name).toBe('Gym');
  });

  it('carica abitudini e spunte', async () => {
    const backend = seedBackend({
      habits: [{ id: 'w', name: 'Drink water' }],
      checkins: [['w', TEST_TODAY]],
    });
    const { result } = renderHook(() => ({ h: useHabits(), c: useCheckins() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.h.data).toHaveLength(1));
    await waitFor(() => expect(result.current.c.checkins.has(`w|${TEST_TODAY}`)).toBe(true));
  });

  it('toggle ottimistico e persistito', async () => {
    const backend = seedBackend({ habits: [{ id: 'w', name: 'Drink water' }] });
    const { result } = renderHook(() => ({ c: useCheckins(), t: useToggleCheckin() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.c.isSuccess).toBe(true));
    act(() => result.current.t.mutate({ habitId: 'w', date: TEST_TODAY, done: true }));
    await waitFor(() => expect(result.current.c.checkins.has(`w|${TEST_TODAY}`)).toBe(true));
    await waitFor(() => expect(result.current.t.isSuccess).toBe(true));
    expect(await backend.listCheckins()).toEqual([{ habitId: 'w', date: TEST_TODAY }]);
  });

  it('toggle fallito → rollback', async () => {
    const base = seedBackend({ habits: [{ id: 'w', name: 'Drink water' }] });
    const backend: Backend = {
      ...base,
      addCheckin: () => Promise.reject(new BackendError('network')),
    };
    const { result } = renderHook(() => ({ c: useCheckins(), t: useToggleCheckin() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.c.isSuccess).toBe(true));
    act(() => result.current.t.mutate({ habitId: 'w', date: TEST_TODAY, done: true }));
    await waitFor(() => expect(result.current.t.isError).toBe(true));
    expect(result.current.c.checkins.size).toBe(0);
  });

  it('tap rapidi sulla stessa abitudine: server e schermo seguono l’ultimo tap', async () => {
    const base = seedBackend({ habits: [{ id: 'w', name: 'Drink water' }] });
    const backend: Backend = {
      ...base,
      // la richiesta di aggiunta è lenta, quella di rimozione immediata
      addCheckin: async (habitId, date) => {
        await new Promise((r) => setTimeout(r, 60));
        return base.addCheckin(habitId, date);
      },
    };
    const { result } = renderHook(() => ({ c: useCheckins(), t: useToggleCheckin() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.c.isSuccess).toBe(true));
    act(() => {
      result.current.t.mutate({ habitId: 'w', date: TEST_TODAY, done: true });
      result.current.t.mutate({ habitId: 'w', date: TEST_TODAY, done: false });
    });
    await new Promise((r) => setTimeout(r, 300));
    expect(await base.listCheckins()).toEqual([]);
    await waitFor(() => expect(result.current.c.checkins.size).toBe(0));
  });

  it('azioni sulle abitudini aggiornano la cache', async () => {
    const backend = seedBackend();
    const { result } = renderHook(() => ({ h: readAll(useHabits()), a: useHabitActions() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.h.isSuccess).toBe(true));
    let id = '';
    await act(async () => {
      id = await result.current.a.create({
        name: 'Gym',
        description: null,
        icon: 'dumbbell',
        weekdays: [1, 3],
      });
    });
    // le notifiche di TanStack Query arrivano in un tick successivo
    await waitFor(() => expect(result.current.h.data?.map((h) => h.name)).toEqual(['Gym']));
    const gym = result.current.h.data![0];
    await act(() => result.current.a.update(gym, { name: 'Palestra' }, [1, 3, 5]));
    await waitFor(() => expect(result.current.h.data?.[0]).toMatchObject({ id, name: 'Palestra' }));
    expect(result.current.h.data?.[0].periods[0].weekdays).toEqual([1, 3, 5]);
    await act(() => result.current.a.archive(id));
    await waitFor(() => expect(result.current.h.data?.[0].periods).toEqual([]));
    await act(() => result.current.a.reactivate(result.current.h.data![0]));
    await waitFor(() => expect(result.current.h.data?.[0].periods).toHaveLength(1));
  });

  it('riordino', async () => {
    const backend = seedBackend({
      habits: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
    });
    const { result } = renderHook(() => ({ h: readAll(useHabits()), a: useHabitActions() }), {
      wrapper: wrapper(backend),
    });
    await waitFor(() => expect(result.current.h.isSuccess).toBe(true));
    await act(() => result.current.a.reorder(['b', 'a']));
    await waitFor(() => expect(result.current.h.data?.map((h) => h.id)).toEqual(['b', 'a']));
  });
});
