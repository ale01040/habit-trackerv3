import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { isoWeekday } from '../../src/domain/dates';
import { A, as, B, code, createDb, shift, today } from './harness';

let db: PGlite;
let t: string;

const ALL = [1, 2, 3, 4, 5, 6, 7];

async function create(name: string, day = t, weekdays = ALL) {
  const { rows } = await db.query<{ id: string }>(
    'select public.create_habit($1, null, $2, $3, $4) as id',
    [name, 'droplet', weekdays, day],
  );
  return rows[0].id;
}

async function periods(id: string) {
  const { rows } = await db.query<{
    weekdays: number[];
    valid_from: string;
    valid_to: string | null;
  }>(
    `select weekdays, valid_from::text, valid_to::text from public.habit_periods
     where habit_id = $1 order by valid_from`,
    [id],
  );
  return rows;
}

async function checkins() {
  const { rows } = await db.query<{ habit_id: string; date: string }>(
    'select habit_id, date::text from public.checkins order by date',
  );
  return rows;
}

const call = (sql: string, params: unknown[]) => db.query(sql, params);

beforeEach(async () => {
  db = await createDb();
  t = await today(db);
  await as(db, A);
});

describe('creazione e nomi', () => {
  it('crea con periodo aperto, nome pulito, giorni normalizzati e posizione crescente', async () => {
    const { rows } = await db.query<{ id: string }>(
      "select public.create_habit('  Drink   water ', '  ', 'droplet', '{3,1,1}', $1) as id",
      [t],
    );
    const id = rows[0].id;
    const second = await create('Read');
    const habits = await db.query<{ id: string; name: string; description: string | null }>(
      'select id, name, description from public.habits order by position',
    );
    expect(habits.rows.map((r) => [r.name, r.description])).toEqual([
      ['Drink water', null],
      ['Read', null],
    ]);
    expect(habits.rows[1].id).toBe(second);
    expect(await periods(id)).toEqual([{ weekdays: [1, 3], valid_from: t, valid_to: null }]);
  });

  it('nome duplicato case-insensitive anche se archiviata; altri utenti liberi', async () => {
    const id = await create('Coffee');
    expect(await code(create(' coffee '))).toBe('23505');
    await call('select public.archive_habit($1, $2)', [id, t]);
    expect(await code(create('COFFEE'))).toBe('23505');
    await as(db, B);
    expect(await create('Coffee')).toBeTruthy();
  });

  it('giorni vuoti o fuori range e oggi lontano → HT003', async () => {
    expect(await code(create('Gym', t, []))).toBe('HT003');
    expect(await code(create('Gym', t, [0, 8]))).toBe('HT003');
    expect(await code(create('Gym', shift(t, 5)))).toBe('HT003');
  });

  it('oggi ±1 accettato (fuso orario)', async () => {
    expect(await create('Ieri', shift(t, -1))).toBeTruthy();
    expect(await create('Domani', shift(t, 1))).toBeTruthy();
  });
});

describe('periodi', () => {
  it('cambio giorni lo stesso giorno aggiorna; il giorno dopo conserva lo storico', async () => {
    const same = await create('Same');
    await call("select public.update_habit_schedule($1, '{1,3}', $2)", [same, t]);
    expect(await periods(same)).toEqual([{ weekdays: [1, 3], valid_from: t, valid_to: null }]);
    const y = shift(t, -1);
    const old = await create('Old', y);
    await call("select public.update_habit_schedule($1, '{1}', $2)", [old, t]);
    expect(await periods(old)).toEqual([
      { weekdays: ALL, valid_from: y, valid_to: y },
      { weekdays: [1], valid_from: t, valid_to: null },
    ]);
  });

  it('archiviazione: stesso giorno elimina il periodo; altrimenti chiude a ieri', async () => {
    const same = await create('Same');
    await call('select public.add_checkin($1, $2)', [same, t]);
    await call('select public.archive_habit($1, $2)', [same, t]);
    expect(await periods(same)).toEqual([]);
    const y = shift(t, -1);
    const old = await create('Old', y);
    await call('select public.add_checkin($1, $2)', [old, y]);
    await call('select public.add_checkin($1, $2)', [old, t]);
    await call('select public.archive_habit($1, $2)', [old, t]);
    expect(await periods(old)).toEqual([{ weekdays: ALL, valid_from: y, valid_to: y }]);
    expect(await checkins()).toEqual([{ habit_id: old, date: y }]);
    expect(await code(call('select public.archive_habit($1, $2)', [old, t]))).toBe('HT004');
    expect(await code(call("select public.update_habit_schedule($1, '{1}', $2)", [old, t]))).toBe(
      'HT004',
    );
  });

  it('riattivazione: riapre senza buchi o apre un nuovo periodo', async () => {
    const y = shift(t, -1);
    const a = await create('A', y);
    await call('select public.archive_habit($1, $2)', [a, t]);
    await call('select public.reactivate_habit($1, $2, $3)', [a, ALL, t]);
    expect(await periods(a)).toEqual([{ weekdays: ALL, valid_from: y, valid_to: null }]);
    expect(await code(call('select public.reactivate_habit($1, $2, $3)', [a, ALL, t]))).toBe(
      'HT004',
    );

    const b = await create('B', y);
    await call('select public.archive_habit($1, $2)', [b, t]);
    await call("select public.reactivate_habit($1, '{2,4}', $2)", [b, t]);
    expect(await periods(b)).toEqual([
      { weekdays: ALL, valid_from: y, valid_to: y },
      { weekdays: [2, 4], valid_from: t, valid_to: null },
    ]);

    const c = await create('C');
    await call('select public.archive_habit($1, $2)', [c, t]);
    await call('select public.reactivate_habit($1, $2, $3)', [c, ALL, t]);
    expect(await periods(c)).toEqual([{ weekdays: ALL, valid_from: t, valid_to: null }]);
  });

  it('riattivata in fondo alla lista', async () => {
    const a = await create('A');
    const b = await create('B');
    await call('select public.archive_habit($1, $2)', [a, t]);
    await call('select public.reorder_habits($1)', [[b]]);
    await call('select public.reactivate_habit($1, $2, $3)', [a, ALL, t]);
    const { rows } = await db.query<{ id: string; position: number }>(
      'select id, position from public.habits order by position, id',
    );
    expect(rows.map((r) => r.id)).toEqual([b, a]);
    expect(new Set(rows.map((r) => r.position)).size).toBe(2);
  });

  it('riordino senza pari merito con le archiviate', async () => {
    const x = await create('X');
    const y = await create('Y');
    const z = await create('Z');
    await call('select public.archive_habit($1, $2)', [y, t]);
    await call('select public.reorder_habits($1)', [[z, x]]);
    const { rows } = await db.query<{ id: string; position: number }>(
      'select id, position from public.habits order by position',
    );
    expect(new Set(rows.map((r) => r.position)).size).toBe(3);
    expect(rows.map((r) => r.id).slice(0, 2)).toEqual([z, x]);
  });

  it('riordino', async () => {
    const a = await create('A');
    const b = await create('B');
    await call('select public.reorder_habits($1)', [[b, a]]);
    const { rows } = await db.query<{ id: string }>(
      'select id from public.habits order by position',
    );
    expect(rows.map((r) => r.id)).toEqual([b, a]);
  });
});

