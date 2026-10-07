import { motion } from 'motion/react';
import { formatPercent } from '../../domain/stats';

const SIZE = 136;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ done, scheduled }: { done: number; scheduled: number }) {
  const ratio = scheduled === 0 ? 0 : done / scheduled;
  const label =
    scheduled === 0
      ? 'Nessuna abitudine prevista'
      : `Completamento ${formatPercent(ratio)}, ${done} su ${scheduled}`;
  return (
    <div
      role="img"
      aria-label={label}
      className="relative mx-auto"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg width={SIZE} height={SIZE} className="-rotate-90" aria-hidden>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={STROKE}
        />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={false}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - ratio), opacity: ratio === 0 ? 0 : 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 120 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
        <span className="tabular text-3xl font-bold">
          {scheduled === 0 ? '—' : formatPercent(ratio)}
        </span>
        <span className="tabular text-sm text-muted">
          {done}/{scheduled}
        </span>
      </div>
    </div>
  );
}
