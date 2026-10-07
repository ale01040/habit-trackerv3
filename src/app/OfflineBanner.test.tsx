import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  afterEach(() => vi.restoreAllMocks());

  it('appare quando la rete cade e sparisce quando torna', () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(/nessuna connessione/i)).not.toBeInTheDocument();
    online.mockReturnValue(false);
    act(() => void window.dispatchEvent(new Event('offline')));
    expect(screen.getByText(/nessuna connessione/i)).toBeInTheDocument();
    online.mockReturnValue(true);
    act(() => void window.dispatchEvent(new Event('online')));
    expect(screen.queryByText(/nessuna connessione/i)).not.toBeInTheDocument();
  });
});
