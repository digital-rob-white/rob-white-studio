-- Rob White Studio — Artwork website publishing v0.1
-- Apply after the v0.1 security cleanup.
--
-- Public website content is deliberately separated from the private artworks
-- table. An artwork remains the source record, while this one-to-one record is
-- the explicit, reviewable public projection.

begin;

create table if not exists public.artwork_publications (
  artwork_id uuid primary key references public.artworks(id) on delete cascade,
  owner_id uuid not null references public.users(id) on delete cascade,
  publish_to_website boolean not null default false,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'ready_for_review', 'published', 'hidden', 'sold_archive')),
  publication_date date,
  published_at timestamptz,
  featured boolean not null default false,
  display_order integer not null default 0 check (display_order >= 0),
  slug text unique,
  public_title text,
  public_year integer check (public_year is null or public_year between 1000 and 9999),
  public_medium text,
  public_dimensions text,
  frame_presentation text,
  collection_name text,
  short_introduction text,
  artwork_story text,
  process_notes text,
  materials_story text,
  pull_quote text,
  related_context text,
  availability text not null default 'not_for_sale'
    check (availability in ('available', 'reserved', 'sold', 'not_for_sale', 'inquiry')),
  retail_price_cents integer check (retail_price_cents is null or retail_price_cents >= 0),
  purchase_status text,
  shipping_status text,
  local_pickup_available boolean not null default false,
  commerce_action text not null default 'none'
    check (commerce_action in ('purchase', 'inquire', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (
    publication_status <> 'published'
    or (publish_to_website and slug is not null and public_title is not null)
  )
);

create index if not exists artwork_publications_public_idx
  on public.artwork_publications(publication_status, publish_to_website, display_order);
create index if not exists artwork_publications_owner_idx
  on public.artwork_publications(owner_id);
create index if not exists artwork_publications_collection_idx
  on public.artwork_publications(collection_name, publication_status);
create index if not exists artwork_publications_availability_idx
  on public.artwork_publications(availability, publication_status);
create index if not exists artwork_publications_featured_idx
  on public.artwork_publications(featured, display_order)
  where featured = true;

create table if not exists public.artwork_public_media (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid not null references public.artwork_publications(artwork_id) on delete cascade,
  source_file_asset_id uuid not null references public.file_assets(id) on delete cascade,
  public_bucket text not null default 'public-artwork' check (public_bucket = 'public-artwork'),
  public_path text,
  display_role text not null default 'primary'
    check (display_role in ('primary', 'full_front', 'detail', 'side_profile', 'framed', 'installed', 'process', 'scale_reference', 'video', 'motion')),
  alt_text text,
  caption text,
  display_order integer not null default 0 check (display_order >= 0),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artwork_id, source_file_asset_id)
);

create index if not exists artwork_public_media_display_idx
  on public.artwork_public_media(artwork_id, hidden, display_order);
create index if not exists artwork_public_media_source_asset_idx
  on public.artwork_public_media(source_file_asset_id);

drop trigger if exists set_artwork_publications_updated_at on public.artwork_publications;
create trigger set_artwork_publications_updated_at
before update on public.artwork_publications
for each row execute function public.set_updated_at();

drop trigger if exists set_artwork_public_media_updated_at on public.artwork_public_media;
create trigger set_artwork_public_media_updated_at
before update on public.artwork_public_media
for each row execute function public.set_updated_at();

create or replace function public.prepare_artwork_publication()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publication_status = 'published' then
    new.publish_to_website := true;
    new.published_at := coalesce(new.published_at, now());
    new.publication_date := coalesce(new.publication_date, current_date);
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_artwork_publication() from public, anon, authenticated;

drop trigger if exists prepare_artwork_publication on public.artwork_publications;
create trigger prepare_artwork_publication
before insert or update on public.artwork_publications
for each row execute function public.prepare_artwork_publication();

alter table public.artwork_publications enable row level security;
alter table public.artwork_public_media enable row level security;

create policy "Anonymous users read published artwork pages"
on public.artwork_publications for select to anon
using (publish_to_website = true and publication_status = 'published');

create policy "Studio members manage their artwork publications"
on public.artwork_publications for all to authenticated
using (
  (select private.is_studio_member())
  and owner_id = (select auth.uid())
  and exists (
    select 1 from public.artworks a
    where a.id = artwork_publications.artwork_id
      and a.owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_studio_member())
  and owner_id = (select auth.uid())
  and exists (
    select 1 from public.artworks a
    where a.id = artwork_publications.artwork_id
      and a.owner_id = (select auth.uid())
  )
);

create policy "Anonymous users read published artwork media"
on public.artwork_public_media for select to anon
using (
  hidden = false
  and public_path is not null
  and exists (
    select 1 from public.artwork_publications p
    where p.artwork_id = artwork_public_media.artwork_id
      and p.publish_to_website = true
      and p.publication_status = 'published'
  )
);

