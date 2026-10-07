import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { todayStr } from '../domain/dates';
import type { DateStr } from '../domain/types';

const defaultNow = () => new Date();
const ClockContext = createContext<() => Date>(defaultNow);

export function ClockProvider({ now, children }: { now?: () => Date; children: ReactNode }) {
  return <ClockContext.Provider value={now ?? defaultNow}>{children}</ClockContext.Provider>;
}

export function useNow(): () => Date {
  return useContext(ClockContext);
}

/** Data locale di oggi; si aggiorna ogni minuto e quando l'app torna in primo piano. */
export function useToday(): DateStr {
  const now = useNow();
  const [today, setToday] = useState(() => todayStr(now()));
  useEffect(() => {
    const refresh = () => setToday(todayStr(now()));
    refresh();
    const id = setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [now]);
  return today;
}
