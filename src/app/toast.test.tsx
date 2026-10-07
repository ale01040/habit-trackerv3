import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './toast';

function Trigger({ onRetry }: { onRetry: () => void }) {
  const toast = useToast();
  return (
    <button onClick={() => toast.show('Non salvato', { label: 'Riprova', onClick: onRetry })}>
      apri
    </button>
  );
}

describe('toast', () => {
  it('mostra il messaggio ed esegue l’azione', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger onRetry={onRetry} />
      </ToastProvider>,
    );
    await user.click(screen.getByText('apri'));
    expect(screen.getByRole('status')).toHaveTextContent('Non salvato');
    await user.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('sparisce da solo dopo la durata', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider duration={50}>
        <Trigger onRetry={() => {}} />
      </ToastProvider>,
    );
    await user.click(screen.getByText('apri'));
    // la comparsa è verificata dal test precedente; qui solo la scomparsa.
    // l'animazione di uscita lascia il nodo per qualche frame
    await waitFor(() => expect(screen.queryAllByText('Non salvato')).toHaveLength(0), {
      timeout: 3000,
    });
  });
});
