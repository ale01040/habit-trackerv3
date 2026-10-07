import { ChevronRight, GripVertical, LogOut, Plus } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth, useBackend } from '../../app/providers';
import { useToast } from '../../app/toast';
import { HabitIcon } from '../../components/HabitIcon';
import { LoadError } from '../../components/LoadError';
import { Sheet } from '../../components/Sheet';
import { errorMessage } from '../../data/errors';
import { useHabitActions, useHabits } from '../../data/queries';
import { plural, weekdaysSummary } from '../../domain/format';
import { activeHabits, currentWeekdays, pastHabits } from '../../domain/schedule';
import type { Habit } from '../../domain/types';
import { ExportPanel } from './ExportPanel';
import { HabitForm } from './HabitForm';
import { QuickAdd } from './QuickAdd';

type Editing = { mode: 'create' } | { mode: 'edit'; habit: Habit } | null;

function ActiveRow({ habit, onEdit, onDrop }: { habit: Habit; onEdit(): void; onDrop(): void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className="flex items-center gap-1 rounded-2xl bg-surface pr-2 shadow-sm"
    >
      <button
        type="button"
        aria-label={`Trascina per riordinare «${habit.name}»`}
        onPointerDown={(e) => controls.start(e)}
        className="flex h-14 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted"
      >
        <GripVertical size={18} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Modifica «${habit.name}»`}
        onClick={onEdit}
        className="flex min-h-14 flex-1 items-center gap-3 text-left"
      >
        <HabitIcon name={habit.icon} className="text-primary" />
        <span className="flex flex-1 flex-col">
          <span className="font-medium">{habit.name}</span>
          <span className="text-xs text-muted">{weekdaysSummary(currentWeekdays(habit))}</span>
        </span>
        <ChevronRight size={18} className="text-muted" aria-hidden />
      </button>
    </Reorder.Item>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const backend = useBackend();
  const navigate = useNavigate();
  const toast = useToast();
  const actions = useHabitActions();
  const habitsQuery = useHabits();
  const { data: habits = [], isLoading } = habitsQuery;
  const loadError = habitsQuery.isError;
  const [editing, setEditing] = useState<Editing>(null);
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);

  const active = activeHabits(habits);
  const past = pastHabits(habits);
  const byId = new Map(habits.map((h) => [h.id, h]));
  const order = dragOrder ?? active.map((h) => h.id);

  async function saveOrder() {
    if (!dragOrder) return;
    try {
      await actions.reorder(dragOrder);
    } catch (e) {
      toast.show(errorMessage(e));
    } finally {
      setDragOrder(null);
    }
  }

  async function reactivate(habit: Habit) {
    try {
      await actions.reactivate(habit);
    } catch (e) {
      toast.show(errorMessage(e));
    }
  }

  async function signOut() {
    try {
      await backend.signOut();
    } catch {
      // la sessione locale è comunque chiusa: si torna all'accesso
    } finally {
      // logout volontario: il prossimo accesso riparte dalla home
      navigate('/login', { replace: true, state: null });
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Profilo</h1>
        <p className="text-muted">{user?.email}</p>
        {!isLoading && !loadError && (
          <p className="tabular text-sm font-medium">
            {`${plural(active.length, 'abitudine attiva', 'abitudini attive')} · ${plural(past.length, 'passata', 'passate')}`}
          </p>
        )}
      </header>

      {loadError ? (
        <LoadError onRetry={() => void habitsQuery.refetch()} />
      ) : (
        <>
          <QuickAdd habits={habits} />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Le tue abitudini</h2>
              <button
                type="button"
                aria-label="Nuova abitudine completa"
                onClick={() => setEditing({ mode: 'create' })}
                className="flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent"
              >
                <Plus size={18} aria-hidden /> Nuova
              </button>
            </div>
            {active.length === 0 && !isLoading ? (
              <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
                Nessuna abitudine attiva. Scrivine una qui sopra per iniziare.
              </p>
            ) : (
              <Reorder.Group
                axis="y"
                values={order}
                onReorder={setDragOrder}
                aria-label="Abitudini attive"
                className="flex flex-col gap-2"
              >
                {order.map((id) => {
                  const habit = byId.get(id);
                  return habit ? (
                    <ActiveRow
                      key={id}
                      habit={habit}
                      onEdit={() => setEditing({ mode: 'edit', habit })}
                      onDrop={saveOrder}
                    />
                  ) : null;
                })}
              </Reorder.Group>
            )}
          </section>

          {past.length > 0 && (
            <details className="rounded-2xl bg-surface p-4 shadow-sm">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
                Abitudini passate ({past.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {past.map((habit) => (
                  <li key={habit.id} className="flex items-center gap-3">
                    <HabitIcon name={habit.icon} className="text-muted" />
                    <span className="flex-1 text-muted">{habit.name}</span>
                    <button
                      type="button"
                      aria-label={`Riattiva «${habit.name}»`}
                      onClick={() => reactivate(habit)}
                      className="min-h-11 px-2 text-sm font-semibold text-accent"
                    >
                      Riattiva
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <ExportPanel />
        </>
      )}

      <button
        type="button"
        onClick={signOut}
        className="flex min-h-11 items-center justify-center gap-2 font-semibold text-alert"
      >
        <LogOut size={18} aria-hidden /> Esci
      </button>

      <Sheet
        open={editing !== null}
        title={editing?.mode === 'edit' ? 'Modifica abitudine' : 'Nuova abitudine'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <HabitForm
            key={editing.mode === 'edit' ? editing.habit.id : 'new'}
            habit={editing.mode === 'edit' ? editing.habit : undefined}
            habits={habits}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </section>
  );
}
