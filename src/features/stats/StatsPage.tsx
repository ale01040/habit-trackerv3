import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useToday } from '../../app/clock';
import { LoadError } from '../../components/LoadError';
import { useCheckins, useHabits } from '../../data/queries';
import { eachDay } from '../../domain/dates';
import { formatPeriodLabel } from '../../domain/format';
import {
  dailyStats,
  formatPercent,
  habitsInRange,
  hasNextPeriod,
  percentBand,
  periodRange,
  rangeCompletion,
  shiftPeriod,
  type PeriodKind,
} from '../../domain/stats';
import type { DateStr } from '../../domain/types';
import { parseSelectedDate } from '../home/swipe';
import { BAND_BG, BAND_LABEL } from './bands';
import { DayBars } from './DayBars';
import { HabitGrid } from './HabitGrid';
import { HabitStatsList } from './HabitStatsList';
import { PeriodPicker } from './PeriodPicker';

const parseKind = (raw: string | null): PeriodKind =>
  raw === 'day' || raw === 'month' ? raw : 'week';

export function StatsPage() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const kind = parseKind(params.get('p'));
  const date = parseSelectedDate(params.get('d'), today);

  function update(nextKind: PeriodKind, nextDate: DateStr) {
    const next: Record<string, string> = {};
    if (nextKind !== 'week') next.p = nextKind;
    if (nextDate < today) next.d = nextDate;
    setParams(next, { replace: true });
  }

  const habitsQuery = useHabits();
  const checkinsQuery = useCheckins();
  const { data: habits = [], isLoading } = habitsQuery;
  const { checkins } = checkinsQuery;
  const loadError = habitsQuery.isError || checkinsQuery.isError;
  const range = periodRange(kind, date);
  const summary = rangeCompletion(habits, checkins, range, today);
  const band = percentBand(summary.ratio);
  const inRange = useMemo(
    () => habitsInRange(habits, range, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- range deriva da kind e date
    [habits, kind, date, today],
  );

  return (
    <section className="flex flex-col gap-5">
      <PeriodPicker
        kind={kind}
        label={formatPeriodLabel(kind, date, today)}
        hasNext={hasNextPeriod(kind, date, today)}
        onKind={(k) => update(k, date)}
        onShift={(dir) => update(kind, shiftPeriod(kind, date, dir))}
      />

      {loadError ? (
        <LoadError
          onRetry={() => {
            void habitsQuery.refetch();
            void checkinsQuery.refetch();
          }}
        />
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 rounded-3xl bg-surface p-5 shadow-sm">
            <span className="tabular text-5xl font-bold">{formatPercent(summary.ratio)}</span>
            <span className="text-sm text-muted">
              {summary.scheduled > 0
                ? `${summary.done} su ${summary.scheduled} completate`
                : 'Nessuna abitudine prevista'}
            </span>
            {band && (
              <span className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={`h-2.5 w-2.5 rounded-full ${BAND_BG[band]}`} aria-hidden />
                {BAND_LABEL[band]}
              </span>
            )}
          </div>

          {!isLoading && kind !== 'day' && (
            <DayBars days={dailyStats(habits, checkins, range, today)} kind={kind} />
          )}

          {!isLoading && kind === 'month' && inRange.length > 0 && (
            <HabitGrid habits={inRange} days={eachDay(range)} checkins={checkins} today={today} />
          )}

          {inRange.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted">Per abitudine</h2>
              <HabitStatsList habits={inRange} checkins={checkins} range={range} today={today} />
            </section>
          )}
        </>
      )}
    </section>
  );
}
