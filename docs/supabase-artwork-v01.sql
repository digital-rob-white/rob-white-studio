-- Rob White Studio Platform — Artwork v0.1
-- Apply after supabase-schema.sql, supabase-journal-v01.sql, and
-- supabase-studio-feed-v01.sql. Contains no seed or placeholder artwork.

alter table public.artworks
  add column if not exists owner_id uuid references public.users(id) on delete restrict,
  add column if not exists inventory_number text,
  add column if not exists materials_description text,
  add column if not exists collection_name text,
  add column if not exists location text,
  add column if not exists date_started date,
  add column if not exists date_completed date,
  add column if not exists artwork_type text not null default 'custom',
  add column if not exists current_retail_price_cents integer,
  add column if not exists sold_price_cents integer,
  add column if not exists sold_at date;

alter table public.artworks
  alter column production_status drop default,
  alter column availability drop default;

alter table public.artworks
  alter column production_status type text using production_status::text,
  alter column availability type text using availability::text;

alter table public.artworks
  alter column production_status set default 'concept',
  alter column availability set default 'not_for_sale';

update public.artworks set production_status = 'concept' where production_status = 'planned';
update public.artworks set availability = 'on_hold' where availability = 'reserved';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'artworks_production_status_check'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks add constraint artworks_production_status_check
      check (production_status in ('concept', 'in_progress', 'complete', 'on_hold', 'archived'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'artworks_availability_check'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks add constraint artworks_availability_check
      check (availability in ('not_for_sale', 'available', 'on_hold', 'consigned', 'sold'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'artworks_artwork_type_check'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks add constraint artworks_artwork_type_check
      check (artwork_type in ('painting', 'sculpture', 'mixed_media', 'furniture', 'custom'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'artworks_money_nonnegative'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks add constraint artworks_money_nonnegative
      check (
        (current_retail_price_cents is null or current_retail_price_cents >= 0)
        and (sold_price_cents is null or sold_price_cents >= 0)
      );
  end if;
end $$;

create unique index if not exists artworks_owner_inventory_number_idx
  on public.artworks(owner_id, inventory_number)
  where inventory_number is not null;
create index if not exists artworks_owner_updated_idx on public.artworks(owner_id, updated_at desc);
create index if not exists artworks_collection_idx on public.artworks(collection_name);
create index if not exists artworks_medium_idx on public.artworks(medium);

create table if not exists public.artwork_cost_categories (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  name text not null,
  category_kind text not null default 'materials'
    check (category_kind in ('materials', 'framing_fabrication', 'outside_services', 'packaging', 'other')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artwork_id, name)
);

create table if not exists public.artwork_cost_entries (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  category_id uuid not null references public.artwork_cost_categories(id) on delete restrict,
  item_name text not null,
  manufacturer text,
  color_variant text,
  vendor text,
  entry_date date not null default current_date,
  unit text not null default 'each',
  purchase_quantity numeric(12, 4),
  purchase_cost_cents integer,
  amount_used numeric(12, 4),
  allocated_cost_cents integer not null default 0,
  manual_cost_override_cents integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (purchase_quantity is null or purchase_quantity > 0),
  check (amount_used is null or amount_used >= 0),
  check (purchase_cost_cents is null or purchase_cost_cents >= 0),
  check (allocated_cost_cents >= 0),
  check (manual_cost_override_cents is null or manual_cost_override_cents >= 0)
);

create table if not exists public.artwork_labor_entries (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  task text not null,
  entry_date date not null default current_date,
  hours numeric(10, 2) not null,
  hourly_value_cents integer not null,
  labor_total_cents integer not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (hours > 0),
  check (hourly_value_cents >= 0),
  check (labor_total_cents >= 0)
);

create table if not exists public.artwork_pricing_scenarios (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  scenario_name text not null,
  listed_price_cents integer not null default 0,
  commission_percent numeric(6, 3) not null default 0,
  platform_fee_percent numeric(6, 3) not null default 0,
  fixed_fee_cents integer not null default 0,
  discount_percent numeric(6, 3) not null default 0,
  discount_cents integer not null default 0,
  shipping_absorbed_cents integer not null default 0,
  other_deductions_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (listed_price_cents >= 0),
  check (commission_percent between 0 and 100),
  check (platform_fee_percent between 0 and 100),
  check (discount_percent between 0 and 100),
  check (fixed_fee_cents >= 0 and discount_cents >= 0 and shipping_absorbed_cents >= 0 and other_deductions_cents >= 0)
);

create table if not exists public.artwork_price_history (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artworks(id) on delete cascade,
  price_cents integer not null,
  price_type text not null,
  effective_date date not null default current_date,
  end_date date,
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  check (price_cents >= 0),
  check (end_date is null or end_date >= effective_date)
);

create index if not exists artwork_cost_categories_artwork_idx on public.artwork_cost_categories(artwork_id, sort_order);
create index if not exists artwork_cost_entries_artwork_idx on public.artwork_cost_entries(artwork_id, entry_date desc);
create index if not exists artwork_labor_entries_artwork_idx on public.artwork_labor_entries(artwork_id, entry_date desc);
create index if not exists artwork_pricing_scenarios_artwork_idx on public.artwork_pricing_scenarios(artwork_id);
create index if not exists artwork_price_history_artwork_idx on public.artwork_price_history(artwork_id, effective_date desc);

drop trigger if exists set_artwork_cost_categories_updated_at on public.artwork_cost_categories;
create trigger set_artwork_cost_categories_updated_at before update on public.artwork_cost_categories
for each row execute function public.set_updated_at();
drop trigger if exists set_artwork_cost_entries_updated_at on public.artwork_cost_entries;
create trigger set_artwork_cost_entries_updated_at before update on public.artwork_cost_entries
for each row execute function public.set_updated_at();
drop trigger if exists set_artwork_labor_entries_updated_at on public.artwork_labor_entries;
create trigger set_artwork_labor_entries_updated_at before update on public.artwork_labor_entries
for each row execute function public.set_updated_at();
drop trigger if exists set_artwork_pricing_scenarios_updated_at on public.artwork_pricing_scenarios;
create trigger set_artwork_pricing_scenarios_updated_at before update on public.artwork_pricing_scenarios
for each row execute function public.set_updated_at();

create or replace function public.calculate_artwork_cost_allocation()
returns trigger
language plpgsql
as $$
begin
  if new.manual_cost_override_cents is not null then
    new.allocated_cost_cents := new.manual_cost_override_cents;
  elsif new.purchase_cost_cents is not null
    and new.purchase_quantity is not null
    and new.purchase_quantity > 0
    and new.amount_used is not null then
    new.allocated_cost_cents := round(new.purchase_cost_cents * (new.amount_used / new.purchase_quantity));
  end if;
  return new;
end;
$$;

drop trigger if exists calculate_artwork_cost_allocation on public.artwork_cost_entries;
create trigger calculate_artwork_cost_allocation
before insert or update on public.artwork_cost_entries
for each row execute function public.calculate_artwork_cost_allocation();

create or replace function public.calculate_artwork_labor_total()
returns trigger
language plpgsql
as $$
begin
  new.labor_total_cents := round(new.hours * new.hourly_value_cents);
  return new;
end;
$$;

drop trigger if exists calculate_artwork_labor_total on public.artwork_labor_entries;
create trigger calculate_artwork_labor_total
before insert or update on public.artwork_labor_entries
for each row execute function public.calculate_artwork_labor_total();

alter table public.artwork_cost_categories enable row level security;
alter table public.artwork_cost_entries enable row level security;
alter table public.artwork_labor_entries enable row level security;
alter table public.artwork_pricing_scenarios enable row level security;
alter table public.artwork_price_history enable row level security;

drop policy if exists "Owners can manage artwork cost categories" on public.artwork_cost_categories;
create policy "Owners can manage artwork cost categories" on public.artwork_cost_categories
for all to authenticated
using (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)))
with check (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)));

drop policy if exists "Owners can manage artwork cost entries" on public.artwork_cost_entries;
create policy "Owners can manage artwork cost entries" on public.artwork_cost_entries
for all to authenticated
using (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)))
with check (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)));

