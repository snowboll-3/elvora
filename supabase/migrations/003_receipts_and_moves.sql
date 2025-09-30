-- 003_receipts_and_moves.sql
create table if not exists public.receipts (
  id bigserial primary key,
  source_path text null,  -- storage key
  mail_id text null,
  created_at timestamptz not null default now(),
  created_by text not null default auth.email()
);

create table if not exists public.receipt_lines (
  id bigserial primary key,
  receipt_id bigint not null references public.receipts(id) on delete cascade,
  name text null,
  ean text null,
  qty numeric not null default 0 check (qty>=0),
  uom text not null default 'kom',
  lot text null,
  exp date null
);

create table if not exists public.moves (
  id bigserial primary key,
  market_id bigint null,
  dest text not null check (dest in ('SKLADISTE','SANK')),
  created_at timestamptz not null default now(),
  created_by text not null default auth.email()
);

create table if not exists public.move_lines (
  id bigserial primary key,
  move_id bigint not null references public.moves(id) on delete cascade,
  ean text null,
  name text null,
  qty numeric not null check (qty>0),
  uom text not null default 'kom',
  lot text null,
  exp date null
);

create table if not exists public.item_aliases (
  id bigserial primary key,
  supplier text null,
  raw_name text not null,
  canonical_name text not null,
  ean text null,
  uom text null
);

-- RLS
alter table public.receipts enable row level security;
alter table public.receipt_lines enable row level security;
alter table public.moves enable row level security;
alter table public.move_lines enable row level security;

create policy receipts_sel on public.receipts for select using (true);
create policy receipts_ins on public.receipts for insert with check (true);

create policy receipt_lines_sel on public.receipt_lines for select using (true);
create policy receipt_lines_ins on public.receipt_lines for insert with check (true);

create policy moves_sel on public.moves for select using (true);
create policy moves_ins on public.moves for insert with check (true);

create policy move_lines_sel on public.move_lines for select using (true);
create policy move_lines_ins on public.move_lines for insert with check (true);