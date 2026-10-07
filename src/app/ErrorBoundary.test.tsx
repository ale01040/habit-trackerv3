import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('mostra un messaggio e un bottone per ricaricare', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Qualcosa è andato storto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ricarica' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