create policy "Studio members manage their artwork public media"
on public.artwork_public_media for all to authenticated
using (
  (select private.is_studio_member())
  and exists (
    select 1 from public.artwork_publications p
    where p.artwork_id = artwork_public_media.artwork_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  (select private.is_studio_member())
  and exists (
    select 1 from public.artwork_publications p
    where p.artwork_id = artwork_public_media.artwork_id
      and p.owner_id = (select auth.uid())
  )
);

-- Retire the earlier direct artworks-table route. Publishing now occurs only
-- through the explicit projection above.
drop policy if exists "Anonymous users can read public artworks" on public.artworks;
revoke select on public.artworks from anon;
revoke select (
  id, title, slug, year, medium, dimensions, width, height, depth,
  framed_width, framed_height, framed_depth, dimension_unit,
  description_public, availability, archive_state, is_public,
  primary_image_id, materials_description, collection_name, artwork_type,
  frame_status, frame_description
) on public.artworks from anon;
revoke all on public.public_artworks from anon;

-- Explicit grants are required in addition to RLS. Anonymous users receive
-- only the public projection columns; private artwork data remains unreachable.
revoke all on public.artwork_publications from anon;
grant select (
  artwork_id, publish_to_website, publication_status, publication_date, published_at, featured,
  display_order, slug, public_title, public_year, public_medium,
  public_dimensions, frame_presentation, collection_name, short_introduction,
  artwork_story, process_notes, materials_story, pull_quote, related_context,
  availability, retail_price_cents, purchase_status, shipping_status,
  local_pickup_available, commerce_action
) on public.artwork_publications to anon;

revoke all on public.artwork_public_media from anon;
grant select (
  id, artwork_id, public_bucket, public_path, display_role, alt_text, caption,
  display_order, hidden
) on public.artwork_public_media to anon;

grant select, insert, update, delete on public.artwork_publications to authenticated;
grant select, insert, update, delete on public.artwork_public_media to authenticated;

create or replace view public.public_artwork_pages
with (security_invoker = true, security_barrier = true)
as
select
  artwork_id, publication_status, publication_date, published_at, featured,
  display_order, slug, public_title, public_year, public_medium,
  public_dimensions, frame_presentation, collection_name, short_introduction,
  artwork_story, process_notes, materials_story, pull_quote, related_context,
  availability, retail_price_cents, purchase_status, shipping_status,
  local_pickup_available, commerce_action
from public.artwork_publications
where publish_to_website = true and publication_status = 'published';

create or replace view public.public_artwork_media
with (security_invoker = true, security_barrier = true)
as
select
  id, artwork_id, public_bucket, public_path, display_role, alt_text, caption,
  display_order
from public.artwork_public_media
where hidden = false and public_path is not null;

revoke all on public.public_artwork_pages from public;
revoke all on public.public_artwork_media from public;
grant select on public.public_artwork_pages to anon, authenticated;
grant select on public.public_artwork_media to anon, authenticated;

create or replace function public.record_artwork_publication_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_kind text;
  activity_title text;
  activity_description text;
begin
  if tg_op = 'INSERT' and new.publication_status = 'ready_for_review' then
    activity_kind := 'artwork_website_ready';
    activity_title := 'Artwork ready for website review';
    activity_description := 'Prepared the public artwork page for review.';
  elsif tg_op = 'UPDATE' and old.publication_status is distinct from new.publication_status then
    case new.publication_status
      when 'ready_for_review' then
        activity_kind := 'artwork_website_ready';
        activity_title := 'Artwork ready for website review';
        activity_description := 'Prepared the public artwork page for review.';
      when 'published' then
        activity_kind := 'artwork_published';
        activity_title := 'Artwork published';
        activity_description := 'Published the artwork page to the website.';
      when 'hidden' then
        activity_kind := 'artwork_hidden';
        activity_title := 'Artwork hidden from website';
        activity_description := 'Removed the artwork page from public view.';
      when 'sold_archive' then
        activity_kind := 'artwork_sold_archive';
        activity_title := 'Artwork moved to sold archive';
        activity_description := 'Moved the public artwork page to the sold archive.';
      else
        return new;
    end case;
  else
    return new;
  end if;

  insert into public.studio_activities (
    activity_type, title, description, object_type, object_id, object_label,
    destination, created_by, metadata
  ) values (
    activity_kind,
    activity_title,
    activity_description,
    'artwork',
    new.artwork_id,
    coalesce(new.public_title, 'Artwork'),
    '/studio/artwork/website?id=' || new.artwork_id::text,
    new.owner_id,
    jsonb_build_object('publication_status', new.publication_status, 'slug', new.slug)
  );
  return new;
end;
$$;

revoke all on function public.record_artwork_publication_activity() from public, anon, authenticated;

drop trigger if exists record_artwork_publication_activity on public.artwork_publications;
create trigger record_artwork_publication_activity
after insert or update on public.artwork_publications
for each row execute function public.record_artwork_publication_activity();

commit;
