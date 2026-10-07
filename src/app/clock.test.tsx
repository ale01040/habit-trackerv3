import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClockProvider, useToday } from './clock';

function Show() {
  return <p>{useToday()}</p>;
}

describe('useToday', () => {
  it('avanza a mezzanotte e al ritorno in primo piano', () => {
    vi.useFakeTimers();
    let current = new Date(2026, 9, 7, 23, 59, 30);
    render(
      <ClockProvider now={() => current}>
        <Show />
      </ClockProvider>,
    );
    expect(screen.getByText('2026-10-07')).toBeInTheDocument();
    current = new Date(2026, 9, 8, 0, 0, 30);
    act(() => void vi.advanceTimersByTime(60_000));
    expect(screen.getByText('2026-10-08')).toBeInTheDocument();
    current = new Date(2026, 9, 9, 8, 0);
    act(() => void document.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByText('2026-10-09')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
