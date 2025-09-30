-- User roles table
create table if not exists public.user_roles (
  id bigserial primary key,
  email text not null,
  role text not null,
  market_id uuid
);

-- Example policy (bez IF NOT EXISTS)
create policy user_roles_sel on public.user_roles
for select
using (true);

create policy user_roles_ins on public.user_roles
for insert
with check (true);

create policy user_roles_upd on public.user_roles
for update
using (true);

create policy user_roles_del on public.user_roles
for delete
using (true);