drop policy if exists "Owners can manage artwork labor entries" on public.artwork_labor_entries;
create policy "Owners can manage artwork labor entries" on public.artwork_labor_entries
for all to authenticated
using (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)))
with check (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)));

drop policy if exists "Owners can manage artwork pricing scenarios" on public.artwork_pricing_scenarios;
create policy "Owners can manage artwork pricing scenarios" on public.artwork_pricing_scenarios
for all to authenticated
using (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)))
with check (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)));

drop policy if exists "Owners can manage artwork price history" on public.artwork_price_history;
create policy "Owners can manage artwork price history" on public.artwork_price_history
for all to authenticated
using (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)))
with check (exists (select 1 from public.artworks a where a.id = artwork_id and (a.owner_id = auth.uid() or a.owner_id is null)));

drop policy if exists "Authenticated users can manage artworks" on public.artworks;
create policy "Owners can manage artworks" on public.artworks for all to authenticated
using (owner_id = auth.uid() or owner_id is null)
with check (owner_id = auth.uid());

create or replace function public.record_artwork_studio_activity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  activity_kind text;
  activity_title text;
  activity_description text;
begin
  if tg_op = 'INSERT' then
    activity_kind := 'artwork_created';
    activity_title := 'Artwork created';
    activity_description := 'Created the permanent studio record.';
  elsif old.production_status is distinct from new.production_status then
    activity_kind := case when new.production_status = 'complete' then 'artwork_completed' else 'artwork_status_changed' end;
    activity_title := case when new.production_status = 'complete' then 'Artwork completed' else 'Artwork status changed' end;
    activity_description := 'Production status is now ' || initcap(replace(new.production_status, '_', ' ')) || '.';
  elsif old.availability is distinct from new.availability then
    activity_kind := case when new.availability = 'sold' then 'artwork_sold' else 'artwork_availability_changed' end;
    activity_title := case
      when new.availability = 'sold' then 'Artwork sold'
      when new.availability = 'available' then 'Artwork marked available'
      else 'Artwork availability changed'
    end;
    activity_description := 'Availability is now ' || initcap(replace(new.availability, '_', ' ')) || '.';
  else
    return new;
  end if;

  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, thumbnail_asset_id, created_by, metadata
  ) values (
    activity_kind, activity_title, activity_description, 'artwork', new.id, new.title,
    '/studio/artwork/entry?id=' || new.id::text, new.primary_image_id, coalesce(new.owner_id, auth.uid()),
    jsonb_build_object('production_status', new.production_status, 'availability', new.availability)
  );
  return new;
