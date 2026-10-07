import { Flame, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { HabitIcon } from '../../components/HabitIcon';
import { formatPercent, percentBand, rangeCompletion } from '../../domain/stats';
import { bestStreak, currentStreak } from '../../domain/streak';
import type { Checkins, DateRange, DateStr, Habit } from '../../domain/types';
import { BAND_BG } from './bands';

export function HabitStatsList({
  habits,
  checkins,
  range,
  today,
}: {
  habits: readonly Habit[];
  checkins: Checkins;
  range: DateRange;
  today: DateStr;
}) {
  // le streak dipendono solo da dati e oggi: cambiare periodo non le ricalcola
  const streaks = useMemo(
    () =>
      new Map(
        habits.map((h) => [
          h.id,
          {
            current: currentStreak(h, checkins, today, today),
            best: bestStreak(h, checkins, today),
          },
        ]),
      ),
    [habits, checkins, today],
  );

  return (
    <ul aria-label="Per abitudine" className="flex flex-col gap-2">
      {habits.map((h) => {
        const c = rangeCompletion([h], checkins, range, today);
        const band = percentBand(c.ratio);
        const { current, best } = streaks.get(h.id) ?? { current: 0, best: 0 };
        return (
          <li key={h.id} aria-label={h.name} className="rounded-2xl bg-surface p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <HabitIcon name={h.icon} className="text-primary" />
              <span className="flex-1 truncate font-medium">{h.name}</span>
              <span className="tabular text-sm font-semibold">{formatPercent(c.ratio)}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line/60">
              {band && (
                <motion.div
                  className={`h-full rounded-full ${BAND_BG[band]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(c.ratio ?? 0) * 100}%` }}
                />
              )}
            </div>
            <div className="tabular mt-2 flex items-center justify-between text-xs text-muted">
              <span>
                {c.done}/{c.scheduled}
              </span>
              <span
                role="img"
                aria-label={`Streak attuale ${current}, migliore ${best}`}
                className="flex items-center gap-2"
              >
                <span className="flex items-center gap-0.5" aria-hidden>
                  <Flame size={14} className="text-streak" fill="currentColor" /> {current}
                </span>
                <span className="flex items-center gap-0.5" aria-hidden>
                  <Trophy size={14} /> {best}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
