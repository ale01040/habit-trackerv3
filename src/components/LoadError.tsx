import { WifiOff } from 'lucide-react';

/** Caricamento fallito: mai mostrare un account "vuoto" al posto dei dati. */
export function LoadError({ onRetry }: { onRetry(): void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-6 text-center shadow-sm"
    >
      <WifiOff size={28} className="text-muted" aria-hidden />
      <p className="font-semibold">Impossibile caricare i tuoi dati</p>
      <p className="text-sm text-muted">Controlla la connessione: i tuoi dati sono al sicuro.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 min-h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent"
      >
        Riprova
      </button>
    </div>
  );
}