describe('spunte', () => {
  it('idempotenti in aggiunta e rimozione', async () => {
    const id = await create('Gym');
    await call('select public.add_checkin($1, $2)', [id, t]);
    await call('select public.add_checkin($1, $2)', [id, t]);
    expect(await checkins()).toEqual([{ habit_id: id, date: t }]);
    await call('select public.remove_checkin($1, $2)', [id, t]);
    await call('select public.remove_checkin($1, $2)', [id, t]);
    expect(await checkins()).toEqual([]);
  });

  it('finestra modificabile e tolleranza di un giorno', async () => {
    const id = await create('Gym');
    expect(await code(call('select public.add_checkin($1, $2)', [id, shift(t, 3)]))).toBe('HT001');
    expect(await code(call('select public.add_checkin($1, $2)', [id, shift(t, -9)]))).toBe('HT001');
    expect(await code(call('select public.remove_checkin($1, $2)', [id, shift(t, -9)]))).toBe(
      'HT001',
    );
    const tomorrow = await create('Domani', shift(t, 1));
    await call('select public.add_checkin($1, $2)', [tomorrow, shift(t, 1)]);
  });

  it('giorno non previsto → HT002', async () => {
    const others = ALL.filter((d) => d !== isoWeekday(t));
    const id = await create('Gym', t, others);
    expect(await code(call('select public.add_checkin($1, $2)', [id, t]))).toBe('HT002');
  });
});

describe('sicurezza', () => {
  it('un altro utente non vede né modifica', async () => {
    const id = await create('Gym');
    await call('select public.add_checkin($1, $2)', [id, t]);
    await as(db, B);
    expect((await db.query('select * from public.habits')).rows).toEqual([]);
    expect((await db.query('select * from public.habit_periods')).rows).toEqual([]);
    expect((await db.query('select * from public.checkins')).rows).toEqual([]);
    expect(await code(call('select public.add_checkin($1, $2)', [id, t]))).toBe('HT404');
    expect(await code(call('select public.remove_checkin($1, $2)', [id, t]))).toBe('HT404');
    expect(await code(call('select public.archive_habit($1, $2)', [id, t]))).toBe('HT404');
    const updated = await call("update public.habits set name = 'X' where id = $1", [id]);
    expect(updated.affectedRows).toBe(0);
  });

  it('scritture dirette sulle tabelle negate; nome e icona modificabili', async () => {
    const id = await create('Gym');
    expect(await code(db.query("insert into public.habits (name) values ('X')"))).toBe('42501');
    expect(await code(call('update public.habits set position = 9 where id = $1', [id]))).toBe(
      '42501',
    );
    expect(
      await code(
        call(
          "insert into public.habit_periods (habit_id, user_id, weekdays, valid_from) values ($1, $2, '{1}', current_date)",
          [id, A],
        ),
      ),
    ).toBe('42501');
    expect(
      await code(
        call('insert into public.checkins (habit_id, date) values ($1, current_date)', [id]),
      ),
    ).toBe('42501');
    await call("update public.habits set name = 'Palestra', icon = 'dumbbell' where id = $1", [id]);
    const { rows } = await db.query<{ name: string }>('select name from public.habits');
    expect(rows[0].name).toBe('Palestra');
  });

  it('anonimo: nessun accesso e RPC negate', async () => {
    await as(db, null);
    expect(await code(db.query('select * from public.habits'))).toBe('42501');
    expect(await code(create('Gym'))).toBe('42501');
  });
});
