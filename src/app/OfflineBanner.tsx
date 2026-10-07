import { WifiOff } from 'lucide-react';
import { useOnline } from './useOnline';

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-[env(safe-area-inset-top)] z-40 flex items-center justify-center gap-2 bg-alert px-4 py-2 text-sm font-medium text-on-alert"
    >
      <WifiOff size={16} aria-hidden />
      Nessuna connessione: le modifiche non verranno salvate
    </div>
  );
}