end;
$$;

drop trigger if exists record_artwork_studio_activity on public.artworks;
create trigger record_artwork_studio_activity after insert or update on public.artworks
for each row execute function public.record_artwork_studio_activity();

create or replace function public.record_artwork_cost_activity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare artwork_title text; actor_id uuid;
begin
  select title, owner_id into artwork_title, actor_id from public.artworks where id = new.artwork_id;
  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, created_by, metadata
  ) values (
    'artwork_cost_added', 'Cost added', 'Added ' || new.item_name || '.',
    'artwork', new.artwork_id, artwork_title, '/studio/artwork/entry?id=' || new.artwork_id::text,
    coalesce(actor_id, auth.uid()), jsonb_build_object('allocated_cost_cents', new.allocated_cost_cents)
  );
  return new;
end;
$$;

drop trigger if exists record_artwork_cost_activity on public.artwork_cost_entries;
create trigger record_artwork_cost_activity after insert on public.artwork_cost_entries
for each row execute function public.record_artwork_cost_activity();

create or replace function public.record_artwork_price_activity()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare artwork_title text; actor_id uuid;
begin
  select title, owner_id into artwork_title, actor_id from public.artworks where id = new.artwork_id;
  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, created_by, metadata
  ) values (
    'artwork_price_changed', 'Artwork price recorded', 'Recorded a new ' || new.price_type || ' price.',
    'artwork', new.artwork_id, artwork_title, '/studio/artwork/entry?id=' || new.artwork_id::text,
    coalesce(actor_id, auth.uid()), jsonb_build_object('price_cents', new.price_cents, 'price_type', new.price_type)
  );
  return new;
end;
$$;

drop trigger if exists record_artwork_price_activity on public.artwork_price_history;
create trigger record_artwork_price_activity after insert on public.artwork_price_history
for each row execute function public.record_artwork_price_activity();
