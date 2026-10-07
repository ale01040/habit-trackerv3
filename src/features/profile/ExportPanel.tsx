import { Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { useToday } from '../../app/clock';
import { useToast } from '../../app/toast';
import { useCheckins, useHabits } from '../../data/queries';
import {
  buildDayExport,
  exportFilename,
  toCsv,
  toMarkdown,
  type ExportFormat,
} from '../../domain/export';
import { downloadFile } from '../../lib/download';

const FORMATS: { value: ExportFormat; label: string; mime: string }[] = [
  { value: 'md', label: 'Markdown', mime: 'text/markdown;charset=utf-8' },
  { value: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8' },
];

const ACTION =
  'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-50';

export function ExportPanel() {
  const today = useToday();
  const toast = useToast();
  const habitsQuery = useHabits();
  const { checkins, isSuccess: checkinsReady } = useCheckins();
  const [date, setDate] = useState(today);
  const [format, setFormat] = useState<ExportFormat>('md');
  const ready = habitsQuery.isSuccess && checkinsReady;

  function build() {
    const day = buildDayExport(habitsQuery.data ?? [], checkins, date, today);
    return format === 'md' ? toMarkdown(day) : toCsv(day);
  }

  function download() {
    const mime = FORMATS.find((f) => f.value === format)!.mime;
    downloadFile(exportFilename(date, format), build(), mime);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(build().replace(/^\uFEFF/, ''));
      toast.show('Copiato negli appunti');
    } catch {
      toast.show('Impossibile copiare: usa Scarica');
    }
  }

  return (
    <section
      aria-labelledby="export-title"
      className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm"
    >
      <h2 id="export-title" className="font-semibold">
        Esporta giornata
      </h2>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Giorno
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => {
            const value = e.target.value;
            if (value) setDate(value > today ? today : value);
          }}
          className="min-h-11 rounded-xl border border-line bg-surface px-3 text-base font-normal text-fg"
        />
      </label>
      <div role="group" aria-label="Formato" className="grid grid-cols-2 rounded-xl bg-line/60 p-1">
        {FORMATS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={format === f.value}
            onClick={() => setFormat(f.value)}
            className={`min-h-11 rounded-lg text-sm font-semibold ${
              format === f.value ? 'bg-surface text-fg shadow-sm' : 'text-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={download}
          className={`${ACTION} bg-accent text-on-accent`}
        >
          <Download size={18} aria-hidden /> Scarica
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={copy}
          className={`${ACTION} bg-line/60 text-fg`}
        >
          <Copy size={18} aria-hidden /> Copia
        </button>
      </div>
    </section>
  );
}
