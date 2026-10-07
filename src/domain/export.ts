import { scheduledHabits } from './schedule';
import { dayCompletion, formatPercent, type Completion } from './stats';
import { currentStreak } from './streak';
import { isDone, type Checkins, type DateStr, type Habit } from './types';

export interface ExportRow {
  name: string;
  done: boolean;
  streak: number;
}

export interface DayExport {
  date: DateStr;
  rows: ExportRow[];
  completion: Completion;
}

export type ExportFormat = 'md' | 'csv';

export function buildDayExport(
  habits: readonly Habit[],
  checkins: Checkins,
  date: DateStr,
  today: DateStr,
): DayExport {
  return {
    date,
    rows: scheduledHabits(habits, date).map((h) => ({
      name: h.name,
      done: isDone(checkins, h.id, date),
      streak: currentStreak(h, checkins, date, today),
    })),
    completion: dayCompletion(habits, checkins, date),
  };
}

export function toMarkdown(e: DayExport): string {
  const { done, scheduled, ratio } = e.completion;
  const lines = [
    `# ${e.date} — Habit tracker`,
    `Completamento: ${formatPercent(ratio)} (${done}/${scheduled})`,
    '',
  ];
  if (e.rows.length === 0) lines.push('_Nessuna abitudine prevista._');
  for (const r of e.rows) {
    lines.push(`- [${r.done ? 'x' : ' '}] ${r.name}${r.streak > 0 ? ` 🔥${r.streak}` : ''}`);
  }
  return lines.join('\n') + '\n';
}

function csvCell(value: string): string {
  // Evita che Excel interpreti il testo come formula.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(e: DayExport): string {
  const lines = [
    'data,abitudine,fatto,streak',
    ...e.rows.map((r) => [e.date, csvCell(r.name), r.done ? '1' : '0', String(r.streak)].join(',')),
  ];
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

export function exportFilename(date: DateStr, format: ExportFormat): string {
  return `habit-tracker-${date}.${format}`;
}
