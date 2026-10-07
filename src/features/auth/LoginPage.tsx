import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useBackend } from '../../app/providers';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { errorMessage } from '../../data/errors';

type Mode = 'signin' | 'signup' | 'forgot';

export function LoginPage() {
  const backend = useBackend();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; mode?: Mode } | null;
  const from = state?.from ?? '/';
  const [mode, setMode] = useState<Mode>(state?.mode ?? 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'forgot') {
        await backend.requestPasswordReset(email);
        setInfo('Se l’email è registrata, ti abbiamo inviato un link per reimpostare la password.');
      } else {
        if (mode === 'signup') await backend.signUp(email, password);
        else await backend.signIn(email, password);
        navigate(from, { replace: true });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const submitLabel =
    mode === 'signin' ? 'Accedi' : mode === 'signup' ? 'Crea account' : 'Invia link';

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-8 px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-10">
      <header className="flex flex-col items-center gap-3 text-center">
        <img src="/favicon.svg" alt="" className="h-16 w-16" />
        <h1 className="text-3xl font-bold tracking-tight">Habit tracker</h1>
        <p className="text-muted">Le tue abitudini, un tap alla volta.</p>
      </header>

      {mode !== 'forgot' && (
        <div role="tablist" className="grid grid-cols-2 rounded-xl bg-line/60 p-1">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={`min-h-11 rounded-lg font-semibold transition ${
                mode === m ? 'bg-surface text-fg shadow-sm' : 'text-muted'
              }`}
            >
              {m === 'signin' ? 'Accedi' : 'Registrati'}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {mode !== 'forgot' && (
          <TextField
            label="Password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-alert">
            {error}
          </p>
        )}
        {info && <p className="text-sm text-fg">{info}</p>}
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
        {mode === 'signin' && (
          <Button type="button" variant="ghost" onClick={() => switchMode('forgot')}>
            Password dimenticata?
          </Button>
        )}
        {mode === 'forgot' && (
          <Button type="button" variant="ghost" onClick={() => switchMode('signin')}>
            Torna all’accesso
          </Button>
        )}
      </form>

      {backend.kind === 'memory' && (
        <p className="text-center text-xs text-muted">
          Modalità demo: i dati restano solo su questo dispositivo.
        </p>
      )}
    </main>
  );
}
