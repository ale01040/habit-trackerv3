import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';
import { createMemoryBackend } from './data/memoryBackend';

describe('App', () => {
  it('senza login mostra la pagina di accesso', async () => {
    render(<App backend={createMemoryBackend()} />);
    expect(await screen.findByRole('heading', { name: 'Habit tracker' })).toBeInTheDocument();
  });
});
