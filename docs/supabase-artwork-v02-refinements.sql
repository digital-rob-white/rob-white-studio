-- Rob White Studio Platform — Artwork v0.2 refinements
-- Apply after docs/supabase-artwork-v01.sql.
-- This migration is additive and preserves existing artwork records.

alter table public.artworks
  add column if not exists target_price_cents integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artworks_target_price_nonnegative'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks
      add constraint artworks_target_price_nonnegative
      check (target_price_cents is null or target_price_cents >= 0);
  end if;
end $$;

alter table public.artwork_labor_entries
  add column if not exists duration_minutes integer;

update public.artwork_labor_entries
set duration_minutes = greatest(15, round(hours * 60 / 15.0)::integer * 15)
where duration_minutes is null;

alter table public.artwork_labor_entries
  alter column duration_minutes set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'artwork_labor_duration_quarter_hour'
      and conrelid = 'public.artwork_labor_entries'::regclass
  ) then
    alter table public.artwork_labor_entries
      add constraint artwork_labor_duration_quarter_hour
      check (duration_minutes > 0 and duration_minutes % 15 = 0);
  end if;
end $$;

create or replace function public.calculate_artwork_labor_total()
returns trigger
language plpgsql
as $$
begin
  new.duration_minutes := greatest(15, round(coalesce(new.duration_minutes, new.hours * 60) / 15.0) * 15);
  new.hours := new.duration_minutes / 60.0;
  new.labor_total_cents := round(new.hourly_value_cents * new.duration_minutes / 60.0);
  return new;
end;
$$;

alter table public.file_assets
  add column if not exists image_tag text,
  add column if not exists display_order integer not null default 0;

update public.file_assets
set image_tag = 'finished'
where artwork_id is not null and image_tag is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'file_assets_artwork_image_tag_check'
      and conrelid = 'public.file_assets'::regclass
  ) then
    alter table public.file_assets
      add constraint file_assets_artwork_image_tag_check
      check (
        image_tag is null
        or image_tag in ('primary', 'process', 'detail', 'finished', 'hardware', 'installation', 'framing', 'packaging', 'other')
      );
  end if;
end $$;

create index if not exists file_assets_artwork_display_idx
  on public.file_assets(artwork_id, display_order, created_at);
