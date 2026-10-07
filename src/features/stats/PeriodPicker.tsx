import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PeriodKind } from '../../domain/stats';

const KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'day', label: 'Giorno' },
  { kind: 'week', label: 'Settimana' },
  { kind: 'month', label: 'Mese' },
];

const NAV =
  'flex h-11 w-11 items-center justify-center rounded-full text-fg active:bg-line disabled:opacity-30';

export function PeriodPicker({
  kind,
  label,
  hasNext,
  onKind,
  onShift,
}: {
  kind: PeriodKind;
  label: string;
  hasNext: boolean;
  onKind(kind: PeriodKind): void;
  onShift(direction: 1 | -1): void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Periodo"
        className="grid grid-cols-3 rounded-xl bg-line/60 p-1"
      >
        {KINDS.map((k) => (
          <button
            key={k.kind}
            role="tab"
            aria-selected={kind === k.kind}
            onClick={() => onKind(k.kind)}
            className={`min-h-11 rounded-lg text-sm font-semibold transition ${
              kind === k.kind ? 'bg-surface text-fg shadow-sm' : 'text-muted'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Periodo precedente"
          className={NAV}
          onClick={() => onShift(-1)}
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <h1 className="text-xl font-bold">{label}</h1>
        <button
          type="button"
          aria-label="Periodo successivo"
          className={NAV}
          disabled={!hasNext}
          onClick={() => onShift(1)}
        >
          <ChevronRight size={24} aria-hidden />
        </button>
      </div>
    </div>
  );
}
