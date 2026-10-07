import { Lock } from 'lucide-react';
import { LayoutGroup } from 'motion/react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToday } from '../../app/clock';
import { LoadError } from '../../components/LoadError';
import { useCheckins, useHabits, useToggleCheckin } from '../../data/queries';
import { isEditable } from '../../domain/dates';
import { scheduledHabits } from '../../domain/schedule';
import { currentStreak } from '../../domain/streak';
import { isDone, type DateStr, type Habit } from '../../domain/types';
import { DateHeader } from './DateHeader';
import { HabitRow } from './HabitRow';
import { ProgressRing } from './ProgressRing';
import { parseSelectedDate } from './swipe';

function vibrate() {
  if ('vibrate' in navigator) navigator.vibrate(10);
}

export function HomePage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const date = parseSelectedDate(params.get('d'), today);
  const setDate = (d: DateStr) => setParams(d === today ? {} : { d }, { replace: true });

  const habitsQuery = useHabits();
  const checkinsQuery = useCheckins();
  const { checkins } = checkinsQuery;
  const toggle = useToggleCheckin();

  const habits = habitsQuery.data ?? [];
  const scheduled = scheduledHabits(habits, date);
  const todo = scheduled.filter((h) => !isDone(checkins, h.id, date));
  const done = scheduled.filter((h) => isDone(checkins, h.id, date));
  const editable = isEditable(date, today);
  const loading = habitsQuery.isLoading || checkinsQuery.isLoading;
  const loadError = habitsQuery.isError || checkinsQuery.isError;

  // le streak si ricalcolano solo quando cambiano dati o giorno, non a ogni render
  const streaks = useMemo(
    () => new Map(scheduled.map((h) => [h.id, currentStreak(h, checkins, date, today)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scheduled deriva da habits e date
    [habitsQuery.data, checkins, date, today],
  );

  function retry() {
    void habitsQuery.refetch();
    void checkinsQuery.refetch();
  }

  function onToggle(habit: Habit) {
    vibrate();
    toggle.mutate({ habitId: habit.id, date, done: !isDone(checkins, habit.id, date) });
  }

  const row = (habit: Habit) => (
    <HabitRow
      key={habit.id}
      habit={habit}
      done={isDone(checkins, habit.id, date)}
      streak={streaks.get(habit.id) ?? 0}
      editable={editable}
      onToggle={() => onToggle(habit)}
    />
  );

  return (
    <section className="flex flex-col gap-5">
      <DateHeader date={date} today={today} onChange={setDate} />
      {loadError ? (
        <LoadError onRetry={retry} />
      ) : (
        <ProgressRing done={done.length} scheduled={scheduled.length} />
      )}

      {!editable && (
        <p className="flex items-center justify-center gap-2 rounded-xl bg-line/60 px-3 py-2 text-sm text-muted">
          <Lock size={16} aria-hidden /> Puoi modificare solo gli ultimi 7 giorni
        </p>
      )}

      {loadError ? null : loading ? (
        <ul aria-hidden className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-14 animate-pulse rounded-2xl bg-line/60" />
          ))}
        </ul>
      ) : habits.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-6 text-center">
          <p>Non hai ancora abitudini.</p>
          <Link to="/profile" className="flex min-h-11 items-center font-semibold text-accent">
            Crea la prima
          </Link>
        </div>
      ) : scheduled.length === 0 ? (
        <p className="rounded-2xl bg-surface p-6 text-center text-muted">
          Nessuna abitudine prevista per questo giorno.
        </p>
      ) : (
        <LayoutGroup>
          {todo.length > 0 ? (
            <ul aria-label="Da fare" className="flex flex-col gap-2">
              {todo.map(row)}
            </ul>
          ) : (
            <p className="text-center text-sm font-medium text-fg">Tutto fatto! 🎉</p>
          )}
          {done.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="mt-2 text-sm font-semibold text-muted">Completate ({done.length})</h2>
              <ul aria-label="Completate" className="flex flex-col gap-2">
                {done.map(row)}
              </ul>
            </section>
          )}
        </LayoutGroup>
      )}
    </section>
  );
}
