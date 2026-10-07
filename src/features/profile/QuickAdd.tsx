import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { errorMessage } from '../../data/errors';
import { useHabitActions } from '../../data/queries';
import { DEFAULT_ICON } from '../../domain/icons';
import { isActive } from '../../domain/schedule';
import { ALL_WEEKDAYS, type Habit } from '../../domain/types';
import { NAME_ERROR_MESSAGES, validateHabitName } from '../../domain/validation';

export function QuickAdd({ habits }: { habits: readonly Habit[] }) {
  const actions = useHabitActions();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pastDuplicate, setPastDuplicate] = useState<Habit | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPastDuplicate(null);
    const result = validateHabitName(name, habits);
    if (!result.ok) {
      const duplicate = habits.find((h) => h.id === result.duplicateOf);
      if (duplicate && !isActive(duplicate)) {
        setPastDuplicate(duplicate);
        setError('È tra le abitudini passate.');
      } else setError(NAME_ERROR_MESSAGES[result.error]);
      return;
    }
    setBusy(true);
    try {
      await actions.create({
        name: result.value,
        description: null,
        icon: DEFAULT_ICON,
        weekdays: ALL_WEEKDAYS,
      });
      setName('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function reactivate(habit: Habit) {
    setBusy(true);
    try {
      await actions.reactivate(habit);
      setName('');
      setError(null);
      setPastDuplicate(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-surface p-1.5 shadow-sm">
        <input
          aria-label="Nuova abitudine"
          placeholder="Nuova abitudine…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          enterKeyHint="done"
          maxLength={60}
          className="min-h-11 flex-1 bg-transparent px-3 text-base outline-none"
        />
        <button
          type="submit"
          aria-label="Aggiungi"
          disabled={busy}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-on-accent disabled:opacity-50"
        >
          <Plus size={22} aria-hidden />
        </button>
      </div>
      {error && (
        <p role="alert" className="px-2 text-sm text-alert">
          {error}
          {pastDuplicate && (
            <button
              type="button"
              onClick={() => reactivate(pastDuplicate)}
              className="ml-2 min-h-11 font-semibold text-accent"
            >
              Riattiva «{pastDuplicate.name}»
            </button>
          )}
        </p>
      )}
    </form>
  );
}
