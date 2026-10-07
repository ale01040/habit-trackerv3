-- Row Level Security: ogni utente vede solo i propri dati.
alter table public.habits enable row level security;
alter table public.habit_periods enable row level security;
alter table public.checkins enable row level security;

revoke all on schema private from public;
revoke all on public.habits, public.habit_periods, public.checkins from anon, authenticated;

-- Letture dirette; scritture solo via funzioni, tranne nome/descrizione/icona e
-- la cancellazione delle proprie abitudini (usata dai test di contratto).
grant select, delete on public.habits to authenticated;
grant update (name, description, icon) on public.habits to authenticated;
grant select on public.habit_periods to authenticated;
grant select on public.checkins to authenticated;

create policy habits_owner_select on public.habits
  for select to authenticated using (user_id = (select auth.uid()));
create policy habits_owner_update on public.habits
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy habits_owner_delete on public.habits
  for delete to authenticated using (user_id = (select auth.uid()));
create policy periods_owner_select on public.habit_periods
  for select to authenticated using (user_id = (select auth.uid()));
create policy checkins_owner_select on public.checkins
  for select to authenticated using (user_id = (select auth.uid()));
