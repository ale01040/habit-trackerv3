import { describe, expect, it } from 'vitest';
import { addDays, isoWeekday } from '../domain/dates';
import { ALL_WEEKDAYS, type DateStr, type Weekday } from '../domain/types';
import type { Backend } from './backend';
import { BackendError } from './errors';

export interface ContractContext {
  /** Backend con un utente loggato e senza dati. */
  backend: Backend;
  /** "Oggi" secondo il server. */
  today: DateStr;
  /** Esegue logout e login con un secondo utente, anch'esso senza dati. */
  switchToOtherUser(): Promise<void>;
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(BackendError);
  await expect(promise).rejects.toMatchObject({ code });
}

const ALL = [...ALL_WEEKDAYS];

export function runBackendContract(label: string, setup: () => Promise<ContractContext>) {
  describe(`${label}: contratto backend`, () => {
    async function create(b: Backend, name: string, today: DateStr, weekdays: Weekday[] = ALL) {
      return b.createHabit({ name, description: null, icon: 'droplet', weekdays }, today);
    }

    async function habit(b: Backend, id: string) {
      const found = (await b.listHabits()).find((h) => h.id === id);
      if (!found) throw new Error('abitudine non trovata nel test');
      return found;
    }

    it('crea con periodo aperto da oggi, nome pulito e posizione crescente', async () => {
      const { backend: b, today } = await setup();
      const id = await b.createHabit(
        { name: '  Drink   water ', description: '  ', icon: 'droplet', weekdays: [3, 1, 1] },
        today,
      );
      const second = await create(b, 'Read', today);
      const h = await habit(b, id);
      expect(h).toMatchObject({ name: 'Drink water', description: null, icon: 'droplet' });
      expect(h.periods).toEqual([{ validFrom: today, validTo: null, weekdays: [1, 3] }]);
      expect((await habit(b, second)).position).toBeGreaterThan(h.position);
    });

    it('nome duplicato senza distinzione di maiuscole, anche tra le archiviate', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Coffee', today);
      await expectCode(create(b, ' coffee ', today), 'duplicate_name');
      await b.archiveHabit(id, today);
      await expectCode(create(b, 'COFFEE', today), 'duplicate_name');
    });

    it('rifiuta giorni vuoti e una data di oggi lontana', async () => {
      const { backend: b, today } = await setup();
      await expectCode(create(b, 'Gym', today, []), 'invalid_input');
      await expectCode(create(b, 'Gym', addDays(today, 5)), 'invalid_input');
    });

    it('rinomina mantenendo id e storico', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Coffee', today);
      await create(b, 'Tea', today);
      await b.addCheckin(id, today);
      await b.updateHabit(id, { name: 'COFFEE', description: 'una tazza', icon: 'coffee' });
      await expectCode(b.updateHabit(id, { name: 'tea' }), 'duplicate_name');
      expect(await habit(b, id)).toMatchObject({
        name: 'COFFEE',
        description: 'una tazza',
        icon: 'coffee',
      });
      expect(await b.listCheckins()).toEqual([{ habitId: id, date: today }]);
    });

    it('cambio giorni nello stesso giorno della creazione aggiorna il periodo', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Gym', today);
      await b.updateSchedule(id, [1, 3], today);
      await b.updateSchedule(id, [5], today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: today, validTo: null, weekdays: [5] },
      ]);
    });

    it('cambio giorni nei giorni successivi conserva lo storico', async () => {
      const { backend: b, today } = await setup();
      const yesterday = addDays(today, -1);
      const id = await create(b, 'Gym', yesterday);
      await b.updateSchedule(id, [1], today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: yesterday, validTo: yesterday, weekdays: ALL },
        { validFrom: today, validTo: null, weekdays: [1] },
      ]);
    });

    it('archiviare il giorno stesso della creazione elimina il periodo e la spunta', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Gym', today);
      await b.addCheckin(id, today);
      await b.archiveHabit(id, today);
      expect((await habit(b, id)).periods).toEqual([]);
      expect(await b.listCheckins()).toEqual([]);
    });

    it('archiviare chiude il periodo a ieri e conserva le spunte passate', async () => {
      const { backend: b, today } = await setup();
      const yesterday = addDays(today, -1);
      const id = await create(b, 'Gym', yesterday);
      await b.addCheckin(id, yesterday);
      await b.addCheckin(id, today);
      await b.archiveHabit(id, today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: yesterday, validTo: yesterday, weekdays: ALL },
      ]);
      expect(await b.listCheckins()).toEqual([{ habitId: id, date: yesterday }]);
      await expectCode(b.archiveHabit(id, today), 'invalid_state');
      await expectCode(b.updateSchedule(id, [1], today), 'invalid_state');
    });

    it('riattivare con gli stessi giorni riapre il periodo senza buchi', async () => {
      const { backend: b, today } = await setup();
      const yesterday = addDays(today, -1);
      const id = await create(b, 'Gym', yesterday);
      await b.archiveHabit(id, today);
      await b.reactivateHabit(id, ALL, today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: yesterday, validTo: null, weekdays: ALL },
      ]);
      await expectCode(b.reactivateHabit(id, ALL, today), 'invalid_state');
    });

    it('riattivare con giorni diversi apre un nuovo periodo da oggi', async () => {
      const { backend: b, today } = await setup();
      const yesterday = addDays(today, -1);
      const id = await create(b, 'Gym', yesterday);
      await b.archiveHabit(id, today);
      await b.reactivateHabit(id, [2, 4], today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: yesterday, validTo: yesterday, weekdays: ALL },
        { validFrom: today, validTo: null, weekdays: [2, 4] },
      ]);
    });

    it('creata, archiviata e riattivata lo stesso giorno', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Gym', today);
      await b.archiveHabit(id, today);
      await b.reactivateHabit(id, ALL, today);
      expect((await habit(b, id)).periods).toEqual([
        { validFrom: today, validTo: null, weekdays: ALL },
      ]);
    });

    it('riattivata va in fondo, senza pari merito di posizione', async () => {
      const { backend: b, today } = await setup();
      const a = await create(b, 'A', today);
      const c = await create(b, 'C', today);
      await b.archiveHabit(a, today);
      const d = await create(b, 'D', today);
      await b.reorderHabits([d, c]);
      await b.reactivateHabit(a, ALL, today);
      const habits = await b.listHabits();
      expect(habits.map((h) => h.id)).toEqual([d, c, a]);
      expect(new Set(habits.map((h) => h.position)).size).toBe(3);
    });

    it('riordinare non crea pari merito con le archiviate', async () => {
      const { backend: b0, today: t0 } = await setup();
      const x = await create(b0, 'X', t0);
      const y = await create(b0, 'Y', t0);
      const z = await create(b0, 'Z', t0);
      await b0.archiveHabit(y, t0);
      await b0.reorderHabits([z, x]);
      const all = await b0.listHabits();
      expect(new Set(all.map((h) => h.position)).size).toBe(3);
      expect(all.map((h) => h.id).slice(0, 2)).toEqual([z, x]);
    });

    it('riordina', async () => {
      const { backend: b, today } = await setup();
      const a = await create(b, 'A', today);
      const c = await create(b, 'C', today);
      const d = await create(b, 'D', today);
      await b.reorderHabits([d, a, c]);
      expect((await b.listHabits()).map((h) => h.id)).toEqual([d, a, c]);
    });

    it('spunte: aggiungi e togli in modo idempotente', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Gym', today);
      await b.addCheckin(id, today);
      await b.addCheckin(id, today);
      expect(await b.listCheckins()).toEqual([{ habitId: id, date: today }]);
      await b.removeCheckin(id, today);
      await b.removeCheckin(id, today);
      expect(await b.listCheckins()).toEqual([]);
    });

    it('spunte fuori dalla finestra modificabile', async () => {
      const { backend: b, today } = await setup();
      const id = await create(b, 'Gym', today);
      await expectCode(b.addCheckin(id, addDays(today, 3)), 'outside_window');
      await expectCode(b.addCheckin(id, addDays(today, -9)), 'outside_window');
      await expectCode(b.removeCheckin(id, addDays(today, -9)), 'outside_window');
    });

    it('domani è accettato per tolleranza del fuso orario', async () => {
      const { backend: b, today } = await setup();
      const tomorrow = addDays(today, 1);
      const id = await create(b, 'Gym', tomorrow);
      await b.addCheckin(id, tomorrow);
      expect(await b.listCheckins()).toEqual([{ habitId: id, date: tomorrow }]);
    });

    it('spunta su un giorno non previsto', async () => {
      const { backend: b, today } = await setup();
      const others = ALL.filter((d) => d !== isoWeekday(today));
      const id = await create(b, 'Gym', today, others);
      await expectCode(b.addCheckin(id, today), 'not_scheduled');
    });

    it('un altro utente non vede né modifica i miei dati', async () => {
      const ctx = await setup();
      const id = await create(ctx.backend, 'Gym', ctx.today);
      await ctx.switchToOtherUser();
      expect(await ctx.backend.listHabits()).toEqual([]);
      expect(await ctx.backend.listCheckins()).toEqual([]);
      await expectCode(ctx.backend.addCheckin(id, ctx.today), 'not_found');
      await expectCode(ctx.backend.archiveHabit(id, ctx.today), 'not_found');
      await expectCode(ctx.backend.updateHabit(id, { name: 'X' }), 'not_found');
      expect(await create(ctx.backend, 'Gym', ctx.today)).toBeTruthy();
    });
  });
}
