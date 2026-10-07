import type { Backend } from '../data/backend';
import { BackendError } from '../data/errors';

/** Backend il cui caricamento delle abitudini fallisce le prime `failures` volte. */
export function failingLoads(base: Backend, failures = 1): Backend {
  let left = failures;
  return {
    ...base,
    listHabits: () =>
      left-- > 0 ? Promise.reject(new BackendError('network')) : base.listHabits(),
  };
}
