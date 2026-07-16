-- Rob White Studio Platform - Supabase Schema Draft
-- Version: v0.4 architecture foundation
-- Date: 2026-07-16
--
-- Purpose:
-- This file defines the first backend schema draft for the private Studio app.
-- It is intended to be reviewed, then run in Supabase SQL Editor or converted
-- into a Supabase migration.
--
-- Important:
-- - This repo is not yet connected to Supabase by code.
-- - Do not commit service role keys, database passwords, or private tokens.
-- - Row-level security is enabled below, but policies should be reviewed
--   before production use.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Updated-at helper
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.user_role as enum ('owner', 'admin', 'assistant', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.contact_type as enum ('client', 'vendor', 'gallery', 'collaborator', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_status as enum ('lead', 'estimating', 'approved', 'in_progress', 'waiting', 'complete', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_type as enum ('painting', 'sculpture', 'framing', 'printing', 'cnc', 'specialty', 'internal');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_contact_role as enum ('client', 'billing_contact', 'collaborator', 'vendor', 'recipient', 'installer', 'gallery', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.production_status as enum ('planned', 'in_progress', 'complete', 'on_hold');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.availability_status as enum ('available', 'reserved', 'sold', 'not_for_sale');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.archive_state as enum ('active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.journal_visibility as enum ('public', 'internal', 'unlisted');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.publish_status as enum ('draft', 'published', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.journal_category as enum ('studio_notes', 'project_documentation', 'artwork_process', 'materials', 'business_development');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.estimate_status as enum ('draft', 'sent', 'approved', 'declined', 'expired', 'invoiced');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.service_category as enum ('painting', 'sculpture', 'framing', 'printing', 'cnc', 'labor', 'delivery', 'installation', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.material_category as enum ('wood', 'canvas', 'ink', 'substrate', 'hardware', 'finish', 'packing', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.pricing_unit as enum ('flat', 'hour', 'linear_inch', 'square_foot', 'piece');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.file_visibility as enum ('public', 'internal');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_status as enum ('todo', 'doing', 'blocked', 'done', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.task_priority as enum ('low', 'normal', 'high', 'urgent');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Users / profiles
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  type public.contact_type not null default 'client',
  first_name text,
  last_name text,
  company text,
  email text,
  phone text,
  website text,
  instagram text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create index if not exists contacts_type_idx on public.contacts(type);
create index if not exists contacts_email_idx on public.contacts(email);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_code text unique,
  contact_id uuid references public.contacts(id) on delete set null,
  status public.project_status not null default 'lead',
  project_type public.project_type not null default 'specialty',
  description_public text,
  notes_private text,
  start_date date,
  due_date date,
  completed_date date,
  budget numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create index if not exists projects_contact_id_idx on public.projects(contact_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_project_type_idx on public.projects(project_type);

-- Future-ready participant model. The app can start with projects.contact_id
-- while this table supports multiple contacts per project later.
create table if not exists public.project_contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  role public.project_contact_role not null default 'other',
  is_primary boolean not null default false,
  notes_private text,
  created_at timestamptz not null default now(),
  unique (project_id, contact_id, role)
);

create index if not exists project_contacts_project_id_idx on public.project_contacts(project_id);
create index if not exists project_contacts_contact_id_idx on public.project_contacts(contact_id);

-- ---------------------------------------------------------------------------
-- Artwork
-- ---------------------------------------------------------------------------

create table if not exists public.artworks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  year integer,
  medium text,
  dimensions text,
  width numeric(10, 2),
  height numeric(10, 2),
  depth numeric(10, 2),
  framed_width numeric(10, 2),
  framed_height numeric(10, 2),
  framed_depth numeric(10, 2),
  dimension_unit text not null default 'in',
  weight numeric(10, 2),
  weight_unit text not null default 'lb',
  description_public text,
  notes_private text,
  production_status public.production_status not null default 'planned',
  availability public.availability_status not null default 'not_for_sale',
  archive_state public.archive_state not null default 'active',
  is_public boolean not null default false,
  price numeric(12, 2),
  primary_image_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_artworks_updated_at on public.artworks;
create trigger set_artworks_updated_at
before update on public.artworks
for each row execute function public.set_updated_at();

create index if not exists artworks_slug_idx on public.artworks(slug);
create index if not exists artworks_is_public_idx on public.artworks(is_public);
create index if not exists artworks_availability_idx on public.artworks(availability);

-- ---------------------------------------------------------------------------
-- Journal entries
-- ---------------------------------------------------------------------------

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  visibility public.journal_visibility not null default 'internal',
  category public.journal_category not null default 'studio_notes',
  status public.publish_status not null default 'draft',
  excerpt text,
  body text,
  project_id uuid references public.projects(id) on delete set null,
  artwork_id uuid references public.artworks(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_journal_entries_updated_at on public.journal_entries;
create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create index if not exists journal_entries_slug_idx on public.journal_entries(slug);
create index if not exists journal_entries_visibility_status_idx on public.journal_entries(visibility, status);
create index if not exists journal_entries_category_idx on public.journal_entries(category);
create index if not exists journal_entries_project_id_idx on public.journal_entries(project_id);
create index if not exists journal_entries_artwork_id_idx on public.journal_entries(artwork_id);

-- ---------------------------------------------------------------------------
-- Services and materials
-- ---------------------------------------------------------------------------

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.service_category not null default 'other',
  description text,
  default_unit public.pricing_unit not null default 'flat',
  default_rate numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create index if not exists services_category_idx on public.services(category);
create index if not exists services_is_active_idx on public.services(is_active);
create unique index if not exists services_name_key on public.services(name);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.material_category not null default 'other',
  supplier text,
  sku text,
  unit text,
  unit_cost numeric(12, 2) not null default 0,
  markup_percent numeric(8, 2) not null default 0,
  notes_private text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_materials_updated_at on public.materials;
create trigger set_materials_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

create index if not exists materials_category_idx on public.materials(category);
create index if not exists materials_is_active_idx on public.materials(is_active);

-- ---------------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------------

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  estimate_number text not null unique,
  contact_id uuid references public.contacts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  status public.estimate_status not null default 'draft',
  issue_date date not null default current_date,
  expiration_date date,
  sales_tax_rate numeric(8, 4) not null default 0,
  deposit_percent numeric(8, 4) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  notes_public text,
  notes_private text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_estimates_updated_at on public.estimates;
create trigger set_estimates_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

create index if not exists estimates_contact_id_idx on public.estimates(contact_id);
create index if not exists estimates_project_id_idx on public.estimates(project_id);
create index if not exists estimates_status_idx on public.estimates(status);

create table if not exists public.estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(12, 4) not null default 1,
  unit public.pricing_unit not null default 'flat',
  rate numeric(12, 2) not null default 0,
  line_total numeric(12, 2) generated always as (round((quantity * rate)::numeric, 2)) stored,
  sort_order integer not null default 0,
  is_optional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_estimate_line_items_updated_at on public.estimate_line_items;
create trigger set_estimate_line_items_updated_at
before update on public.estimate_line_items
for each row execute function public.set_updated_at();

create index if not exists estimate_line_items_estimate_id_idx on public.estimate_line_items(estimate_id);
create index if not exists estimate_line_items_service_id_idx on public.estimate_line_items(service_id);

-- ---------------------------------------------------------------------------
-- File assets
-- ---------------------------------------------------------------------------

create table if not exists public.file_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint,
  alt_text text,
  caption text,
  visibility public.file_visibility not null default 'internal',
  project_id uuid references public.projects(id) on delete set null,
  artwork_id uuid references public.artworks(id) on delete set null,
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists file_assets_visibility_idx on public.file_assets(visibility);
create index if not exists file_assets_project_id_idx on public.file_assets(project_id);
create index if not exists file_assets_artwork_id_idx on public.file_assets(artwork_id);
create index if not exists file_assets_journal_entry_id_idx on public.file_assets(journal_entry_id);

-- Future-ready file relationship model. This can replace or supplement the
-- direct foreign keys on file_assets when files need many-to-many links.
create table if not exists public.file_links (
  id uuid primary key default gen_random_uuid(),
  file_asset_id uuid not null references public.file_assets(id) on delete cascade,
  record_type text not null,
  record_id uuid not null,
  relationship_type text,
  created_at timestamptz not null default now(),
  unique (file_asset_id, record_type, record_id, relationship_type)
);

create index if not exists file_links_file_asset_id_idx on public.file_links(file_asset_id);
create index if not exists file_links_record_idx on public.file_links(record_type, record_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'artworks_primary_image_id_fkey'
      and conrelid = 'public.artworks'::regclass
  ) then
    alter table public.artworks
      add constraint artworks_primary_image_id_fkey
      foreign key (primary_image_id) references public.file_assets(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id uuid references public.projects(id) on delete cascade,
  assigned_to uuid references public.users(id) on delete set null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'normal',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create index if not exists tasks_project_id_idx on public.tasks(project_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx on public.tasks(status);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('public-artwork', 'public-artwork', true),
  ('studio-private', 'studio-private', false),
  ('estimate-pdfs', 'estimate-pdfs', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.projects enable row level security;
alter table public.project_contacts enable row level security;
alter table public.artworks enable row level security;
alter table public.journal_entries enable row level security;
alter table public.services enable row level security;
alter table public.materials enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.file_assets enable row level security;
alter table public.file_links enable row level security;
alter table public.tasks enable row level security;

-- Authenticated studio users can manage studio tables.
-- Later, tighten these by role when assistant/viewer accounts are introduced.

drop policy if exists "Authenticated users can read users" on public.users;
create policy "Authenticated users can read users"
on public.users for select
to authenticated
using (true);

drop policy if exists "Users can insert their own profile" on public.users;
create policy "Users can insert their own profile"
on public.users for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.users;
create policy "Users can update their own profile"
on public.users for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Authenticated users can manage contacts" on public.contacts;
create policy "Authenticated users can manage contacts"
on public.contacts for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage projects" on public.projects;
create policy "Authenticated users can manage projects"
on public.projects for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage project contacts" on public.project_contacts;
create policy "Authenticated users can manage project contacts"
on public.project_contacts for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anyone can read public artworks" on public.artworks;
create policy "Anyone can read public artworks"
on public.artworks for select
to anon, authenticated
using (is_public = true and archive_state = 'active');

drop policy if exists "Authenticated users can manage artworks" on public.artworks;
create policy "Authenticated users can manage artworks"
on public.artworks for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anyone can read published public journal entries" on public.journal_entries;
create policy "Anyone can read published public journal entries"
on public.journal_entries for select
to anon, authenticated
using (visibility = 'public' and status = 'published');

drop policy if exists "Authenticated users can manage journal entries" on public.journal_entries;
create policy "Authenticated users can manage journal entries"
on public.journal_entries for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage services" on public.services;
create policy "Authenticated users can manage services"
on public.services for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage materials" on public.materials;
create policy "Authenticated users can manage materials"
on public.materials for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage estimates" on public.estimates;
create policy "Authenticated users can manage estimates"
on public.estimates for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage estimate line items" on public.estimate_line_items;
create policy "Authenticated users can manage estimate line items"
on public.estimate_line_items for all
to authenticated
using (true)
with check (true);

drop policy if exists "Anyone can read public file assets" on public.file_assets;
create policy "Anyone can read public file assets"
on public.file_assets for select
to anon, authenticated
using (visibility = 'public');

drop policy if exists "Authenticated users can manage file assets" on public.file_assets;
create policy "Authenticated users can manage file assets"
on public.file_assets for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage file links" on public.file_links;
create policy "Authenticated users can manage file links"
on public.file_links for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can manage tasks" on public.tasks;
create policy "Authenticated users can manage tasks"
on public.tasks for all
to authenticated
using (true)
with check (true);

-- Storage policies.
-- Note: storage.objects policies can be refined after actual upload flows exist.

drop policy if exists "Anyone can read public artwork storage" on storage.objects;
create policy "Anyone can read public artwork storage"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'public-artwork');

drop policy if exists "Authenticated users can manage public artwork storage" on storage.objects;
create policy "Authenticated users can manage public artwork storage"
on storage.objects for all
to authenticated
using (bucket_id = 'public-artwork')
with check (bucket_id = 'public-artwork');

drop policy if exists "Authenticated users can manage private studio storage" on storage.objects;
create policy "Authenticated users can manage private studio storage"
on storage.objects for all
to authenticated
using (bucket_id = 'studio-private')
with check (bucket_id = 'studio-private');

drop policy if exists "Authenticated users can manage estimate PDF storage" on storage.objects;
create policy "Authenticated users can manage estimate PDF storage"
on storage.objects for all
to authenticated
using (bucket_id = 'estimate-pdfs')
with check (bucket_id = 'estimate-pdfs');

-- ---------------------------------------------------------------------------
-- Starter service rows
-- ---------------------------------------------------------------------------

insert into public.services (name, category, description, default_unit, default_rate)
values
  ('Original painting', 'painting', 'Original artwork or commissioned painting work.', 'flat', 0),
  ('Sculpture / object work', 'sculpture', 'Dimensional object, sculpture, or specialty build work.', 'flat', 0),
  ('Custom hardwood framing', 'framing', 'Handcrafted frame, finishing, and artwork presentation.', 'linear_inch', 0),
  ('Roland VG-540 printing', 'printing', 'Large-format print production.', 'square_foot', 0),
  ('CNC fabrication', 'cnc', 'Routing, cutting, prototyping, jigs, and precision components.', 'hour', 0),
  ('Studio labor', 'labor', 'General design, fabrication, finishing, or installation labor.', 'hour', 0),
  ('Delivery', 'delivery', 'Delivery or transport.', 'flat', 0),
  ('Installation', 'installation', 'On-site installation or placement.', 'hour', 0)
on conflict (name) do update
set
  category = excluded.category,
  description = excluded.description,
  default_unit = excluded.default_unit,
  updated_at = now();
