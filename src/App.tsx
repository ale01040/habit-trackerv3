import { useState } from 'react';
import { BrowserRouter } from 'react-router';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AppProviders } from './app/providers';
import { AppRoutes } from './app/routes';
import type { Backend } from './data/backend';
import { createBackend } from './data/createBackend';

function ConfigMissing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">App non configurata</h1>
      <p className="text-muted">
        Mancano le variabili VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Aggiungile su Vercel e
        ripubblica.
      </p>
    </main>
  );
}

// Dentro l'ErrorBoundary: anche la creazione del backend può fallire (storage bloccato).
function AppWithBackend({ injected }: { injected?: Backend }) {
  const [backend] = useState(() => injected ?? createBackend());
  if (!backend) return <ConfigMissing />;
  return (
    <AppProviders backend={backend}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}

export default function App({ backend }: { backend?: Backend }) {
  return (
    <ErrorBoundary>
      <AppWithBackend injected={backend} />
    </ErrorBoundary>
  );
}
