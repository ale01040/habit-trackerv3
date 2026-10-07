-- Operazioni atomiche. Codici: HT001 fuori finestra, HT002 non prevista,
-- HT003 dati non validi, HT004 stato non valido, HT404 non trovata.

create or replace function private.require_user() returns uuid
language plpgsql stable as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sessione scaduta' using errcode = '42501';
  end if;
  return v_user;
end $$;

create or replace function private.check_today(p_today date) returns void
language plpgsql stable as $$
begin
  if p_today is null or p_today < current_date - 1 or p_today > current_date + 1 then
    raise exception 'Data di oggi non valida' using errcode = 'HT003';
  end if;
end $$;

create or replace function private.normalize_weekdays(p int[]) returns smallint[]
language plpgsql immutable as $$
declare
  v smallint[];
begin
  if p is null or exists (select 1 from unnest(p) as d where d < 1 or d > 7) then
    raise exception 'Scegli almeno un giorno' using errcode = 'HT003';
  end if;
  select coalesce(array_agg(distinct d order by d), '{}') into v from unnest(p) as d;
  if cardinality(v) = 0 then
    raise exception 'Scegli almeno un giorno' using errcode = 'HT003';
  end if;
  return v;
end $$;

create or replace function private.owned_habit(p_habit_id uuid, p_user uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.habits where id = p_habit_id and user_id = p_user) then
    raise exception 'Abitudine non trovata' using errcode = 'HT404';
  end if;
end $$;

create or replace function private.check_window(p_date date) returns void
language plpgsql stable as $$
begin
  if p_date > current_date + 1 or p_date < current_date - 8 then
    raise exception 'Non puoi modificare questo giorno' using errcode = 'HT001';
  end if;
end $$;

