import { motion } from 'motion/react';
import { isoWeekday } from '../../domain/dates';
import { formatLongDate, WEEKDAY_SHORT } from '../../domain/format';
import { formatPercent, percentBand, type DayStat } from '../../domain/stats';
import { BAND_BG } from './bands';

const MONTH_TICKS = new Set([1, 8, 15, 22, 29]);

export function DayBars({ days, kind }: { days: DayStat[]; kind: 'week' | 'month' }) {
  return (
    <ul
      aria-label="Andamento giornaliero"
      className={`flex h-36 items-end ${kind === 'week' ? 'gap-2' : 'gap-0.5'}`}
    >
      {days.map(({ date, completion, future }) => {
        const band = percentBand(completion.ratio);
        const label = `${formatLongDate(date)}: ${future ? 'futuro' : formatPercent(completion.ratio)}`;
        const dayNumber = Number(date.slice(8));
        const tick =
          kind === 'week'
            ? WEEKDAY_SHORT[isoWeekday(date)]
            : MONTH_TICKS.has(dayNumber)
              ? dayNumber
              : '';
        return (
          <li
            key={date}
            aria-label={label}
            className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div
              className={`relative w-full flex-1 overflow-hidden rounded-md ${
                future ? 'bg-line/30' : 'bg-line/60'
              }`}
            >
              {band && (
                <motion.div
                  className={`absolute inset-x-0 bottom-0 rounded-md ${BAND_BG[band]}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((completion.ratio ?? 0) * 100, 4)}%` }}
                  transition={{ type: 'spring', damping: 22, stiffness: 140 }}
                />
              )}
            </div>
            <span aria-hidden className="tabular h-3 text-[10px] leading-3 text-muted">
              {tick}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
