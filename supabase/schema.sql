-- Shawn's Card Vault — Supabase schema
-- Paste this whole file into Supabase → SQL Editor → Run.

create table if not exists public.cards (
  id uuid primary key,
  player text not null,
  year int,
  set_name text default '',
  brand text default '',
  card_number text default '',
  team text default '',
  position text default '',
  variant text default '',
  rookie boolean default false,
  autograph boolean default false,
  memorabilia boolean default false,
  serial text default '',
  grading_company text default '',
  grade text default '',
  condition text default '',
  quantity int default 1,
  value numeric,
  purchase_price numeric,
  purchase_date date,
  location text default '',
  tags text[] default '{}',
  notes text default '',
  favorite boolean default false,
  image text default '',
  image_back text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Who is allowed to add / edit / delete cards (everyone else can only look).
create table if not exists public.editors (email text primary key);
-- ⬇ put Shawn's (and your) email here
insert into public.editors (email) values
  ('REPLACE_WITH_SHAWNS_EMAIL@example.com'),
  ('justinfoote@gmail.com')
on conflict do nothing;

alter table public.cards enable row level security;
alter table public.editors enable row level security;

create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.editors where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

drop policy if exists "anyone can view cards" on public.cards;
create policy "anyone can view cards" on public.cards for select using (true);

drop policy if exists "editors can insert" on public.cards;
create policy "editors can insert" on public.cards for insert with check (public.is_editor());

drop policy if exists "editors can update" on public.cards;
create policy "editors can update" on public.cards for update using (public.is_editor()) with check (public.is_editor());

drop policy if exists "editors can delete" on public.cards;
create policy "editors can delete" on public.cards for delete using (public.is_editor());
