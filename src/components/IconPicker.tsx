import { HABIT_ICONS } from '../domain/icons';
import { HabitIcon, ICON_LABELS } from './HabitIcon';

export function IconPicker({ value, onChange }: { value: string; onChange(icon: string): void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Icona</legend>
      <div className="grid grid-cols-6 gap-2">
        {HABIT_ICONS.map((name) => {
          const selected = name === value;
          return (
            <button
              key={name}
              type="button"
              aria-label={ICON_LABELS[name]}
              aria-pressed={selected}
              onClick={() => onChange(name)}
              className={`flex aspect-square min-h-11 items-center justify-center rounded-xl transition ${
                selected ? 'bg-accent text-on-accent' : 'bg-bg text-fg'
              }`}
            >
              <HabitIcon name={name} size={22} />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
