-- 003_user_roles_markets.sql

-- Korisničke role (po e-mailu)
create table if not exists public.user_roles (
  email text primary key,
  role  text not null check (role in ('worker','store_lead','warehouse','manager','admin','director')),
  created_at timestamptz not null default now()
);

-- Marketi (minimalno)
create table if not exists public.markets (
  id bigserial primary key,
  name text not null,
  region_code text null,  -- npr. HR-21 (županija) ili država/grad
  postal_code text null
);

-- Dodjela pristupa korisnika tržištima
create table if not exists public.market_assignments (
  id bigserial primary key,
  email text not null references public.user_roles(email) on delete cascade,
  market_id bigint not null references public.markets(id) on delete cascade,
  unique(email, market_id)
);

-- Pogled koji koriste RLS politike: tko smije čitati podatke iz kojeg marketa
create or replace view public.v_user_allowed_markets as
select ma.email, ma.market_id
from public.market_assignments ma;

-- (opcionalno) minimalne RLS postavke za čitanje vlastitih uloga
alter table public.user_roles enable row level security;
create policy if not exists user_roles_sel on public.user_roles
for select using (auth.email() = email or exists (select 1 from public.user_roles r where r.email = auth.email() and r.role in ('admin','director','manager')));

-- RLS na market_assignments (čitanje vlastitih + manager/admin/director)
alter table public.market_assignments enable row level security;
create policy if not exists ma_sel on public.market_assignments
for select using (
  email = auth.email() or exists (select 1 from public.user_roles r where r.email = auth.email() and r.role in ('admin','director','manager'))
);
