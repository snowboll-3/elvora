-- Seed HR (idempotent) + zaštita od duplikata

-- 1) Unikatna pravila (ako već ne postoje)
do Out-Null
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_regions_country_name'
  ) then
    execute 'alter table public.regions
             add constraint uq_regions_country_name unique (country_id, name)';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_regions_geo_label'
  ) then
    execute 'alter table public.regions
             add constraint uq_regions_geo_label unique (geo_label)';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_markets_name_city'
  ) then
    execute 'alter table public.markets
             add constraint uq_markets_name_city unique (name, city)';
  end if;
end Out-Null;

-- 2) Country (upsert by code)
insert into public.countries(code, name)
values ('HR','Croatia')
on conflict (code) do update set name=excluded.name;

-- 3) Regions (idempotent via (country_id,name) i geo_label)
with c as (select id from public.countries where code='HR')
insert into public.regions(country_id, name, geo_label)
select c.id, v.name, v.code
from c
join (values
 ('Zagrebačka','HR-01'),
 ('Krapinsko-zagorska','HR-02'),
 ('Sisačko-moslavačka','HR-03'),
 ('Karlovačka','HR-04'),
 ('Varaždinska','HR-05'),
 ('Koprivničko-križevačka','HR-06'),
 ('Bjelovarsko-bilogorska','HR-07'),
 ('Primorsko-goranska','HR-08'),
 ('Ličko-senjska','HR-09'),
 ('Virovitičko-podravska','HR-10'),
 ('Požeško-slavonska','HR-11'),
 ('Brodsko-posavska','HR-12'),
 ('Zadarska','HR-13'),
 ('Osječko-baranjska','HR-14'),
 ('Šibensko-kninska','HR-15'),
 ('Vukovarsko-srijemska','HR-16'),
 ('Splitsko-dalmatinska','HR-17'),
 ('Istarska','HR-18'),
 ('Dubrovačko-neretvanska','HR-19'),
 ('Međimurska','HR-20'),
 ('Grad Zagreb','HR-21')
) as v(name,code)
on conflict (country_id, name) do update set geo_label = excluded.geo_label;

-- 4) Demo markets (idempotent by unique(name,city))
insert into public.markets (name, city, country_id, region_id)
select 'Market Zagreb - Jankomir','Zagreb', c.id, r.id
from public.countries c
join public.regions r on r.country_id=c.id and r.name='Grad Zagreb'
where c.code='HR'
on conflict (name, city) do update set country_id=excluded.country_id, region_id=excluded.region_id;

insert into public.markets (name, city, country_id, region_id)
select 'Market Split - City Center','Split', c.id, r.id
from public.countries c
join public.regions r on r.country_id=c.id and r.name='Splitsko-dalmatinska'
where c.code='HR'
on conflict (name, city) do update set country_id=excluded.country_id, region_id=excluded.region_id;

insert into public.markets (name, city, country_id, region_id)
select 'Market Rijeka - Tower','Rijeka', c.id, r.id
from public.countries c
join public.regions r on r.country_id=c.id and r.name='Primorsko-goranska'
where c.code='HR'
on conflict (name, city) do update set country_id=excluded.country_id, region_id=excluded.region_id;
