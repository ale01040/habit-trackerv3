import { parseDateStr } from '../../domain/dates';
import type { DateStr } from '../../domain/types';

export const SWIPE_THRESHOLD = 0.35;

export function shouldToggleFromSwipe(
  offsetX: number,
  width: number,
  threshold = SWIPE_THRESHOLD,
): boolean {
  return width > 0 && Math.abs(offsetX) >= width * threshold;
}

/** Data dalla query string: valida e non futura, altrimenti oggi. */
export function parseSelectedDate(raw: string | null, today: DateStr): DateStr {
  if (!raw) return today;
  try {
    parseDateStr(raw);
  } catch {
    return today;
  }
  return raw > today ? today : raw;
}
