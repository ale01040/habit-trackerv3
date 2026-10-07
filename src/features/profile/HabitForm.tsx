import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { IconPicker } from '../../components/IconPicker';
import { TextField } from '../../components/TextField';
import { WeekdayPicker } from '../../components/WeekdayPicker';
import { BackendError, errorMessage } from '../../data/errors';
import { useHabitActions } from '../../data/queries';
import { DEFAULT_ICON } from '../../domain/icons';
import { currentWeekdays, isActive } from '../../domain/schedule';
import { ALL_WEEKDAYS, type Habit, type Weekday } from '../../domain/types';
import {
  DESCRIPTION_MAX,
  NAME_ERROR_MESSAGES,
  normalizeWeekdays,
  validateDescription,
  validateHabitName,
} from '../../domain/validation';

const sameDays = (a: readonly Weekday[], b: readonly Weekday[]) => a.join() === b.join();

export function HabitForm({
  habit,
  habits,
  onDone,
}: {
  habit?: Habit;
  habits: readonly Habit[];
  onDone(): void;
}) {
  const actions = useHabitActions();
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_ICON);
  const [initialDays] = useState<Weekday[]>(() =>
    habit ? currentWeekdays(habit) : [...ALL_WEEKDAYS],
  );
  const [weekdays, setWeekdays] = useState<Weekday[]>(initialDays);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNameError(null);
    setFormError(null);
    const nameResult = validateHabitName(name, habits, habit?.id);
    if (!nameResult.ok) return setNameError(NAME_ERROR_MESSAGES[nameResult.error]);
    const descResult = validateDescription(description);
    if (!descResult.ok) return setFormError(`Descrizione: massimo ${DESCRIPTION_MAX} caratteri`);
    const days = normalizeWeekdays(weekdays);
    if (!days) return setFormError('Scegli almeno un giorno');

    setBusy(true);
    try {
      const patch = { name: nameResult.value, description: descResult.value, icon };
      if (habit) {
        const changedDays = isActive(habit) && !sameDays(days, initialDays) ? days : null;
        await actions.update(habit, patch, changedDays);
      } else {
        await actions.create({ ...patch, weekdays: days });
      }
      onDone();
    } catch (e) {
      if (e instanceof BackendError && e.code === 'duplicate_name') {
        setNameError(NAME_ERROR_MESSAGES.duplicate);
      } else setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!habit) return;
    setBusy(true);
    try {
      await actions.archive(habit.id);
      onDone();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <TextField
        label="Nome"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        autoFocus={!habit}
      />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Descrizione (facoltativa)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-xl border border-line bg-surface px-3 py-2 text-base font-normal text-fg outline-none focus:border-primary"
        />
      </label>
      <IconPicker value={icon} onChange={setIcon} />
      <WeekdayPicker value={weekdays} onChange={setWeekdays} />
      {formError && (
        <p role="alert" className="text-sm text-alert">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {habit ? 'Salva' : 'Crea abitudine'}
      </Button>
      {habit &&
        isActive(habit) &&
        (confirmArchive ? (
          <div className="flex flex-col gap-2 rounded-2xl bg-danger/10 p-3">
            <p className="text-sm">
              «{habit.name}» andrà tra le abitudini passate: lo storico resta e puoi riattivarla.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmArchive(false)}>
                Annulla
              </Button>
              <Button type="button" variant="danger" disabled={busy} onClick={archive}>
                Conferma archiviazione
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-alert"
            onClick={() => setConfirmArchive(true)}
          >
            Archivia
          </Button>
        ))}
    </form>
  );
}
