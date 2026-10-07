-- Schema dati: abitudini, periodi di validità e spunte.
create schema if not exists private;

create or replace function private.weekdays_valid(p smallint[]) returns boolean
language sql immutable as $$
  select p is not null
    and cardinality(p) between 1 and 7
    and p <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
    and cardinality(p) = (select count(distinct d) from unnest(p) as d)
$$;

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40 and name = btrim(name)),
  description text check (description is null or char_length(description) <= 200),
  icon text not null default 'sparkles' check (char_length(icon) <= 40),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index habits_user_name_key on public.habits (user_id, lower(name));

create table public.habit_periods (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  weekdays smallint[] not null check (private.weekdays_valid(weekdays)),
  valid_from date not null,
  valid_to date,
  check (valid_to is null or valid_to >= valid_from)
);
create unique index habit_periods_one_open on public.habit_periods (habit_id) where valid_to is null;
create index habit_periods_habit_idx on public.habit_periods (habit_id, valid_from);

create table public.checkins (
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, date)
);
create index checkins_user_date_idx on public.checkins (user_id, date);
