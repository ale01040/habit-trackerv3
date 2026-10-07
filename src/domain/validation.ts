import type { Weekday } from './types';

export const NAME_MAX = 40;
export const DESCRIPTION_MAX = 200;

export type NameError = 'empty' | 'too_long' | 'duplicate';

export type NameResult =
  { ok: true; value: string } | { ok: false; error: NameError; duplicateOf?: string };

export const NAME_ERROR_MESSAGES: Record<NameError, string> = {
  empty: 'Il nome è obbligatorio',
  too_long: `Massimo ${NAME_MAX} caratteri`,
  duplicate: 'Esiste già un’abitudine con questo nome',
};

/** Lunghezza in caratteri Unicode, come char_length di Postgres. */
const charLength = (value: string) => [...value].length;

export function normalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateHabitName(
  raw: string,
  existing: readonly { id: string; name: string }[],
  selfId?: string,
): NameResult {
  const value = normalizeName(raw);
  if (value === '') return { ok: false, error: 'empty' };
  if (charLength(value) > NAME_MAX) return { ok: false, error: 'too_long' };
  const key = value.toLowerCase();
  const duplicate = existing.find((h) => h.id !== selfId && h.name.toLowerCase() === key);
  if (duplicate) return { ok: false, error: 'duplicate', duplicateOf: duplicate.id };
  return { ok: true, value };
}

export function validateDescription(
  raw: string,
): { ok: true; value: string | null } | { ok: false; error: 'too_long' } {
  const value = raw.trim();
  if (charLength(value) > DESCRIPTION_MAX) return { ok: false, error: 'too_long' };
  return { ok: true, value: value === '' ? null : value };
}

export function normalizeWeekdays(days: readonly number[]): Weekday[] | null {
  if (days.length === 0) return null;
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) return null;
  return [...new Set(days)].sort((a, b) => a - b) as Weekday[];
}