create or replace function public.create_habit(
  p_name text, p_description text, p_icon text, p_weekdays int[], p_today date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_id uuid;
  v_pos int;
  v_days smallint[];
begin
  perform private.check_today(p_today);
  v_days := private.normalize_weekdays(p_weekdays);
  select coalesce(max(position), -1) + 1 into v_pos from public.habits where user_id = v_user;
  insert into public.habits (user_id, name, description, icon, position)
  values (
    v_user,
    regexp_replace(btrim(p_name), '\s+', ' ', 'g'),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(nullif(p_icon, ''), 'sparkles'),
    v_pos
  )
  returning id into v_id;
  insert into public.habit_periods (habit_id, user_id, weekdays, valid_from)
  values (v_id, v_user, v_days, p_today);
  return v_id;
end $$;

create or replace function public.update_habit_schedule(
  p_habit_id uuid, p_weekdays int[], p_today date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_open public.habit_periods;
  v_days smallint[];
begin
  perform private.owned_habit(p_habit_id, v_user);
  perform private.check_today(p_today);
  v_days := private.normalize_weekdays(p_weekdays);
  select * into v_open from public.habit_periods where habit_id = p_habit_id and valid_to is null;
  if not found then
    raise exception 'L’abitudine è archiviata' using errcode = 'HT004';
  end if;
  if v_open.valid_from >= p_today then
    update public.habit_periods set weekdays = v_days where id = v_open.id;
  else
    update public.habit_periods set valid_to = p_today - 1 where id = v_open.id;
    insert into public.habit_periods (habit_id, user_id, weekdays, valid_from)
    values (p_habit_id, v_user, v_days, p_today);
  end if;
end $$;

create or replace function public.archive_habit(p_habit_id uuid, p_today date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_open public.habit_periods;
begin
  perform private.owned_habit(p_habit_id, v_user);
  perform private.check_today(p_today);
  select * into v_open from public.habit_periods where habit_id = p_habit_id and valid_to is null;
  if not found then
    raise exception 'L’abitudine è già archiviata' using errcode = 'HT004';
  end if;
  if v_open.valid_from >= p_today then
    delete from public.habit_periods where id = v_open.id;
  else
    update public.habit_periods set valid_to = p_today - 1 where id = v_open.id;
  end if;
  delete from public.checkins where habit_id = p_habit_id and date >= p_today;
end $$;

create or replace function public.reactivate_habit(
  p_habit_id uuid, p_weekdays int[], p_today date
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
  v_last public.habit_periods;
  v_days smallint[];
begin
  perform private.owned_habit(p_habit_id, v_user);
  perform private.check_today(p_today);
  if exists (
    select 1 from public.habit_periods where habit_id = p_habit_id and valid_to is null
  ) then
    raise exception 'L’abitudine è già attiva' using errcode = 'HT004';
  end if;
  v_days := private.normalize_weekdays(p_weekdays);
  -- torna in fondo alla lista, senza pari merito con le attive
  update public.habits set position = (
    select coalesce(max(position), -1) + 1 from public.habits
    where user_id = v_user and id <> p_habit_id
  ) where id = p_habit_id;
  select * into v_last from public.habit_periods
  where habit_id = p_habit_id order by valid_to desc limit 1;
  if found then
    if v_last.valid_to >= p_today - 1 and v_last.weekdays = v_days then
      update public.habit_periods set valid_to = null where id = v_last.id;
      return;
    end if;
    if v_last.valid_to >= p_today then
      if v_last.valid_from >= p_today then
        delete from public.habit_periods where id = v_last.id;
      else
        update public.habit_periods set valid_to = p_today - 1 where id = v_last.id;
      end if;
    end if;
  end if;
  insert into public.habit_periods (habit_id, user_id, weekdays, valid_from)
  values (p_habit_id, v_user, v_days, p_today);
end $$;

create or replace function public.reorder_habits(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  -- prima gli id indicati, poi le altre (archiviate) nel loro ordine: niente pari merito
  with ranked as (
    select h.id,
           row_number() over (
             order by coalesce(t.ord, cardinality(p_ids) + 1), h.position, h.id
           ) - 1 as pos
    from public.habits h
    left join unnest(p_ids) with ordinality as t(id, ord) on t.id = h.id
    where h.user_id = v_user
  )
  update public.habits h set position = ranked.pos
  from ranked where h.id = ranked.id;
end $$;

create or replace function public.add_checkin(p_habit_id uuid, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  perform private.owned_habit(p_habit_id, v_user);
  perform private.check_window(p_date);
  if not exists (
    select 1 from public.habit_periods p
    where p.habit_id = p_habit_id
      and p.valid_from <= p_date
      and (p.valid_to is null or p.valid_to >= p_date)
      and extract(isodow from p_date)::smallint = any (p.weekdays)
  ) then
    raise exception 'Abitudine non prevista in questo giorno' using errcode = 'HT002';
  end if;
  insert into public.checkins (habit_id, user_id, date)
  values (p_habit_id, v_user, p_date)
  on conflict do nothing;
end $$;

create or replace function public.remove_checkin(p_habit_id uuid, p_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := private.require_user();
begin
  perform private.owned_habit(p_habit_id, v_user);
  perform private.check_window(p_date);
  delete from public.checkins where habit_id = p_habit_id and date = p_date;
end $$;

-- Solo gli utenti autenticati possono chiamare le funzioni pubbliche.
revoke execute on function
  public.create_habit(text, text, text, int[], date),
  public.update_habit_schedule(uuid, int[], date),
  public.archive_habit(uuid, date),
  public.reactivate_habit(uuid, int[], date),
  public.reorder_habits(uuid[]),
  public.add_checkin(uuid, date),
  public.remove_checkin(uuid, date)
from public, anon;
grant execute on function
  public.create_habit(text, text, text, int[], date),
  public.update_habit_schedule(uuid, int[], date),
  public.archive_habit(uuid, date),
  public.reactivate_habit(uuid, int[], date),
  public.reorder_habits(uuid[]),
  public.add_checkin(uuid, date),
  public.remove_checkin(uuid, date)
to authenticated;
