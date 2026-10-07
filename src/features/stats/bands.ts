import type { PercentBand } from '../../domain/stats';

export const BAND_BG: Record<PercentBand, string> = {
  high: 'bg-success',
  mid: 'bg-streak',
  low: 'bg-danger',
};

export const BAND_LABEL: Record<PercentBand, string> = {
  high: 'Ottimo',
  mid: 'Bene',
  low: 'Da migliorare',
};
