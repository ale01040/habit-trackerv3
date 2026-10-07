import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Errore non gestito', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold">Qualcosa è andato storto</h1>
        <p className="text-muted">Ricarica l’app: i tuoi dati sono al sicuro.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent"
        >
          Ricarica
        </button>
      </main>
    );
  }
}
