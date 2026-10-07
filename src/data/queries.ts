import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useToday } from '../app/clock';
import { useBackend } from '../app/providers';
import { useToast } from '../app/toast';
import { currentWeekdays } from '../domain/schedule';
import { checkinKey, type Checkins, type DateStr, type Habit, type Weekday } from '../domain/types';
import type { CheckinRow, HabitPatch, NewHabit } from './backend';
import { errorMessage } from './errors';

export const queryKeys = {
  habits: ['habits'] as const,
  checkins: ['checkins'] as const,
};

const EMPTY: Checkins = new Set();
const toCheckinSet = (rows: CheckinRow[]): Checkins =>
  new Set(rows.map((r) => checkinKey(r.habitId, r.date)));

export function useHabits() {
  const backend = useBackend();
  return useQuery({ queryKey: queryKeys.habits, queryFn: () => backend.listHabits() });
}

export function useCheckins() {
  const backend = useBackend();
  const query = useQuery({
    queryKey: queryKeys.checkins,
    queryFn: () => backend.listCheckins(),
    select: toCheckinSet,
  });
  return { ...query, checkins: query.data ?? EMPTY };
}

export interface ToggleVars {
  habitId: string;
  date: DateStr;
  done: boolean;
}

const TOGGLE_KEY = ['toggle-checkin'] as const;

export function useToggleCheckin() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const toast = useToast();
  // Richieste sulla stessa spunta in fila: l'ultima vince anche se la rete le riordina.
  const queues = useRef(new Map<string, Promise<unknown>>());
  const othersPending = () => queryClient.isMutating({ mutationKey: TOGGLE_KEY }) > 1;

  const mutation = useMutation({
    mutationKey: TOGGLE_KEY,
    mutationFn: ({ habitId, date, done }: ToggleVars) => {
      const key = checkinKey(habitId, date);
      const previous = queues.current.get(key) ?? Promise.resolve();
      const next = previous
        .catch(() => undefined)
        .then(() =>
          done ? backend.addCheckin(habitId, date) : backend.removeCheckin(habitId, date),
        );
      queues.current.set(key, next);
      void next
        .catch(() => undefined)
        .then(() => queues.current.get(key) === next && queues.current.delete(key));
      return next;
    },
    onMutate: async ({ habitId, date, done }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.checkins });
      const previous = queryClient.getQueryData<CheckinRow[]>(queryKeys.checkins);
      queryClient.setQueryData<CheckinRow[]>(queryKeys.checkins, (old = []) => {
        const rest = old.filter((r) => !(r.habitId === habitId && r.date === date));
        return done ? [...rest, { habitId, date }] : rest;
      });
      return { previous };
    },
    onError: (error, vars, context) => {
      // con altri tap in corso lo snapshot è vecchio: ci pensa la rilettura
      if (!othersPending()) queryClient.setQueryData(queryKeys.checkins, context?.previous);
      toast.show(errorMessage(error), { label: 'Riprova', onClick: () => mutation.mutate(vars) });
    },
    onSettled: () => {
      // a fine raffica riallinea lo schermo con il server
      if (!othersPending()) void queryClient.invalidateQueries({ queryKey: queryKeys.checkins });
    },
  });
  return mutation;
}

export function useHabitActions() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const today = useToday();

  async function refresh(alsoCheckins = false) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.habits }),
      alsoCheckins ? queryClient.invalidateQueries({ queryKey: queryKeys.checkins }) : null,
    ]);
  }

  return {
    async create(input: NewHabit) {
      const id = await backend.createHabit(input, today);
      await refresh();
      return id;
    },
    async update(habit: Habit, patch: HabitPatch, weekdays: readonly Weekday[] | null) {
      try {
        await backend.updateHabit(habit.id, patch);
        if (weekdays) {
          try {
            await backend.updateSchedule(habit.id, weekdays, today);
          } catch (e) {
            // tutto o niente: se i giorni non si salvano, ripristina nome, descrizione e icona
            const { name, description, icon } = habit;
            await backend.updateHabit(habit.id, { name, description, icon }).catch(() => undefined);
            throw e;
          }
        }
      } finally {
        await refresh();
      }
    },
    async archive(id: string) {
      try {
        await backend.archiveHabit(id, today);
      } finally {
        await refresh(true);
      }
    },
    async reactivate(habit: Habit) {
      try {
        await backend.reactivateHabit(habit.id, currentWeekdays(habit), today);
      } finally {
        await refresh();
      }
    },
    async reorder(ids: readonly string[]) {
      queryClient.setQueryData<Habit[]>(queryKeys.habits, (old) =>
        old
          ?.map((h) => (ids.includes(h.id) ? { ...h, position: ids.indexOf(h.id) } : h))
          .sort((a, b) => a.position - b.position),
      );
      try {
        await backend.reorderHabits(ids);
      } finally {
        await refresh();
      }
    },
  };
}
