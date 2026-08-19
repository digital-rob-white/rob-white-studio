-- Rob White Studio security cleanup v0.1
-- Apply after the schema and feature SQL files.

begin;

-- Prevent untrusted roles from shadowing objects used by privileged functions.
revoke create on schema public from public;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to authenticated;

-- Membership is provisioned by an administrator. Browser clients cannot add
-- themselves to public.users, so a valid Auth account alone is insufficient.
create or replace function private.is_studio_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.users as studio_user
      where studio_user.id = (select auth.uid())
    );
$$;

revoke all on function private.is_studio_member() from public;
revoke all on function private.is_studio_member() from anon;
revoke all on function private.is_studio_member() from authenticated;
grant execute on function private.is_studio_member() to authenticated;
grant execute on function private.is_studio_member() to service_role;

-- Trigger-only invoker functions need no Data API execution permission.
alter function public.set_updated_at() set search_path = '';
alter function public.calculate_artwork_cost_allocation() set search_path = '';
alter function public.calculate_artwork_labor_total() set search_path = '';

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.calculate_artwork_cost_allocation() from public, anon, authenticated;
revoke all on function public.calculate_artwork_labor_total() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.calculate_artwork_cost_allocation() to service_role;
grant execute on function public.calculate_artwork_labor_total() to service_role;

-- These functions maintain the protected activity feed across RLS boundaries,
-- so SECURITY DEFINER is intentional. They are callable only as triggers.
alter function public.record_artwork_cost_activity() set search_path = '';
alter function public.record_artwork_price_activity() set search_path = '';
alter function public.record_artwork_studio_activity() set search_path = '';
alter function public.record_journal_photo_activity() set search_path = '';
alter function public.record_journal_studio_activity() set search_path = '';
alter function public.remove_deleted_object_activity() set search_path = '';

revoke all on function public.record_artwork_cost_activity() from public, anon, authenticated;
revoke all on function public.record_artwork_price_activity() from public, anon, authenticated;
revoke all on function public.record_artwork_studio_activity() from public, anon, authenticated;
revoke all on function public.record_journal_photo_activity() from public, anon, authenticated;
revoke all on function public.record_journal_studio_activity() from public, anon, authenticated;
revoke all on function public.remove_deleted_object_activity() from public, anon, authenticated;
grant execute on function public.record_artwork_cost_activity() to service_role;
grant execute on function public.record_artwork_price_activity() to service_role;
grant execute on function public.record_artwork_studio_activity() to service_role;
grant execute on function public.record_journal_photo_activity() to service_role;
grant execute on function public.record_journal_studio_activity() to service_role;
grant execute on function public.remove_deleted_object_activity() to service_role;

-- Existing catalog activity functions already had API execution revoked. Fix
-- their search paths as defense in depth as well.
alter function public.log_artwork_catalog_activity() set search_path = '';
alter function public.log_artwork_catalog_item_activity() set search_path = '';

-- Remove broad private-data policies.
drop policy if exists "Authenticated users can read users" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Authenticated users can manage contacts" on public.contacts;
drop policy if exists "Authenticated users can manage projects" on public.projects;
drop policy if exists "Authenticated users can manage project contacts" on public.project_contacts;
drop policy if exists "Authenticated users can manage journal entries" on public.journal_entries;
drop policy if exists "Authenticated users can manage services" on public.services;
drop policy if exists "Authenticated users can manage materials" on public.materials;
drop policy if exists "Authenticated users can manage estimates" on public.estimates;
drop policy if exists "Authenticated users can manage estimate line items" on public.estimate_line_items;
drop policy if exists "Authenticated users can manage file assets" on public.file_assets;
drop policy if exists "Authenticated users can manage file links" on public.file_links;
drop policy if exists "Authenticated users can manage tasks" on public.tasks;
drop policy if exists "Owners can manage artworks" on public.artworks;
drop policy if exists "Owners can manage artwork cost categories" on public.artwork_cost_categories;
drop policy if exists "Owners can manage artwork cost entries" on public.artwork_cost_entries;
drop policy if exists "Owners can manage artwork labor entries" on public.artwork_labor_entries;
drop policy if exists "Owners can manage artwork pricing scenarios" on public.artwork_pricing_scenarios;
drop policy if exists "Owners can manage artwork price history" on public.artwork_price_history;
drop policy if exists "Owners manage studio business settings" on public.studio_business_settings;
drop policy if exists "Owners manage artwork catalogs" on public.artwork_catalogs;
drop policy if exists "Owners manage artwork catalog items" on public.artwork_catalog_items;
drop policy if exists "Users can read their own Studio activity" on public.studio_activities;

-- Anonymous visitors may read public rows only. Authenticated Studio access is
-- granted independently below, after membership has been verified.
drop policy if exists "Anyone can read public artworks" on public.artworks;
create policy "Anonymous users can read public artworks"
on public.artworks for select to anon
using (is_public = true and archive_state = 'active');

drop policy if exists "Anyone can read published public journal entries" on public.journal_entries;
create policy "Anonymous users can read published public journal entries"
on public.journal_entries for select to anon
using (visibility = 'public' and status = 'published');

drop policy if exists "Anyone can read public file assets" on public.file_assets;
create policy "Anonymous users can read public file assets"
on public.file_assets for select to anon
using (visibility = 'public');

create policy "Studio members can read profiles"
on public.users for select to authenticated
using ((select private.is_studio_member()));

create policy "Studio members can update their own profile"
on public.users for update to authenticated
using ((select private.is_studio_member()) and id = (select auth.uid()))
with check ((select private.is_studio_member()) and id = (select auth.uid()));

