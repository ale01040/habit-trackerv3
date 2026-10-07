import { Check, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { HabitIcon } from '../../components/HabitIcon';
import type { Habit } from '../../domain/types';
import { shouldToggleFromSwipe } from './swipe';

export function HabitRow({
  habit,
  done,
  streak,
  editable,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  streak: number;
  editable: boolean;
  onToggle(): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const nameClass = `font-medium ${done ? 'text-muted' : ''}`;

  return (
    <motion.li
      layout
      layoutId={habit.id}
      aria-label={habit.name}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="relative overflow-hidden rounded-2xl"
    >
      <div
        aria-hidden
        className={`absolute inset-0 flex items-center justify-between px-5 text-white ${
          done ? 'bg-muted' : 'bg-success'
        }`}
      >
        <Check size={22} />
        <Check size={22} />
      </div>
      <motion.div
        ref={rowRef}
        drag={editable ? 'x' : false}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragSnapToOrigin
        onDragEnd={(_, info) => {
          if (shouldToggleFromSwipe(info.offset.x, rowRef.current?.offsetWidth ?? 0)) onToggle();
        }}
        className={`relative flex items-center gap-2 bg-surface py-1.5 pr-4 pl-1.5 shadow-sm select-none`}
      >
        <button
          type="button"
          aria-pressed={done}
          aria-label={
            done ? `Togli la spunta a «${habit.name}»` : `Segna «${habit.name}» come fatta`
          }
          disabled={!editable}
          onClick={onToggle}
          className="flex h-12 w-12 shrink-0 items-center justify-center disabled:cursor-not-allowed"
        >
          <motion.span
            animate={{ scale: done ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.25 }}
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
              done ? 'border-success bg-success text-white' : 'border-line'
            }`}
          >
            {done && <Check size={16} strokeWidth={3} aria-hidden />}
          </motion.span>
        </button>
        <HabitIcon name={habit.icon} className={done ? 'text-muted' : 'text-primary'} />
        {habit.description ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="flex min-h-11 flex-1 flex-col justify-center text-left"
          >
            <span className={nameClass}>{habit.name}</span>
            {expanded && <span className="text-sm text-muted">{habit.description}</span>}
          </button>
        ) : (
          <span className={`flex min-h-11 flex-1 items-center ${nameClass}`}>{habit.name}</span>
        )}
        {streak > 0 && (
          <span
            role="img"
            aria-label={`Streak ${streak} giorni`}
            className="tabular flex items-center gap-0.5 text-sm font-semibold"
          >
            <Flame size={16} className="text-streak" fill="currentColor" aria-hidden />
            {streak}
          </span>
        )}
      </motion.div>
    </motion.li>
  );
}
