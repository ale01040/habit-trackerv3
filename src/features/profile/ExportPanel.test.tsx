import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithApp } from '../../test/render';
import { seedBackend } from '../../test/seed';
import { ExportPanel } from './ExportPanel';

const seed = () =>
  seedBackend({
    habits: [{ id: 'w', name: 'Drink water' }, { name: 'Read' }],
    checkins: [['w', '2026-10-07']],
  });

function captureDownload() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    blobs.push(b as Blob);
    return 'blob:test';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  return { blobs, names };
}

describe('ExportPanel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('scarica il Markdown di oggi', async () => {
    const dl = captureDownload();
    const { user } = renderWithApp(<ExportPanel />, { backend: seed() });
    await screen.findByText('Esporta giornata');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scarica' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Scarica' }));
    await waitFor(() => expect(dl.names).toEqual(['habit-tracker-2026-10-07.md']));
    const text = await dl.blobs[0].text();
    expect(text).toContain('Completamento: 50% (1/2)');
    expect(text).toContain('- [x] Drink water 🔥1');
  });

  it('scarica il CSV di un altro giorno', async () => {
    const dl = captureDownload();
    const { user } = renderWithApp(<ExportPanel />, { backend: seed() });
    await screen.findByText('Esporta giornata');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scarica' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-10-06' } });
    await user.click(screen.getByRole('button', { name: 'CSV' }));
    await user.click(screen.getByRole('button', { name: 'Scarica' }));
    await waitFor(() => expect(dl.names).toEqual(['habit-tracker-2026-10-06.csv']));
    expect(await dl.blobs[0].text()).toContain('2026-10-06,Drink water,0,0');
  });

  it('copia negli appunti senza BOM', async () => {
    const { user } = renderWithApp(<ExportPanel />, { backend: seed() });
    await screen.findByText('Esporta giornata');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copia' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'CSV' }));
    await user.click(screen.getByRole('button', { name: 'Copia' }));
    expect(await screen.findByText('Copiato negli appunti')).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied.startsWith('data,abitudine,fatto,streak')).toBe(true);
  });
});