create policy "Studio members manage contacts"
on public.contacts for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage projects"
on public.projects for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage project contacts"
on public.project_contacts for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage journal entries"
on public.journal_entries for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage services"
on public.services for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage materials"
on public.materials for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage estimates"
on public.estimates for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage estimate line items"
on public.estimate_line_items for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage file assets"
on public.file_assets for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage file links"
on public.file_links for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage tasks"
on public.tasks for all to authenticated
using ((select private.is_studio_member()))
with check ((select private.is_studio_member()));

create policy "Studio members manage their artworks"
on public.artworks for all to authenticated
using ((select private.is_studio_member()) and owner_id = (select auth.uid()))
with check ((select private.is_studio_member()) and owner_id = (select auth.uid()));

create policy "Studio members manage their artwork cost categories"
on public.artwork_cost_categories for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_cost_categories.artwork_id and a.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_cost_categories.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members manage their artwork cost entries"
on public.artwork_cost_entries for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_cost_entries.artwork_id and a.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_cost_entries.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members manage their artwork labor entries"
on public.artwork_labor_entries for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_labor_entries.artwork_id and a.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_labor_entries.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members manage their artwork pricing scenarios"
on public.artwork_pricing_scenarios for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_pricing_scenarios.artwork_id and a.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_pricing_scenarios.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members manage their artwork price history"
on public.artwork_price_history for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_price_history.artwork_id and a.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artworks a
  where a.id = artwork_price_history.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members manage their business settings"
on public.studio_business_settings for all to authenticated
using ((select private.is_studio_member()) and owner_id = (select auth.uid()))
with check ((select private.is_studio_member()) and owner_id = (select auth.uid()));

create policy "Studio members manage their artwork catalogs"
on public.artwork_catalogs for all to authenticated
using ((select private.is_studio_member()) and owner_id = (select auth.uid()))
with check ((select private.is_studio_member()) and owner_id = (select auth.uid()));

create policy "Studio members manage their artwork catalog items"
on public.artwork_catalog_items for all to authenticated
using ((select private.is_studio_member()) and exists (
  select 1 from public.artwork_catalogs c
  where c.id = artwork_catalog_items.catalog_id and c.owner_id = (select auth.uid())
))
with check ((select private.is_studio_member()) and exists (
  select 1 from public.artwork_catalogs c
  where c.id = artwork_catalog_items.catalog_id and c.owner_id = (select auth.uid())
) and exists (
  select 1 from public.artworks a
  where a.id = artwork_catalog_items.artwork_id and a.owner_id = (select auth.uid())
));

create policy "Studio members read their activity"
on public.studio_activities for select to authenticated
using ((select private.is_studio_member()) and created_by = (select auth.uid()));

-- Anonymous users need only read access to deliberately public fields.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

grant select (
  id, title, slug, year, medium, dimensions, width, height, depth,
  framed_width, framed_height, framed_depth, dimension_unit,
  description_public, availability, archive_state, is_public,
  primary_image_id, materials_description, collection_name, artwork_type,
  frame_status, frame_description
) on public.artworks to anon;

grant select (
  id, title, slug, visibility, category, status, excerpt, body,
  published_at, created_at, updated_at, entry_type, tags, materials_list,
  location
) on public.journal_entries to anon;

grant select (
  id, bucket, path, file_name, mime_type, file_size, alt_text, caption,
  visibility, artwork_id, journal_entry_id, created_at, image_tag,
  display_order
) on public.file_assets to anon;

create or replace view public.public_artworks
with (security_invoker = true, security_barrier = true)
as
select
  id, title, slug, year, medium, dimensions, width, height, depth,
  framed_width, framed_height, framed_depth, dimension_unit,
  description_public, availability, primary_image_id, materials_description,
  collection_name, artwork_type, frame_status, frame_description
from public.artworks
where is_public = true and archive_state = 'active';

create or replace view public.public_journal_entries
with (security_invoker = true, security_barrier = true)
as
select
  id, title, slug, category, excerpt, body, published_at, created_at,
  updated_at, entry_type, tags, materials_list, location
from public.journal_entries
where visibility = 'public' and status = 'published';

create or replace view public.public_file_assets
with (security_invoker = true, security_barrier = true)
as
select
  id, bucket, path, file_name, mime_type, file_size, alt_text, caption,
  artwork_id, journal_entry_id, created_at, image_tag, display_order
from public.file_assets
where visibility = 'public';

revoke all on public.public_artworks from public;
revoke all on public.public_journal_entries from public;
revoke all on public.public_file_assets from public;
grant select on public.public_artworks to anon, authenticated;
grant select on public.public_journal_entries to anon, authenticated;
grant select on public.public_file_assets to anon, authenticated;

-- Storage writes require an authenticated, pre-provisioned Studio member.
drop policy if exists "Anyone can read public artwork storage" on storage.objects;
drop policy if exists "Authenticated users can manage public artwork storage" on storage.objects;
drop policy if exists "Authenticated users can manage private studio storage" on storage.objects;
drop policy if exists "Authenticated users can manage estimate PDF storage" on storage.objects;

create policy "Anonymous users can read public artwork storage"
on storage.objects for select to anon
using (bucket_id = 'public-artwork');

create policy "Studio members manage public artwork storage"
on storage.objects for all to authenticated
using ((select private.is_studio_member()) and bucket_id = 'public-artwork')
with check ((select private.is_studio_member()) and bucket_id = 'public-artwork');

create policy "Studio members manage private studio storage"
on storage.objects for all to authenticated
using ((select private.is_studio_member()) and bucket_id = 'studio-private')
with check ((select private.is_studio_member()) and bucket_id = 'studio-private');

create policy "Studio members manage estimate PDF storage"
on storage.objects for all to authenticated
using ((select private.is_studio_member()) and bucket_id = 'estimate-pdfs')
with check ((select private.is_studio_member()) and bucket_id = 'estimate-pdfs');

commit;
