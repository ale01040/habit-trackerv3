import { WEEKDAY_NAMES, WEEKDAY_SHORT } from '../domain/format';
import { ALL_WEEKDAYS, type Weekday } from '../domain/types';

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: readonly Weekday[];
  onChange(days: Weekday[]): void;
}) {
  function toggle(day: Weekday) {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange([...next].sort((a, b) => a - b));
  }
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Giorni</legend>
      <div className="grid grid-cols-7 gap-1.5">
        {ALL_WEEKDAYS.map((day) => {
          const selected = value.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-label={WEEKDAY_NAMES[day]}
              aria-pressed={selected}
              onClick={() => toggle(day)}
              className={`flex min-h-11 items-center justify-center rounded-full text-sm font-semibold transition ${
                selected ? 'bg-accent text-on-accent' : 'bg-bg text-muted'
              }`}
            >
              {WEEKDAY_SHORT[day]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
