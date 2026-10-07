import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateHeader } from './DateHeader';

const today = '2026-10-07';

describe('DateHeader', () => {
  it('tap sul titolo apre il calendario anche su desktop', async () => {
    const showPicker = vi.fn();
    Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
      configurable: true,
      value: showPicker,
    });
    render(<DateHeader date={today} today={today} onChange={() => {}} />);
    await userEvent.click(screen.getByLabelText('Scegli la data'));
    expect(showPicker).toHaveBeenCalled();
    delete (HTMLInputElement.prototype as { showPicker?: unknown }).showPicker;
  });

  it('oggi: titolo, data estesa, avanti disabilitato', async () => {
    const onChange = vi.fn();
    render(<DateHeader date={today} today={today} onChange={onChange} />);
    expect(screen.getByRole('heading', { name: 'Oggi' })).toBeInTheDocument();
    expect(screen.getByText('mercoledì 7 ottobre 2026')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Giorno successivo' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Vai a oggi' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Giorno precedente' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-06');
  });

  it('giorno passato: avanti e torna a oggi', async () => {
    const onChange = vi.fn();
    render(<DateHeader date="2026-10-05" today={today} onChange={onChange} />);
    expect(screen.getByRole('heading', { name: 'Lun 5 ottobre' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Giorno successivo' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-10-06');
    await userEvent.click(screen.getByRole('button', { name: 'Vai a oggi' }));
    expect(onChange).toHaveBeenLastCalledWith(today);
  });

  it('calendario: limita al massimo oggi', () => {
    const onChange = vi.fn();
    render(<DateHeader date={today} today={today} onChange={onChange} />);
    const input = screen.getByLabelText('Scegli la data');
    expect(input).toHaveAttribute('max', today);
    fireEvent.change(input, { target: { value: '2026-09-15' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-09-15');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
