-- RWS Artwork Catalogs v0.1
-- Run after supabase-artwork-v02-refinements.sql.

alter table public.artworks
  add column if not exists frame_status text not null default 'not_applicable'
    check (frame_status in ('framed', 'unframed', 'frame_optional', 'not_applicable')),
  add column if not exists frame_description text;

create table if not exists public.studio_business_settings (
  owner_id uuid primary key references public.users(id) on delete cascade,
  studio_name text not null default 'Rob White Studio',
  owner_name text,
  phone text,
  email text,
  website text,
  instagram text,
  business_address text,
  logo_asset_id uuid references public.file_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artwork_catalogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete restrict,
  internal_name text not null,
  public_title text not null,
  subtitle text,
  recipient_name text,
  intro_text text,
  display_date date,
  notes_private text,
  layout_preset text not null default 'compact_grid'
    check (layout_preset in ('compact_grid', 'large_image_grid')),
  pricing_mode text not null default 'snapshot'
    check (pricing_mode in ('snapshot', 'live')),
  show_header boolean not null default true,
  duplicated_from_catalog_id uuid references public.artwork_catalogs(id) on delete set null,
  latest_export_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artwork_catalog_items (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.artwork_catalogs(id) on delete cascade,
  artwork_id uuid not null references public.artworks(id) on delete restrict,
  display_order integer not null default 0,
  selected_image_id uuid references public.file_assets(id) on delete set null,
  title_override text,
  year_override integer,
  materials_override text,
  dimensions_override text,
  frame_status_override text
    check (frame_status_override is null or frame_status_override in ('framed', 'unframed', 'frame_optional', 'not_applicable')),
  frame_description_override text,
  price_source text not null default 'current_retail'
    check (price_source in ('current_retail', 'projected_retail', 'gallery_retail', 'trade', 'custom', 'price_on_request', 'hidden')),
  pricing_mode text not null default 'snapshot'
    check (pricing_mode in ('snapshot', 'live')),
  snapshot_price_cents integer check (snapshot_price_cents is null or snapshot_price_cents >= 0),
  custom_price_cents integer check (custom_price_cents is null or custom_price_cents >= 0),
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (catalog_id, artwork_id)
);

create index if not exists artwork_catalogs_owner_updated_idx
  on public.artwork_catalogs(owner_id, updated_at desc);
create index if not exists artwork_catalog_items_catalog_order_idx
  on public.artwork_catalog_items(catalog_id, display_order);
create index if not exists artwork_catalog_items_artwork_idx
  on public.artwork_catalog_items(artwork_id);

drop trigger if exists set_studio_business_settings_updated_at on public.studio_business_settings;
create trigger set_studio_business_settings_updated_at
before update on public.studio_business_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_artwork_catalogs_updated_at on public.artwork_catalogs;
create trigger set_artwork_catalogs_updated_at
before update on public.artwork_catalogs
for each row execute function public.set_updated_at();

drop trigger if exists set_artwork_catalog_items_updated_at on public.artwork_catalog_items;
create trigger set_artwork_catalog_items_updated_at
before update on public.artwork_catalog_items
for each row execute function public.set_updated_at();

alter table public.studio_business_settings enable row level security;
alter table public.artwork_catalogs enable row level security;
alter table public.artwork_catalog_items enable row level security;

drop policy if exists "Owners manage studio business settings" on public.studio_business_settings;
create policy "Owners manage studio business settings"
on public.studio_business_settings for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners manage artwork catalogs" on public.artwork_catalogs;
create policy "Owners manage artwork catalogs"
on public.artwork_catalogs for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Owners manage artwork catalog items" on public.artwork_catalog_items;
create policy "Owners manage artwork catalog items"
on public.artwork_catalog_items for all
using (
  exists (
    select 1 from public.artwork_catalogs c
    where c.id = catalog_id and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.artwork_catalogs c
    where c.id = catalog_id and c.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.artworks a
    where a.id = artwork_id and a.owner_id = auth.uid()
  )
);

create or replace function public.log_artwork_catalog_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.studio_activities (
      activity_type, title, description, object_type, object_id, object_label,
      destination, created_by, metadata
    ) values (
      case when new.duplicated_from_catalog_id is null then 'artwork_catalog_created' else 'artwork_catalog_duplicated' end,
      case when new.duplicated_from_catalog_id is null then 'Artwork catalog created' else 'Artwork catalog duplicated' end,
      case when new.duplicated_from_catalog_id is null then 'Created a new artwork catalog.' else 'Created a copy of an existing artwork catalog.' end,
      'artwork_catalog', new.id, new.internal_name,
      '/studio/artwork/catalogs/entry?id=' || new.id::text, new.owner_id,
      jsonb_build_object('catalog_name', new.internal_name, 'source_catalog_id', new.duplicated_from_catalog_id)
    );
  elsif new.latest_export_at is distinct from old.latest_export_at and new.latest_export_at is not null then
    insert into public.studio_activities (
      activity_type, title, description, object_type, object_id, object_label,
      destination, created_by, metadata
    ) values (
      'artwork_catalog_exported', 'Artwork catalog exported', 'Exported a landscape PDF.',
      'artwork_catalog', new.id, new.internal_name,
      '/studio/artwork/catalogs/preview?id=' || new.id::text, new.owner_id,
      jsonb_build_object('catalog_name', new.internal_name)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists log_artwork_catalog_activity on public.artwork_catalogs;
create trigger log_artwork_catalog_activity
after insert or update on public.artwork_catalogs
for each row execute function public.log_artwork_catalog_activity();

create or replace function public.log_artwork_catalog_item_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
  v_catalog_name text;
  v_artwork_title text;
begin
  select owner_id, internal_name into v_owner_id, v_catalog_name
  from public.artwork_catalogs where id = new.catalog_id;
  select title into v_artwork_title from public.artworks where id = new.artwork_id;
  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, created_by, metadata
  ) values (
    'artwork_added_to_catalog', 'Artwork added to catalog',
    'Added ' || coalesce(v_artwork_title, 'artwork') || ' to ' || coalesce(v_catalog_name, 'a catalog') || '.',
    'artwork_catalog', new.catalog_id, v_catalog_name,
    '/studio/artwork/catalogs/entry?id=' || new.catalog_id::text, v_owner_id,
    jsonb_build_object('catalog_name', v_catalog_name, 'artwork_id', new.artwork_id, 'artwork_title', v_artwork_title)
  );
  return new;
end;
$$;

drop trigger if exists log_artwork_catalog_item_activity on public.artwork_catalog_items;
create trigger log_artwork_catalog_item_activity
after insert on public.artwork_catalog_items
for each row execute function public.log_artwork_catalog_item_activity();
