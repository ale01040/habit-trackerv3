import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../domain/dates';
import { formatDayTitle, formatLongDate } from '../../domain/format';
import type { DateStr } from '../../domain/types';

const NAV_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-full text-fg transition active:bg-line disabled:opacity-30';

export function DateHeader({
  date,
  today,
  onChange,
}: {
  date: DateStr;
  today: DateStr;
  onChange(date: DateStr): void;
}) {
  return (
    <header className="flex flex-col items-center gap-0.5">
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          aria-label="Giorno precedente"
          className={NAV_BUTTON}
          onClick={() => onChange(addDays(date, -1))}
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <div className="relative">
          <h1 className="text-2xl font-bold">{formatDayTitle(date, today)}</h1>
          <input
            type="date"
            aria-label="Scegli la data"
            max={today}
            value={date}
            onClick={(e) => {
              // su desktop il calendario si apre solo dall'icona: aprilo esplicitamente
              try {
                e.currentTarget.showPicker?.();
              } catch {
                // già aperto o non consentito: il campo resta comunque utilizzabile
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              if (value) onChange(value > today ? today : value);
            }}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
        <button
          type="button"
          aria-label="Giorno successivo"
          className={NAV_BUTTON}
          disabled={date >= today}
          onClick={() => onChange(addDays(date, 1))}
        >
          <ChevronRight size={24} aria-hidden />
        </button>
      </div>
      <p className="text-sm text-muted">{formatLongDate(date)}</p>
      {date !== today && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="min-h-11 px-3 text-sm font-semibold text-accent"
        >
          Vai a oggi
        </button>
      )}
    </header>
  );
}
