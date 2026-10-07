import { useEffect, useRef } from 'react';
import { formatShortDate } from '../../domain/format';
import { dayState, type DayState } from '../../domain/stats';
import type { Checkins, DateStr, Habit } from '../../domain/types';

const CELL: Record<DayState, string> = {
  done: 'bg-success',
  missed: 'border border-line bg-surface',
  off: 'bg-transparent',
  future: 'bg-line/30',
};

const STATE_LABEL: Record<DayState, string> = {
  done: 'fatta',
  missed: 'mancata',
  off: 'non prevista',
  future: 'futura',
};

export function HabitGrid({
  habits,
  days,
  checkins,
  today,
}: {
  habits: readonly Habit[];
  days: readonly DateStr[];
  checkins: Checkins;
  today: DateStr;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // mostra subito la colonna di oggi quando il mese è lungo
  useEffect(() => {
    const box = scroller.current;
    const cell = box?.querySelector<HTMLElement>('[data-today]');
    if (box && cell) box.scrollLeft = cell.offsetLeft - box.clientWidth / 2;
    // dipende dal mese mostrato, non dall'identità dell'array ricreato a ogni render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, days[0], days.length]);

  return (
    <div
      ref={scroller}
      role="region"
      aria-label="Griglia scorrevole del mese"
      tabIndex={0}
      className="overflow-x-auto rounded-2xl bg-surface p-3 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <table className="border-separate border-spacing-[2px]">
        <caption className="sr-only">Griglia del mese: abitudini per giorno</caption>
        <thead>
          <tr>
            <th scope="col" className="sr-only">
              Abitudine
            </th>
            {days.map((d) => {
              const n = Number(d.slice(8));
              return (
                <th
                  key={d}
                  scope="col"
                  data-today={d === today ? '' : undefined}
                  className={`tabular text-[9px] font-normal ${d === today ? 'font-bold text-fg' : 'text-muted'}`}
                >
                  {n % 5 === 1 || d === today ? n : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {habits.map((h) => (
            <tr key={h.id}>
              <th
                scope="row"
                className="max-w-24 truncate pr-2 text-left text-xs font-medium whitespace-nowrap"
              >
                {h.name}
              </th>
              {days.map((d) => {
                const state = dayState(h, checkins, d, today);
                return (
                  <td
                    key={d}
                    aria-label={`${h.name}, ${formatShortDate(d)}: ${STATE_LABEL[state]}`}
                    className={`h-3 w-3 min-w-3 rounded-[3px] ${CELL[state]}`}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
