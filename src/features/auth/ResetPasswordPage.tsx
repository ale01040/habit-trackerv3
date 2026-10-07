import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useBackend } from '../../app/providers';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { errorMessage } from '../../data/errors';

export function ResetPasswordPage() {
  const backend = useBackend();
  const navigate = useNavigate();
  const location = useLocation();
  // Supabase rimanda qui con #error=… quando il link è scaduto o già usato
  const linkError = new URLSearchParams(location.hash.slice(1)).has('error');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await backend.updatePassword(password);
      navigate('/', { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 px-6 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-10">
      <h1 className="text-2xl font-bold">Nuova password</h1>
      {linkError ? (
        <div className="flex flex-col gap-3">
          <p role="alert">Il link è scaduto o non è più valido.</p>
          <Link
            to="/login"
            state={{ mode: 'forgot' }}
            className="flex min-h-11 items-center font-semibold text-accent"
          >
            Richiedi un nuovo link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <TextField
            label="Nuova password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            Salva password
          </Button>
        </form>
      )}
    </main>
  );
}
