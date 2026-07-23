-- Rob White Studio Journal v0.1
-- Apply docs/supabase-schema.sql first for a new Supabase project.
-- This migration is safe to run against the existing architecture draft.

alter table public.journal_entries
  add column if not exists entry_type text not null default 'note',
  add column if not exists tags text[] not null default '{}',
  add column if not exists materials_list text[] not null default '{}',
  add column if not exists location text,
  add column if not exists follow_up_needed boolean not null default false,
  add column if not exists follow_up_completed_at timestamptz,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists project_reference text,
  add column if not exists artwork_reference text,
  add column if not exists client_id uuid references public.contacts(id) on delete set null,
  add column if not exists client_reference text,
  add column if not exists collector_id uuid references public.contacts(id) on delete set null,
  add column if not exists collector_reference text;

update public.journal_entries set body = '' where body is null;
alter table public.journal_entries alter column body set default '';
alter table public.journal_entries alter column body set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'journal_entries_entry_type_check'
      and conrelid = 'public.journal_entries'::regclass
  ) then
    alter table public.journal_entries
      add constraint journal_entries_entry_type_check
      check (entry_type in ('note', 'idea', 'process', 'material', 'decision', 'problem', 'lesson', 'pricing', 'client_feedback'));
  end if;
end $$;

create index if not exists journal_entries_entry_type_idx on public.journal_entries(entry_type);
create index if not exists journal_entries_pinned_created_idx on public.journal_entries(is_pinned, created_at desc);
create index if not exists journal_entries_follow_up_idx on public.journal_entries(follow_up_needed) where follow_up_needed = true;
create index if not exists journal_entries_tags_idx on public.journal_entries using gin(tags);
create index if not exists journal_entries_materials_list_idx on public.journal_entries using gin(materials_list);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-private',
  'studio-private',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.journal_entries enable row level security;
alter table public.file_assets enable row level security;
alter table public.file_links enable row level security;

drop policy if exists "Authenticated users can manage journal entries" on public.journal_entries;
create policy "Authenticated users can manage journal entries"
on public.journal_entries for all to authenticated
using (true) with check (true);

drop policy if exists "Anyone can read published public journal entries" on public.journal_entries;
create policy "Anyone can read published public journal entries"
on public.journal_entries for select to anon, authenticated
using (visibility = 'public' and status = 'published');

drop policy if exists "Authenticated users can manage file assets" on public.file_assets;
create policy "Authenticated users can manage file assets"
on public.file_assets for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage file links" on public.file_links;
create policy "Authenticated users can manage file links"
on public.file_links for all to authenticated
using (true) with check (true);

drop policy if exists "Authenticated users can manage private studio storage" on storage.objects;
create policy "Authenticated users can manage private studio storage"
on storage.objects for all to authenticated
using (bucket_id = 'studio-private')
with check (bucket_id = 'studio-private');
