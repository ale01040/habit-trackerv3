import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressRing } from './ProgressRing';

describe('ProgressRing', () => {
  it('percentuale e conteggio', () => {
    render(<ProgressRing done={9} scheduled={14} />);
    expect(screen.getByRole('img', { name: 'Completamento 64%, 9 su 14' })).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('9/14')).toBeInTheDocument();
  });

  it('niente di previsto', () => {
    render(<ProgressRing done={0} scheduled={0} />);
    expect(screen.getByRole('img', { name: 'Nessuna abitudine prevista' })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
